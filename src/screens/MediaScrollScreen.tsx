import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RouteProp } from "@react-navigation/native";

import { useSettings } from "../context/SettingsContext";
import { useKnowledgeSelection } from "../context/KnowledgeSelectionContext";
import { useNodesData } from "../context/NodesDataContext";
import { useProfileData } from "../context/ProfileDataContext";
import { AppBackground } from "../components/AppBackground";
import { createMediaScrollStyles } from "../styles/MediaScrollScreenStyles";
import { submitPostFeedback } from "../api";
import type { ApiPost, PostFeedbackResponse } from "../api";
import { TabsParamList } from "../navigation/types";
import { KnowledgeGraphScreen } from "./KnowledgeGraphScreen";
import {
  FOR_YOU_NODE_ID,
  FOR_YOU_NODE_LABEL,
  isForYouNodeId,
  normalizeNodeKey,
} from "../config/knowledgeNodes";
import { VISIBLE_FOR_YOU_POSTS } from "../config/dataLimits";

type Post = ApiPost;
type PostFeedbackState = {
  likes: number;
  dislikes: number;
  liked: boolean | null;
  submitting: boolean;
};

const EMPTY_POST_FEEDBACK_STATE: PostFeedbackState = {
  likes: 0,
  dislikes: 0,
  liked: null,
  submitting: false,
};

const postFeedbackStateFromResponse = (
  response: PostFeedbackResponse,
): PostFeedbackState => ({
  likes:
    typeof response.likes === "number" && Number.isFinite(response.likes)
      ? Math.max(0, response.likes)
      : 0,
  dislikes:
    typeof response.dislikes === "number" && Number.isFinite(response.dislikes)
      ? Math.max(0, response.dislikes)
      : 0,
  liked: response.liked,
  submitting: false,
});

const DESKTOP_VISIBLE_TOPIC_COUNT = 4;
type MediaScrollScreenRoute = RouteProp<TabsParamList, "Main">;
type MediaScrollScreenNavigation = {
  navigate?: (screen: keyof TabsParamList, params?: unknown) => void;
};
type MediaScrollScreenProps = {
  route?: MediaScrollScreenRoute;
  navigation?: MediaScrollScreenNavigation;
};

const getWebWindow = () => {
  if (Platform.OS !== "web" || typeof globalThis === "undefined") {
    return null;
  }

  const maybeWindow = globalThis as typeof globalThis & {
    window?: {
      innerWidth?: unknown;
      addEventListener?: (
        event: string,
        handler: () => void,
        options?: unknown,
      ) => void;
      removeEventListener?: (
        event: string,
        handler: () => void,
        options?: unknown,
      ) => void;
    };
  };

  return maybeWindow.window ?? null;
};

const readWebInnerWidth = () => {
  const webWindow = getWebWindow();
  if (!webWindow) {
    return null;
  }

  const width = webWindow.innerWidth;
  if (typeof width !== "number" || !Number.isFinite(width) || width <= 0) {
    return null;
  }

  return width;
};

const renderMedia = (
  post: Post,
  styles: ReturnType<typeof createMediaScrollStyles>,
) => {
  const postType = post.type ?? "text";

  if (postType === "text") {
    return null;
  }

  if (postType === "image") {
    if (!post.mediaUrl) {
      return null;
    }
    return (
      <View style={styles.mediaWrapper}>
        <Image
          style={styles.media}
          source={{
            uri: post.mediaUrl,
          }}
          resizeMode="contain"
        />
      </View>
    );
  }

  const thumbnail = post.videoThumbnail ?? post.mediaUrl;

  if (!thumbnail) {
    return null;
  }

  return (
    <View style={styles.videoStub}>
      <View style={styles.mediaWrapper}>
        <Image
          style={styles.media}
          source={{ uri: thumbnail }}
          resizeMode="contain"
        />
      </View>
      <View style={styles.videoOverlay}>
        <Text style={styles.videoLabel}>Play</Text>
      </View>
    </View>
  );
};

const formatPostTimestamp = (timestamp?: string | number | null) => {
  if (timestamp === null || timestamp === undefined) {
    return "Now";
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "Now";
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};

type FeedCardProps = {
  item: Post;
  index: number;
  styles: ReturnType<typeof createMediaScrollStyles>;
  isDesktop: boolean;
  topicLabel: string;
  feedbackState: PostFeedbackState;
  onSubmitFeedback: (post: Post, liked: boolean, sourceLabel: string) => void;
};

function FeedCard({
  item,
  index,
  styles,
  isDesktop,
  topicLabel,
  feedbackState,
  onSubmitFeedback,
}: FeedCardProps) {
  const reveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    reveal.setValue(0);
    Animated.timing(reveal, {
      toValue: 1,
      duration: 360,
      delay: Math.min(index, 8) * 45,
      useNativeDriver: true,
    }).start();
  }, [index, item.id, reveal]);

  const translateY = reveal.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });
  const sourceLabel =
    typeof item.source === "string" && item.source.trim().length > 0
      ? item.source.trim()
      : topicLabel;
  const liked = feedbackState.liked === true;
  const disliked = feedbackState.liked === false;

  return (
    <Animated.View
      style={[
        styles.card,
        isDesktop ? styles.cardDesktop : null,
        {
          opacity: reveal,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.cardAccent} />
      <View style={styles.header}>
        {item.userAvatar ? (
          <Image
            style={styles.avatar}
            source={{
              uri: item.userAvatar,
            }}
          />
        ) : (
          <View style={styles.avatarFallback} />
        )}
        <View style={styles.userMeta}>
          <Text style={styles.userName}>{item.userName ?? "Slift Member"}</Text>
          <Text style={styles.userHandle}>{item.userHandle ?? "@slift"}</Text>
        </View>
      </View>
      <View style={styles.postMetaRow}>
        <Text style={styles.postSource}>{sourceLabel}</Text>
        <Text style={styles.postMetaSoft}>{formatPostTimestamp(item.timestamp)}</Text>
      </View>
      <Text style={styles.content}>{item.content ?? ""}</Text>
      {renderMedia(item, styles)}
      {isDesktop ? (
        <View style={styles.tagRow}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{topicLabel}</Text>
          </View>
        </View>
      ) : null}
      <View style={styles.feedbackActionsRow}>
        <Pressable
          onPress={() => onSubmitFeedback(item, true, sourceLabel)}
          disabled={feedbackState.submitting}
          style={[
            styles.feedbackButton,
            liked ? styles.feedbackButtonActive : null,
            feedbackState.submitting ? styles.feedbackButtonDisabled : null,
          ]}
        >
          <Text
            style={[
              styles.feedbackButtonText,
              liked ? styles.feedbackButtonTextActive : null,
            ]}
          >
            Like
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onSubmitFeedback(item, false, sourceLabel)}
          disabled={feedbackState.submitting}
          style={[
            styles.feedbackButton,
            disliked ? styles.feedbackButtonActive : null,
            feedbackState.submitting ? styles.feedbackButtonDisabled : null,
          ]}
        >
          <Text
            style={[
              styles.feedbackButtonText,
              disliked ? styles.feedbackButtonTextActive : null,
            ]}
          >
            Dislike
          </Text>
        </Pressable>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.footerStat}>{`Likes ${feedbackState.likes}`}</Text>
        <Text style={styles.footerStat}>{`Dislikes ${feedbackState.dislikes}`}</Text>
      </View>
    </Animated.View>
  );
}

export function MediaScrollScreen({
  route,
  navigation,
}: MediaScrollScreenProps = {}) {
  const { size } = useSettings();
  const styles = useMemo(createMediaScrollStyles, [size]);
  const { width: measuredWindowWidth } = useWindowDimensions();
  const [webWindowWidth, setWebWindowWidth] = useState<number | null>(() =>
    readWebInnerWidth(),
  );
  const { selectedNode, setSelectedNode } = useKnowledgeSelection();
  const { data, status: nodesStatus, isCleared } = useNodesData();
  const { data: profile } = useProfileData();
  useEffect(() => {
    const webWindow = getWebWindow();
    if (!webWindow?.addEventListener || !webWindow?.removeEventListener) {
      return;
    }

    const syncWidth = () => {
      const next = readWebInnerWidth();
      if (typeof next === "number") {
        setWebWindowWidth(next);
      }
    };

    syncWidth();
    webWindow.addEventListener("resize", syncWidth);
    return () => {
      webWindow.removeEventListener("resize", syncWidth);
    };
  }, []);

  const windowWidth =
    Platform.OS === "web"
      ? (webWindowWidth ?? measuredWindowWidth)
      : measuredWindowWidth;
  const isDesktop = windowWidth >= 1180;
  const showInsightsRail = windowWidth >= 1420;
  const [desktopView, setDesktopView] = useState<"feed" | "graph">("feed");
  const [isTopicListExpanded, setIsTopicListExpanded] = useState(false);

  const routeNodeId = route?.params?.nodeId;
  const routeNodeLabel = route?.params?.nodeLabel;
  const forYouNode = useMemo(
    () => data?.nodes.find((node) => isForYouNodeId(node.id)) ?? null,
    [data],
  );

  useEffect(() => {
    if (!routeNodeId) return;
    const isRouteForYou = isForYouNodeId(routeNodeId);
    setSelectedNode({
      id: routeNodeId,
      label:
        routeNodeLabel ?? (isRouteForYou ? FOR_YOU_NODE_LABEL : routeNodeId),
    });
  }, [routeNodeId, routeNodeLabel, setSelectedNode]);

  useEffect(() => {
    if (routeNodeId || selectedNode || !forYouNode) return;
    setSelectedNode({
      id: forYouNode.id,
      label: forYouNode.label ?? FOR_YOU_NODE_LABEL,
    });
  }, [routeNodeId, selectedNode, setSelectedNode, forYouNode]);

  const selectedNodeId = selectedNode?.id ?? forYouNode?.id;
  const normalizedSelectedNodeId = selectedNodeId
    ? normalizeNodeKey(selectedNodeId)
    : null;
  const isForYouSelected =
    normalizedSelectedNodeId !== null &&
    isForYouNodeId(normalizedSelectedNodeId);
  const selectedGraphNode = useMemo(
    () =>
      normalizedSelectedNodeId
        ? (data?.nodes.find(
            (node) => normalizeNodeKey(node.id) === normalizedSelectedNodeId,
          ) ?? null)
        : null,
    [data, normalizedSelectedNodeId],
  );
  const selectedNodeLabel = isForYouSelected
    ? (forYouNode?.label ?? FOR_YOU_NODE_LABEL)
    : (selectedGraphNode?.label ??
      selectedNode?.label ??
      forYouNode?.label ??
      selectedNodeId);
  useEffect(() => {
    if (
      !selectedNodeId ||
      isForYouSelected ||
      selectedGraphNode ||
      !forYouNode
    ) {
      return;
    }
    setSelectedNode({
      id: forYouNode.id ?? FOR_YOU_NODE_ID,
      label: forYouNode.label ?? FOR_YOU_NODE_LABEL,
    });
  }, [
    forYouNode,
    isForYouSelected,
    selectedGraphNode,
    selectedNodeId,
    setSelectedNode,
  ]);
  const heroReveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    heroReveal.setValue(0);
    Animated.timing(heroReveal, {
      toValue: 1,
      duration: 360,
      useNativeDriver: true,
    }).start();
  }, [heroReveal, selectedNodeId]);

  const aggregatedPosts = useMemo(
    () =>
      data?.nodes
        .filter((node) => !isForYouNodeId(node.id))
        .flatMap((node) => node.posts ?? []) ?? [],
    [data],
  );
  const topicLabelByPostId = useMemo(() => {
    const map = new Map<string, string>();
    const topicNodesSortedByWeight = (data?.nodes ?? [])
      .filter((node) => !isForYouNodeId(node.id))
      .sort((a, b) => (b.posts?.length ?? 0) - (a.posts?.length ?? 0));

    for (const node of topicNodesSortedByWeight) {
      const label = node.label ?? node.id;
      for (const post of node.posts ?? []) {
        if (!post?.id || map.has(post.id)) {
          continue;
        }
        map.set(post.id, label);
      }
    }

    return map;
  }, [data]);

  const nodePosts = useMemo(() => {
    if (!selectedNodeId) return [];
    if (isForYouSelected) {
      return (forYouNode?.posts ?? aggregatedPosts).slice(
        0,
        VISIBLE_FOR_YOU_POSTS,
      );
    }
    return (
      data?.nodes.find(
        (node) => normalizeNodeKey(node.id) === normalizedSelectedNodeId,
      )?.posts ?? []
    );
  }, [
    aggregatedPosts,
    data,
    forYouNode,
    isForYouSelected,
    normalizedSelectedNodeId,
    selectedNodeId,
  ]);
  const topicNodes = useMemo(
    () =>
      (data?.nodes ?? [])
        .filter((node) => !isForYouNodeId(node.id))
        .map((node) => ({
          id: node.id,
          label: node.label ?? node.id,
          postCount: node.posts?.length ?? 0,
        }))
        .sort(
          (a, b) => b.postCount - a.postCount || a.label.localeCompare(b.label),
        ),
    [data],
  );

  const isLoading = nodesStatus === "loading" || nodesStatus === "idle";
  const basePosts = selectedNodeId ? nodePosts : aggregatedPosts;
  const posts = basePosts;
  const [feedbackByPostId, setFeedbackByPostId] = useState<
    Record<string, PostFeedbackState>
  >({});
  const feedbackInFlightRef = useRef(new Set<string>());

  const getFeedbackStateForPost = useCallback(
    (post: Post): PostFeedbackState => {
      if (!post.id) {
        return EMPTY_POST_FEEDBACK_STATE;
      }
      return feedbackByPostId[post.id] ?? EMPTY_POST_FEEDBACK_STATE;
    },
    [feedbackByPostId],
  );

  const handleSubmitFeedback = useCallback(
    async (post: Post, liked: boolean, sourceLabel: string) => {
      const postId = post.id?.trim();
      if (!postId) {
        return;
      }
      if (feedbackInFlightRef.current.has(postId)) {
        return;
      }
      feedbackInFlightRef.current.add(postId);
      setFeedbackByPostId((previous) => {
        const current = previous[postId] ?? EMPTY_POST_FEEDBACK_STATE;
        return {
          ...previous,
          [postId]: {
            ...current,
            submitting: true,
          },
        };
      });

      try {
        const response = await submitPostFeedback({
          post_id: postId,
          liked,
          source: post.source ?? sourceLabel,
          content: post.content ?? null,
        });
        setFeedbackByPostId((previous) => ({
          ...previous,
          [postId]: postFeedbackStateFromResponse(response),
        }));
      } catch {
        setFeedbackByPostId((previous) => {
          const current = previous[postId];
          if (!current) {
            return previous;
          }
          return {
            ...previous,
            [postId]: {
              ...current,
              submitting: false,
            },
          };
        });
      } finally {
        feedbackInFlightRef.current.delete(postId);
      }
    },
    [],
  );

  const title = selectedNodeLabel ?? "Slift";
  const subtitle = isForYouSelected
    ? "Your blended stream"
    : selectedNodeId
      ? "Focused topic stream"
      : "Realtime signal";
  const activeTopicLabel = selectedNodeLabel ?? FOR_YOU_NODE_LABEL;
  const getTopicLabelForPost = (post: Post) => {
    if (!isForYouSelected) {
      return activeTopicLabel;
    }
    const sourceLabel = post.id ? topicLabelByPostId.get(post.id) : null;
    return sourceLabel ?? activeTopicLabel;
  };
  const topicCount = topicNodes.length;
  const selectedTopicNode = useMemo(
    () =>
      !isForYouSelected && normalizedSelectedNodeId
        ? (topicNodes.find(
            (topic) => normalizeNodeKey(topic.id) === normalizedSelectedNodeId,
          ) ?? null)
        : null,
    [isForYouSelected, normalizedSelectedNodeId, topicNodes],
  );
  const desktopTopics = useMemo(() => {
    if (isTopicListExpanded) {
      return topicNodes;
    }

    const compactTopics = topicNodes.slice(0, DESKTOP_VISIBLE_TOPIC_COUNT);
    if (!selectedTopicNode) {
      return compactTopics;
    }

    const hasSelectedTopic = compactTopics.some(
      (topic) => topic.id === selectedTopicNode.id,
    );
    if (hasSelectedTopic) {
      return compactTopics;
    }

    return [
      selectedTopicNode,
      ...compactTopics.slice(0, Math.max(0, DESKTOP_VISIBLE_TOPIC_COUNT - 1)),
    ];
  }, [isTopicListExpanded, selectedTopicNode, topicNodes]);
  const hiddenTopicCount = Math.max(
    topicNodes.length - desktopTopics.length,
    0,
  );
  const trendingNow = useMemo(
    () => [
      {
        label: "GPT-6 Announcement",
        posts: 2047,
        pct: "+342%",
      },
      {
        label: "Fusion Energy Breakthrough",
        posts: 1923,
        pct: "+218%",
      },
      {
        label: "Neural Interface Research",
        posts: 1654,
        pct: "+156%",
      },
      {
        label: "Mars Colony Updates",
        posts: 1432,
        pct: "+98%",
      },
    ],
    [],
  );

  const renderEmptyState = (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>
        {isLoading
          ? "Loading posts..."
          : isCleared
            ? "Posts cleared."
            : selectedNodeId
              ? "No posts for this node yet."
              : "No posts yet."}
      </Text>
      <Text style={styles.emptySubtitle}>
        {isLoading
          ? "Fetching the latest content."
          : isCleared
            ? "Sync Twitter to fetch new posts."
            : "Try syncing Twitter or check back soon."}
      </Text>
    </View>
  );
  const renderDesktopControls = (inRail: boolean) => (
    <Animated.View
      style={[
        styles.desktopHeaderCard,
        inRail ? styles.desktopHeaderCardRail : null,
        {
          opacity: heroReveal,
          transform: [
            {
              translateY: heroReveal.interpolate({
                inputRange: [0, 1],
                outputRange: [-14, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View
        style={[
          styles.desktopTitleRow,
          inRail ? styles.desktopTitleRowRail : null,
        ]}
      >
        <View style={styles.desktopTitleBlock}>
          <Text
            style={[
              styles.desktopTitle,
              inRail ? styles.desktopTitleRail : null,
            ]}
          >
            Curated Feed
          </Text>
          <Text
            style={[
              styles.desktopSubtitle,
              inRail ? styles.desktopSubtitleRail : null,
            ]}
          >
            Based on your knowledge graph preferences
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.desktopHeaderBody,
          inRail ? styles.desktopHeaderBodyRail : null,
        ]}
      >
        <View
          style={[
            styles.desktopHeaderMain,
            inRail ? styles.desktopHeaderMainRail : null,
          ]}
        >
          <View
            style={[
              styles.viewToggleRow,
              inRail ? styles.viewToggleRowRail : null,
            ]}
          >
            <Pressable
              onPress={() => setDesktopView("feed")}
              style={[
                styles.viewToggleButton,
                inRail ? styles.viewToggleButtonRail : null,
                desktopView === "feed" ? styles.viewToggleButtonActive : null,
              ]}
            >
              <Text
                style={[
                  styles.viewToggleText,
                  inRail ? styles.viewToggleTextRail : null,
                  desktopView === "feed" ? styles.viewToggleTextActive : null,
                ]}
              >
                Feed View
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setDesktopView("graph")}
              style={[
                styles.viewToggleButton,
                inRail ? styles.viewToggleButtonRail : null,
                desktopView === "graph" ? styles.viewToggleButtonActive : null,
              ]}
            >
              <Text
                style={[
                  styles.viewToggleText,
                  inRail ? styles.viewToggleTextRail : null,
                  desktopView === "graph" ? styles.viewToggleTextActive : null,
                ]}
              >
                Graph View
              </Text>
            </Pressable>
          </View>
        </View>

        <View
          style={[
            styles.topicSidePanel,
            inRail ? styles.topicSidePanelRail : null,
          ]}
        >
          <View style={styles.topicSideHeader}>
            <Text style={styles.topicSideTitle}>Topics</Text>
            <Text style={styles.topicSideMeta}>{`${topicCount} total`}</Text>
          </View>

          <View style={styles.topicSideList}>
            <Pressable
              onPress={() =>
                setSelectedNode({
                  id: forYouNode?.id ?? FOR_YOU_NODE_ID,
                  label: forYouNode?.label ?? FOR_YOU_NODE_LABEL,
                })
              }
              style={[
                styles.topicChip,
                isForYouSelected ? styles.topicChipActive : null,
              ]}
            >
              <Text
                style={[
                  styles.topicChipText,
                  isForYouSelected ? styles.topicChipTextActive : null,
                ]}
              >
                {`All Topics ${topicCount}`}
              </Text>
            </Pressable>

            {desktopTopics.map((topic) => {
              const isActive =
                !isForYouSelected &&
                normalizeNodeKey(topic.id) === normalizedSelectedNodeId;
              return (
                <Pressable
                  key={topic.id}
                  onPress={() =>
                    setSelectedNode({
                      id: topic.id,
                      label: topic.label,
                    })
                  }
                  style={[
                    styles.topicChip,
                    isActive ? styles.topicChipActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.topicChipText,
                      isActive ? styles.topicChipTextActive : null,
                    ]}
                    numberOfLines={1}
                  >
                    {`${topic.label} ${topic.postCount}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {topicCount > DESKTOP_VISIBLE_TOPIC_COUNT ? (
            <Pressable
              onPress={() => setIsTopicListExpanded((current) => !current)}
              style={styles.topicMoreButton}
            >
              <Text style={styles.topicMoreText}>
                {isTopicListExpanded ? "Less" : `More +${hiddenTopicCount}`}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppBackground />
      {isDesktop ? (
        <ScrollView
          style={styles.desktopScroll}
          contentContainerStyle={styles.desktopScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.desktopShell}>
            <View style={styles.leftRail}>
              <View style={styles.brandRow}>
                <View style={styles.brandIcon}>
                  <Text style={styles.brandIconText}>S</Text>
                </View>
                <View>
                  <Text style={styles.brandTitle}>Slift</Text>
                  <Text style={styles.brandSubtitle}>Knowledge Network</Text>
                </View>
              </View>

              <View style={styles.leftSearch}>
                <Text style={styles.leftSearchText}>Search topics...</Text>
              </View>

              <View style={styles.railNav}>
                {[
                  {
                    label: "Feed",
                    active: desktopView === "feed",
                    action: "feed",
                  },
                  {
                    label: "Explore",
                    active: desktopView === "graph",
                    action: "graph",
                  },
                  { label: "Profile", active: false, action: "profile" },
                ].map((entry) => (
                  <Pressable
                    key={entry.label}
                    onPress={() => {
                      if (entry.action === "profile") {
                        navigation?.navigate?.("Profile");
                        return;
                      }
                      setDesktopView(
                        entry.action === "graph" ? "graph" : "feed",
                      );
                    }}
                    style={({ pressed }) => [
                      styles.railNavItem,
                      entry.active ? styles.railNavItemActive : null,
                      pressed ? { opacity: 0.82 } : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.railNavText,
                        entry.active ? styles.railNavTextActive : null,
                      ]}
                    >
                      {entry.label}
                    </Text>
                    {entry.active ? (
                      <Text style={styles.railNavTextActive}>*</Text>
                    ) : null}
                  </Pressable>
                ))}
              </View>

              <Pressable style={styles.railCreateButton}>
                <Text style={styles.railCreateText}>Create Post</Text>
              </Pressable>
            </View>

            <View style={styles.feedColumn}>
              {desktopView === "feed" ? (
                <View testID="media-feed" style={styles.desktopList}>
                  {posts.length > 0
                    ? posts.map((item, index) => (
                        <FeedCard
                          key={item.id ?? `post-${index}`}
                          item={item}
                          index={index}
                          styles={styles}
                          isDesktop
                          topicLabel={getTopicLabelForPost(item)}
                          feedbackState={getFeedbackStateForPost(item)}
                          onSubmitFeedback={handleSubmitFeedback}
                        />
                      ))
                    : renderEmptyState}
                </View>
              ) : (
                <View style={styles.desktopGraphShell}>
                  <KnowledgeGraphScreen
                    embedded
                    onNodePress={(node) => {
                      setSelectedNode({ id: node.id, label: node.label });
                      setDesktopView("feed");
                    }}
                  />
                </View>
              )}
            </View>

            <View style={styles.rightRail}>
              {renderDesktopControls(true)}
              {showInsightsRail ? (
                <>
                  <View style={styles.panelCard}>
                    <Text style={styles.panelTitle}>Trending Now</Text>
                    {trendingNow.map((item) => (
                      <View key={item.label} style={styles.panelRow}>
                        <View>
                          <Text style={styles.panelValue}>{item.label}</Text>
                          <Text
                            style={styles.panelLabel}
                          >{`${item.posts} posts`}</Text>
                        </View>
                        <Text style={styles.panelTrendValue}>{item.pct}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.panelCard}>
                    <Text style={styles.panelTitle}>Your Activity</Text>
                    <View style={styles.panelRow}>
                      <Text style={styles.panelLabel}>Posts this week</Text>
                      <Text style={styles.panelValue}>{posts.length}</Text>
                    </View>
                    <View style={styles.panelRow}>
                      <Text style={styles.panelLabel}>Engagement rate</Text>
                      <Text style={styles.panelTrendValue}>+24%</Text>
                    </View>
                    <View style={styles.panelRow}>
                      <Text style={styles.panelLabel}>Topics followed</Text>
                      <Text style={styles.panelValue}>
                        {Math.max(topicCount, 1)}
                      </Text>
                    </View>
                  </View>
                </>
              ) : null}
            </View>
          </View>
        </ScrollView>
      ) : (
        <>
          <Animated.View
            style={[
              styles.topNav,
              {
                opacity: heroReveal,
                transform: [
                  {
                    translateY: heroReveal.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-14, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.topNavGlow} />
            <View style={styles.topNavLeft}>
              <Image
                style={styles.navAvatar}
                source={{
                  uri:
                    profile?.avatar_url ?? "https://i.pravatar.cc/100?img=50",
                }}
              />
            </View>
            <View style={styles.topNavCenter}>
              <Text style={styles.navTitle}>{title}</Text>
              <Text style={styles.navSubtitle}>{subtitle}</Text>
            </View>
            <View style={styles.topNavRight}>
              <View style={styles.navActionPill}>
                <Text style={styles.navAction}>Search</Text>
              </View>
              <View style={styles.navActionPill}>
                <Text style={styles.navAction}>Create</Text>
              </View>
            </View>
          </Animated.View>

          <FlatList
            testID="media-feed"
            data={posts}
            keyExtractor={(item, index) => item.id ?? `post-${index}`}
            contentContainerStyle={styles.list}
            ListEmptyComponent={renderEmptyState}
            renderItem={({ item, index }) => (
              <FeedCard
                item={item}
                index={index}
                styles={styles}
                isDesktop={false}
                topicLabel={getTopicLabelForPost(item)}
                feedbackState={getFeedbackStateForPost(item)}
                onSubmitFeedback={handleSubmitFeedback}
              />
            )}
          />
        </>
      )}
    </SafeAreaView>
  );
}
