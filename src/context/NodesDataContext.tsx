import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ApiEdge,
  ApiNode,
  ApiPost,
  getNodesAndPosts,
  NodesAndPostsResponse,
} from "../api";
import {
  FOR_YOU_NODE_ID,
  FOR_YOU_NODE_LABEL,
  isForYouNodeId,
  normalizeNodeKey,
} from "../config/knowledgeNodes";

type NodesDataStatus = "idle" | "loading" | "ready" | "error";

type NodesDataValue = {
  data: NodesAndPostsResponse | null;
  status: NodesDataStatus;
  refreshNodes: (options?: {
    limit?: number;
  }) => Promise<NodesAndPostsResponse | null>;
  clearNodes: () => void;
  isCleared: boolean;
  lastUpdated: number | null;
};

const NodesDataContext = createContext<NodesDataValue | undefined>(undefined);

type NodesDataProviderProps = {
  children: React.ReactNode;
  initialData?: NodesAndPostsResponse;
  disableAutoLoad?: boolean;
};

const MAX_POSTS_PER_NODE = 30;

const normalizeTimestamp = (value?: string | number | null): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1_000_000_000_000 ? value * 1000 : value;
  }
  if (typeof value === "string") {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
    }
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const getPostTimestamp = (post: ApiPost) => normalizeTimestamp(post.timestamp);

const mergePosts = (
  previous?: ApiPost[] | null,
  incoming?: ApiPost[] | null,
) => {
  const prevPosts = previous ?? [];
  const nextPosts = incoming ?? [];
  if (!prevPosts.length && !nextPosts.length) return [];

  const merged = new Map<string, ApiPost>();
  const consider = (post: ApiPost) => {
    if (!post?.id) return;
    const existing = merged.get(post.id);
    if (!existing) {
      merged.set(post.id, post);
      return;
    }
    const existingTime = getPostTimestamp(existing);
    const nextTime = getPostTimestamp(post);
    const shouldReplace =
      (nextTime !== null && existingTime === null) ||
      (nextTime !== null && existingTime !== null && nextTime > existingTime);
    if (shouldReplace) {
      merged.set(post.id, post);
    }
  };

  nextPosts.forEach(consider);
  prevPosts.forEach(consider);

  const mergedPosts = Array.from(merged.values());
  const hasTimestamp = mergedPosts.some(
    (post) => getPostTimestamp(post) !== null,
  );

  if (hasTimestamp) {
    mergedPosts.sort((a, b) => {
      const aTime = getPostTimestamp(a);
      const bTime = getPostTimestamp(b);
      if (aTime === null && bTime === null) return 0;
      if (bTime === null) return -1;
      if (aTime === null) return 1;
      return bTime - aTime;
    });
  }

  return mergedPosts.slice(0, MAX_POSTS_PER_NODE);
};

const mergeNodes = (previous: ApiNode[], incoming: ApiNode[]) => {
  if (!previous.length && !incoming.length) return [];

  const mergedByKey = new Map<string, ApiNode>();
  const order: string[] = [];

  const upsert = (node: ApiNode) => {
    const key = normalizeNodeKey(node.id);
    const existing = mergedByKey.get(key);
    if (!existing) {
      order.push(key);
    }
    mergedByKey.set(key, {
      ...(existing ?? {}),
      ...node,
      id: key,
      label: node.label ?? existing?.label,
      posts: mergePosts(existing?.posts, node.posts),
    });
  };

  previous.forEach(upsert);
  incoming.forEach(upsert);

  return order
    .map((key) => mergedByKey.get(key))
    .filter((node): node is ApiNode => Boolean(node));
};

const mergeEdges = (previous: ApiEdge[], incoming: ApiEdge[]) => {
  const merged = new Map<string, ApiEdge>();
  const edgeKey = (edge: ApiEdge) => `${edge.from}|${edge.to}|${edge.strength}`;

  const normalizeEdge = (edge: ApiEdge) => ({
    ...edge,
    from: normalizeNodeKey(edge.from),
    to: normalizeNodeKey(edge.to),
  });

  for (const edge of incoming.map(normalizeEdge)) {
    merged.set(edgeKey(edge), edge);
  }
  for (const edge of previous.map(normalizeEdge)) {
    const key = edgeKey(edge);
    if (!merged.has(key)) {
      merged.set(key, edge);
    }
  }

  return Array.from(merged.values());
};

const ensureForYouNode = (nodes: ApiNode[]) => {
  if (!nodes.length) {
    return nodes;
  }

  const existingForYou = nodes.find((node) => isForYouNodeId(node.id));
  const topicNodes = nodes.filter((node) => !isForYouNodeId(node.id));
  const aggregatedPosts = mergePosts(
    existingForYou?.posts,
    topicNodes.flatMap((node) => node.posts ?? []),
  );

  const forYouNode: ApiNode = {
    id: FOR_YOU_NODE_ID,
    label: existingForYou?.label ?? FOR_YOU_NODE_LABEL,
    x: existingForYou?.x ?? 0,
    y: existingForYou?.y ?? 0,
    size: existingForYou?.size ?? 84,
    tone: existingForYou?.tone ?? "primary",
    posts: aggregatedPosts,
  };

  return [forYouNode, ...topicNodes];
};

const withForYouNode = (value: NodesAndPostsResponse | null) => {
  if (!value?.nodes?.length) {
    return value;
  }

  return {
    ...value,
    nodes: ensureForYouNode(value.nodes),
  };
};

const mergeNodesData = (
  previous: NodesAndPostsResponse | null,
  incoming: NodesAndPostsResponse,
): NodesAndPostsResponse | null => {
  const prevNodes = previous?.nodes ?? [];
  const prevEdges = previous?.edges ?? [];
  const nextNodes = incoming.nodes ?? [];
  const nextEdges = incoming.edges ?? [];

  if (!prevNodes.length && !nextNodes.length) {
    return null;
  }

  return {
    nodes: ensureForYouNode(mergeNodes(prevNodes, nextNodes)),
    edges: mergeEdges(prevEdges, nextEdges),
  };
};

export function NodesDataProvider({
  children,
  initialData,
  disableAutoLoad = false,
}: NodesDataProviderProps) {
  const seededInitialData = withForYouNode(initialData ?? null);
  const [data, setData] = useState<NodesAndPostsResponse | null>(
    seededInitialData,
  );
  const [status, setStatus] = useState<NodesDataStatus>(
    seededInitialData ? "ready" : "idle",
  );
  const [isCleared, setIsCleared] = useState(false);
  const [skipAutoLoad, setSkipAutoLoad] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(
    seededInitialData ? Date.now() : null,
  );
  const requestIdRef = useRef(0);
  const dataRef = useRef<NodesAndPostsResponse | null>(seededInitialData);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const refreshNodes = useCallback(
    async (options?: {
      limit?: number;
    }): Promise<NodesAndPostsResponse | null> => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setStatus("loading");
      try {
        const response = await getNodesAndPosts(options?.limit);
        if (requestId !== requestIdRef.current) {
          return null;
        }
        if (typeof __DEV__ !== "undefined" && __DEV__) {
          // eslint-disable-next-line no-console
          console.log("[nodes] get_nodes_and_posts response", response);
        }
        const merged = mergeNodesData(dataRef.current, response);
        if (merged?.nodes.length) {
          setData(merged);
          dataRef.current = merged;
          setStatus("ready");
          setIsCleared(false);
          setSkipAutoLoad(false);
          setLastUpdated(Date.now());
          return merged;
        }

        if (!dataRef.current?.nodes?.length) {
          setData(null);
          dataRef.current = null;
          setStatus("error");
          setLastUpdated(Date.now());
          return null;
        }

        setData(dataRef.current);
        setStatus("ready");
        setLastUpdated(Date.now());
        return dataRef.current;
      } catch {
        if (requestId !== requestIdRef.current) {
          return null;
        }
        if (!dataRef.current?.nodes?.length) {
          setData(null);
          dataRef.current = null;
          setStatus("error");
          setLastUpdated(Date.now());
          return null;
        }

        setData(dataRef.current);
        setStatus("ready");
        setLastUpdated(Date.now());
        return dataRef.current;
      }
    },
    [],
  );

  const clearNodes = useCallback(() => {
    requestIdRef.current += 1;
    setData(null);
    dataRef.current = null;
    setStatus("idle");
    setIsCleared(true);
    setSkipAutoLoad(true);
    setLastUpdated(Date.now());
  }, []);

  useEffect(() => {
    if (disableAutoLoad) return;
    if (skipAutoLoad) return;
    if (data) return;
    refreshNodes();
  }, [data, disableAutoLoad, refreshNodes, skipAutoLoad]);

  const value = useMemo(
    () => ({ data, status, refreshNodes, clearNodes, isCleared, lastUpdated }),
    [data, status, refreshNodes, clearNodes, isCleared, lastUpdated],
  );

  return (
    <NodesDataContext.Provider value={value}>
      {children}
    </NodesDataContext.Provider>
  );
}

export function useNodesData() {
  const context = useContext(NodesDataContext);
  if (!context) {
    throw new Error("useNodesData must be used within NodesDataProvider");
  }
  return context;
}
