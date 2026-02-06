import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  PanResponder,
  LayoutChangeEvent,
  Animated,
  GestureResponderEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSettings } from "../context/SettingsContext";
import { useKnowledgeSelection } from "../context/KnowledgeSelectionContext";
import { useNodesData } from "../context/NodesDataContext";
import { AppBackground } from "../components/AppBackground";
import { isForYouNodeId, normalizeNodeKey } from "../config/knowledgeNodes";
import {
  createKnowledgeGraphStyles,
  MINI_MAP_SIZE,
  EDGE_HEIGHT,
} from "../styles/KnowledgeGraphScreenStyles";

export type Node = {
  id: string;
  label: string;
  x: number;
  y: number;
  size: number;
  tone: "primary" | "secondary" | "accent";
};

export type Edge = {
  from: string;
  to: string;
  strength: 1 | 2 | 3;
};

const GRAPH_SIZE = 1400;
const MIN_PAN_RANGE = 180;
const NODE_COLLISION_GAP = 18;
const NODE_LAYOUT_PADDING = 34;
const COLLISION_ITERATIONS = 80;
const RING_BASE_RADIUS = 210;
const RING_STEP = 180;
const MIN_ARC_SPACING = 120;

export type KnowledgeGraphData = {
  nodes: Node[];
  edges: Edge[];
};

type LayoutNode = Node & {
  layoutDepth: number;
  layoutAngle: number;
  isHub: boolean;
};

const normalizeEdgeNodeKey = (value: string) => normalizeNodeKey(value);

const getNode = (nodes: Node[], id: string) => {
  const key = normalizeNodeKey(id);
  return nodes.find((node) => normalizeNodeKey(node.id) === key);
};

const computeHubAndRingLayout = (
  nodes: Node[],
  edges: Edge[],
): LayoutNode[] => {
  if (!nodes.length) {
    return [];
  }

  const nodesByKey = new Map<string, Node>();
  for (const node of nodes) {
    nodesByKey.set(normalizeNodeKey(node.id), node);
  }

  const adjacency = new Map<string, Set<string>>();
  for (const key of nodesByKey.keys()) {
    adjacency.set(key, new Set<string>());
  }

  for (const edge of edges) {
    const fromKey = normalizeEdgeNodeKey(edge.from);
    const toKey = normalizeEdgeNodeKey(edge.to);
    if (!nodesByKey.has(fromKey) || !nodesByKey.has(toKey)) continue;
    adjacency.get(fromKey)?.add(toKey);
    adjacency.get(toKey)?.add(fromKey);
  }

  const hubKey =
    Array.from(nodesByKey.keys()).find((key) => isForYouNodeId(key)) ??
    Array.from(nodesByKey.keys()).sort((a, b) => {
      const degreeA = adjacency.get(a)?.size ?? 0;
      const degreeB = adjacency.get(b)?.size ?? 0;
      return degreeB - degreeA;
    })[0];

  const depthByKey = new Map<string, number>();
  depthByKey.set(hubKey, 0);
  const queue: string[] = [hubKey];

  while (queue.length) {
    const current = queue.shift()!;
    const currentDepth = depthByKey.get(current) ?? 0;
    for (const neighbor of adjacency.get(current) ?? []) {
      if (depthByKey.has(neighbor)) continue;
      depthByKey.set(neighbor, currentDepth + 1);
      queue.push(neighbor);
    }
  }

  const assignedDepths = Array.from(depthByKey.values());
  const maxDepth = assignedDepths.length ? Math.max(...assignedDepths) : 0;
  let disconnectedDepth = Math.max(1, maxDepth + 1);
  for (const key of nodesByKey.keys()) {
    if (!depthByKey.has(key)) {
      depthByKey.set(key, disconnectedDepth);
      disconnectedDepth += 1;
    }
  }

  const grouped = new Map<number, LayoutNode[]>();

  const makeSizedNode = (node: Node, isHub: boolean): LayoutNode => ({
    ...node,
    size: isHub
      ? Math.max(node.size, 112)
      : Math.min(Math.max(node.size, 58), 84),
    layoutDepth: isHub ? 0 : 1,
    layoutAngle: 0,
    isHub,
  });

  for (const [key, node] of nodesByKey.entries()) {
    const isHub = key === hubKey;
    const depth = depthByKey.get(key) ?? 1;
    const nextNode = makeSizedNode(node, isHub);
    nextNode.layoutDepth = depth;
    if (!grouped.has(depth)) grouped.set(depth, []);
    grouped.get(depth)!.push(nextNode);
  }

  const layoutNodes: LayoutNode[] = [];
  const hubNode = grouped.get(0)?.[0];
  if (hubNode) {
    hubNode.x = 0;
    hubNode.y = 0;
    hubNode.layoutAngle = 0;
    layoutNodes.push(hubNode);
  }

  const depthLevels = Array.from(grouped.keys())
    .filter((depth) => depth > 0)
    .sort((a, b) => a - b);

  for (const depth of depthLevels) {
    const group = grouped.get(depth) ?? [];
    if (!group.length) continue;

    group.sort((a, b) => {
      const angleA = Math.atan2(a.y, a.x);
      const angleB = Math.atan2(b.y, b.x);
      return angleA - angleB;
    });

    const baseRadius = RING_BASE_RADIUS + (depth - 1) * RING_STEP;
    const minRadius = (group.length * MIN_ARC_SPACING) / (2 * Math.PI);
    const radius = Math.max(baseRadius, minRadius);
    const baseRotation = -Math.PI / 2 + depth * 0.3;

    for (let index = 0; index < group.length; index += 1) {
      const node = group[index];
      const angle = baseRotation + (index / group.length) * Math.PI * 2;
      node.layoutAngle = angle;
      node.x = Math.cos(angle) * radius;
      node.y = Math.sin(angle) * radius;
      layoutNodes.push(node);
    }
  }

  return layoutNodes;
};

const resolveNodeCollisions = (nodes: LayoutNode[]) => {
  if (nodes.length < 2) {
    return nodes;
  }

  const next = nodes.map((node) => ({ ...node }));

  const clampCenter = (value: number, size: number) => {
    const radius = size / 2;
    const limit = GRAPH_SIZE / 2 - NODE_LAYOUT_PADDING - radius;
    return Math.max(-limit, Math.min(limit, value));
  };

  for (let iteration = 0; iteration < COLLISION_ITERATIONS; iteration += 1) {
    let adjusted = false;

    for (let i = 0; i < next.length; i += 1) {
      for (let j = i + 1; j < next.length; j += 1) {
        const a = next[i];
        const b = next[j];
        const minDistance = a.size / 2 + b.size / 2 + NODE_COLLISION_GAP;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance >= minDistance) {
          continue;
        }

        adjusted = true;

        if (distance < 0.0001) {
          const angle = ((((i + 1) * 53 + (j + 1) * 97) % 360) * Math.PI) / 180;
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          distance = 1;
        }

        const overlap = minDistance - distance;
        const ux = dx / distance;
        const uy = dy / distance;
        const lockA = a.isHub || isForYouNodeId(a.id);
        const lockB = b.isHub || isForYouNodeId(b.id);

        if (lockA && !lockB) {
          b.x += ux * overlap;
          b.y += uy * overlap;
        } else if (!lockA && lockB) {
          a.x -= ux * overlap;
          a.y -= uy * overlap;
        } else {
          const shift = overlap / 2;
          a.x -= ux * shift;
          a.y -= uy * shift;
          b.x += ux * shift;
          b.y += uy * shift;
        }

        if (!lockA) {
          a.x = clampCenter(a.x, a.size);
          a.y = clampCenter(a.y, a.size);
        }
        if (!lockB) {
          b.x = clampCenter(b.x, b.size);
          b.y = clampCenter(b.y, b.size);
        }
      }
    }

    if (!adjusted) {
      break;
    }
  }

  return next;
};

type KnowledgeGraphScreenProps = {
  data?: KnowledgeGraphData;
  onNodePress?: (node: Node) => void;
  navigation?: {
    navigate?: (
      route: "Main",
      params?: { nodeId?: string; nodeLabel?: string },
    ) => void;
  };
  embedded?: boolean;
};

export function KnowledgeGraphScreen({
  data,
  onNodePress,
  navigation,
  embedded = false,
}: KnowledgeGraphScreenProps) {
  const { size, elasticity } = useSettings();
  const { setSelectedNode } = useKnowledgeSelection();
  const { data: nodesData, status: nodesStatus, isCleared } = useNodesData();
  const styles = useMemo(createKnowledgeGraphStyles, [size]);
  const resolvedData = data ?? nodesData;
  const nodes = resolvedData?.nodes ?? [];
  const edges = resolvedData?.edges ?? [];
  const layoutNodes = useMemo(
    () => resolveNodeCollisions(computeHubAndRingLayout(nodes, edges)),
    [edges, nodes],
  );
  const ringRadii = useMemo(() => {
    const byDepth = new Map<number, number>();
    for (const node of layoutNodes) {
      if (node.layoutDepth <= 0) continue;
      const distance = Math.sqrt(node.x * node.x + node.y * node.y);
      const current = byDepth.get(node.layoutDepth) ?? 0;
      if (distance > current) {
        byDepth.set(node.layoutDepth, distance);
      }
    }
    return Array.from(byDepth.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, radius]) => radius);
  }, [layoutNodes]);
  const hasNodes = layoutNodes.length > 0;
  const loadState: "loading" | "ready" | "error" | "cleared" = hasNodes
    ? "ready"
    : data
      ? "error"
      : nodesStatus === "loading" || nodesStatus === "idle"
        ? "loading"
        : isCleared
          ? "cleared"
          : "error";
  const translate = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const offsetRef = useRef({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0 });
  const gestureStart = useRef({ x: 0, y: 0 });
  const activeNode = useRef<Node | null>(null);
  const intro = useRef(new Animated.Value(0)).current;
  const [viewCenter, setViewCenter] = useState({ x: 0, y: 0 });
  const [viewSize, setViewSize] = useState({ width: 0, height: 0 });

  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));

  const softClamp = (
    value: number,
    min: number,
    max: number,
    amount: number,
  ) => {
    if (value < min) {
      return min + (value - min) * amount;
    }
    if (value > max) {
      return max + (value - max) * amount;
    }
    return value;
  };

  const elasticityValue = elasticity;

  const getBounds = () => {
    const maxOffsetX = Math.max(
      MIN_PAN_RANGE,
      (GRAPH_SIZE - viewSize.width) / 2,
    );
    const maxOffsetY = Math.max(
      MIN_PAN_RANGE,
      (GRAPH_SIZE - viewSize.height) / 2,
    );
    return {
      minX: -maxOffsetX,
      maxX: maxOffsetX,
      minY: -maxOffsetY,
      maxY: maxOffsetY,
    };
  };

  useEffect(() => {
    intro.setValue(0);
    Animated.timing(intro, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [intro]);

  useEffect(() => {
    const id = translate.addListener((value) => {
      offsetRef.current = { x: value.x, y: value.y };
      setOffset({ x: value.x, y: value.y });
    });
    return () => {
      translate.removeListener(id);
    };
  }, [translate]);

  const toGraphPoint = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    const originX = viewCenter.x - GRAPH_SIZE / 2 + offsetRef.current.x;
    const originY = viewCenter.y - GRAPH_SIZE / 2 + offsetRef.current.y;
    return { x: locationX - originX, y: locationY - originY };
  };

  const findNodeAtPoint = (point: { x: number; y: number }) =>
    layoutNodes.find((node) => {
      const centerX = GRAPH_SIZE / 2 + node.x;
      const centerY = GRAPH_SIZE / 2 + node.y;
      const radius = node.size / 2;
      const dx = point.x - centerX;
      const dy = point.y - centerY;
      return dx * dx + dy * dy <= radius * radius;
    });

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          const point = toGraphPoint(event);
          gestureStart.current = point;
          activeNode.current = findNodeAtPoint(point) ?? null;
          translate.stopAnimation((value) => {
            dragStart.current = { x: value.x, y: value.y };
          });
        },
        onPanResponderMove: (_, gesture) => {
          const { minX, maxX, minY, maxY } = getBounds();
          const nextX = dragStart.current.x + gesture.dx;
          const nextY = dragStart.current.y + gesture.dy;
          const clamped = {
            x: softClamp(nextX, minX, maxX, elasticityValue),
            y: softClamp(nextY, minY, maxY, elasticityValue),
          };
          translate.setValue(clamped);
        },
        onPanResponderRelease: (event, gesture) => {
          const point = toGraphPoint(event);
          const dx = point.x - gestureStart.current.x;
          const dy = point.y - gestureStart.current.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 8 && activeNode.current) {
            handleNodePress(activeNode.current);
          }
          activeNode.current = null;
          if (distance < 8) {
            return;
          }

          const { minX, maxX, minY, maxY } = getBounds();
          Animated.decay(translate, {
            velocity: {
              x: gesture.vx * 0.8,
              y: gesture.vy * 0.8,
            },
            deceleration: 0.995,
            useNativeDriver: false,
          }).start(() => {
            translate.stopAnimation((value) => {
              const target = {
                x: clamp(value.x, minX, maxX),
                y: clamp(value.y, minY, maxY),
              };
              Animated.spring(translate, {
                toValue: target,
                speed: 10,
                bounciness: 6,
                useNativeDriver: false,
              }).start();
            });
          });
        },
      }),
    [
      translate,
      viewCenter.x,
      viewCenter.y,
      viewSize.width,
      viewSize.height,
      elasticity,
      layoutNodes,
    ],
  );

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewCenter({ x: width / 2, y: height / 2 });
    setViewSize({ width, height });
  };

  const handleNodePress = (node: Node) => {
    setSelectedNode({ id: node.id, label: node.label });
    if (onNodePress) {
      onNodePress(node);
      return;
    }

    if (navigation?.navigate) {
      navigation.navigate("Main", {
        nodeId: node.id,
        nodeLabel: node.label,
      });
    }
  };

  const graphCanvas = (
    <>
      <Animated.View
        style={[
          styles.canvasShell,
          embedded ? styles.canvasShellEmbedded : null,
          {
            opacity: intro,
            transform: [
              {
                translateY: intro.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.canvas} onLayout={onLayout} pointerEvents="auto">
          <View
            style={styles.panOverlay}
            pointerEvents="box-only"
            {...panResponder.panHandlers}
          />
          {loadState !== "ready" ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>
                {loadState === "loading"
                  ? "Loading knowledge map..."
                  : loadState === "cleared"
                    ? "Map cleared."
                    : "Map unavailable"}
              </Text>
              <Text style={styles.emptyStateSubtitle}>
                {loadState === "loading"
                  ? "Fetching nodes from the server."
                  : loadState === "cleared"
                    ? "Sync Twitter to fetch new nodes."
                    : "We couldn't reach the server or there are no nodes yet."}
              </Text>
            </View>
          ) : null}
          <Animated.View
            style={[
              styles.graph,
              {
                width: GRAPH_SIZE,
                height: GRAPH_SIZE,
                left: viewCenter.x - GRAPH_SIZE / 2,
                top: viewCenter.y - GRAPH_SIZE / 2,
                transform: translate.getTranslateTransform(),
              },
            ]}
            pointerEvents="none"
          >
            <View style={styles.graphRings}>
              {ringRadii.map((radius, index) => (
                <View
                  key={`ring-${index}`}
                  style={[
                    styles.graphRing,
                    {
                      width: radius * 2,
                      height: radius * 2,
                      borderRadius: radius,
                      opacity: Math.max(0.14, 0.32 - index * 0.05),
                    },
                  ]}
                />
              ))}
              <View style={styles.graphHubAura} />
            </View>

            {edges.map((edge, index) => {
              const from = getNode(layoutNodes, edge.from);
              const to = getNode(layoutNodes, edge.to);
              if (!from || !to) return null;

              const x1 = GRAPH_SIZE / 2 + from.x;
              const y1 = GRAPH_SIZE / 2 + from.y;
              const x2 = GRAPH_SIZE / 2 + to.x;
              const y2 = GRAPH_SIZE / 2 + to.y;

              const dx = x2 - x1;
              const dy = y2 - y1;
              const length = Math.sqrt(dx * dx + dy * dy);
              if (length < 0.001) return null;
              const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
              const ux = dx / length;
              const uy = dy / length;
              const startInset = Math.max(0, from.size / 2 - 3);
              const endInset = Math.max(0, to.size / 2 - 4);
              const trimmedLength = Math.max(0, length - startInset - endInset);
              const sx = x1 + ux * startInset;
              const sy = y1 + uy * startInset;
              const ex = x2 - ux * endInset;
              const ey = y2 - uy * endInset;
              const midX = (sx + ex) / 2;
              const midY = (sy + ey) / 2;

              return (
                <React.Fragment key={`${edge.from}-${edge.to}-${index}`}>
                  <View
                    pointerEvents="none"
                    style={[
                      styles.edge,
                      styles[`edgeStrength${edge.strength}`],
                      {
                        width: trimmedLength,
                        left: midX - trimmedLength / 2,
                        top: midY - EDGE_HEIGHT / 2,
                        transform: [{ rotateZ: `${angle}deg` }],
                      },
                    ]}
                  />
                  <View
                    pointerEvents="none"
                    style={[
                      styles.edgeDot,
                      styles[`edgeDotStrength${edge.strength}`],
                      {
                        left: ex - 3,
                        top: ey - 3,
                      },
                    ]}
                  />
                </React.Fragment>
              );
            })}

            {layoutNodes.map((node) => (
              <View
                key={node.id}
                pointerEvents="none"
                style={[
                  styles.node,
                  styles[`node${node.tone}`],
                  node.isHub ? styles.nodeHub : null,
                  {
                    width: node.size,
                    height: node.size,
                    borderRadius: node.size / 2,
                    transform: [
                      { translateX: GRAPH_SIZE / 2 + node.x - node.size / 2 },
                      { translateY: GRAPH_SIZE / 2 + node.y - node.size / 2 },
                    ],
                  },
                ]}
              >
                {node.isHub ? <View style={styles.nodeHubRing} /> : null}
                <Text
                  numberOfLines={2}
                  style={[
                    styles.nodeLabel,
                    node.isHub ? styles.nodeLabelHub : null,
                  ]}
                >
                  {node.label}
                </Text>
              </View>
            ))}
          </Animated.View>
        </View>
      </Animated.View>

      {!embedded ? (
        <Animated.View
          style={[
            styles.miniMap,
            {
              opacity: intro,
              transform: [
                {
                  scale: intro.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.miniMapInner}>
            {edges.map((edge, index) => {
              const from = getNode(layoutNodes, edge.from);
              const to = getNode(layoutNodes, edge.to);
              if (!from || !to) return null;

              const x1 =
                ((from.x + GRAPH_SIZE / 2) / GRAPH_SIZE) * MINI_MAP_SIZE;
              const y1 =
                ((from.y + GRAPH_SIZE / 2) / GRAPH_SIZE) * MINI_MAP_SIZE;
              const x2 = ((to.x + GRAPH_SIZE / 2) / GRAPH_SIZE) * MINI_MAP_SIZE;
              const y2 = ((to.y + GRAPH_SIZE / 2) / GRAPH_SIZE) * MINI_MAP_SIZE;

              const dx = x2 - x1;
              const dy = y2 - y1;
              const length = Math.sqrt(dx * dx + dy * dy);
              const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;

              return (
                <View
                  key={`mini-${edge.from}-${edge.to}-${index}`}
                  style={[
                    styles.miniEdge,
                    styles[`miniEdgeStrength${edge.strength}`],
                    {
                      width: length,
                      left: midX - length / 2,
                      top: midY - 0.5,
                      transform: [{ rotateZ: `${angle}deg` }],
                    },
                  ]}
                />
              );
            })}
            {layoutNodes.map((node) => {
              const x =
                ((node.x + GRAPH_SIZE / 2) / GRAPH_SIZE) * MINI_MAP_SIZE;
              const y =
                ((node.y + GRAPH_SIZE / 2) / GRAPH_SIZE) * MINI_MAP_SIZE;
              return (
                <View
                  key={`mini-node-${node.id}`}
                  style={[
                    styles.miniNode,
                    {
                      transform: [{ translateX: x }, { translateY: y }],
                    },
                  ]}
                />
              );
            })}
            <View
              style={[
                styles.miniViewport,
                {
                  width: (viewSize.width / GRAPH_SIZE) * MINI_MAP_SIZE,
                  height: (viewSize.height / GRAPH_SIZE) * MINI_MAP_SIZE,
                  transform: [
                    {
                      translateX:
                        ((GRAPH_SIZE / 2 - offset.x - viewSize.width / 2) /
                          GRAPH_SIZE) *
                        MINI_MAP_SIZE,
                    },
                    {
                      translateY:
                        ((GRAPH_SIZE / 2 - offset.y - viewSize.height / 2) /
                          GRAPH_SIZE) *
                        MINI_MAP_SIZE,
                    },
                  ],
                },
              ]}
            />
          </View>
        </Animated.View>
      ) : null}
    </>
  );

  if (embedded) {
    return <View style={styles.embeddedContainer}>{graphCanvas}</View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppBackground />
      <Animated.View
        style={[
          styles.header,
          {
            opacity: intro,
            transform: [
              {
                translateY: intro.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-14, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>Live</Text>
          </View>
          <Text style={styles.title}>Slift</Text>
        </View>
        <Text style={styles.subtitle}>
          Drag to explore the map of strengths and relationships.
        </Text>
      </Animated.View>
      {graphCanvas}
    </SafeAreaView>
  );
}
