export const apiContract = {
  get: {
    startGoogleAuth: {
      path: "/auth/google/start",
      responseRef: "#/components/schemas/AuthStartResponse",
    },
    startTwitterAuth: {
      path: "/auth/twitter/start",
      responseRef: "#/components/schemas/AuthStartResponse",
    },
    getAuthAck: {
      path: "/auth/ack",
      responseRef: "#/components/schemas/AuthAckResponse",
    },
    getTwitterLink: {
      path: "/twitter/link",
      responseRef: "#/components/schemas/TwitterLinkResponse",
    },
    getNodesAndPosts: {
      path: "/get_nodes_and_posts",
      responseRef: "#/components/schemas/NodesAndPostsResponse",
    },
    getTwitterSyncStatus: {
      path: "/twitter/sync/status",
      responseRef: "#/components/schemas/TwitterSyncStatusResponse",
    },
    getQueueStatus: {
      path: "/queue/status",
    },
    getUserProfile: {
      path: "/user/profile",
      responseRef: "#/components/schemas/UserProfileResponse",
    },
  },
  post: {
    logoutAuthSession: {
      path: "/auth/logout",
      responseRef: "#/components/schemas/AuthLogoutResponse",
    },
    adminResetState: {
      path: "/admin/reset",
      responseRef: "#/components/schemas/AdminResetResponse",
    },
    syncTwitter: {
      path: "/twitter/sync",
      requestRef: "#/components/schemas/TwitterSyncRequest",
    },
    syncTwitterFeed: {
      path: "/twitter/feed/sync",
      requestRef: "#/components/schemas/TwitterFeedRequest",
    },
    submitPostFeedback: {
      path: "/posts/feedback",
      requestRef: "#/components/schemas/PostFeedbackRequest",
      responseRef: "#/components/schemas/PostFeedbackResponse",
    },
    clearQueue: {
      path: "/queue/clear",
    },
  },
  delete: {
    deleteAuthAccount: {
      path: "/auth/account",
      responseRef: "#/components/schemas/AuthDeleteAccountResponse",
    },
  },
} as const;

export type AuthProvider = "google" | "twitter";

export type AuthStartResponse = {
  auth_id: string;
  provider: AuthProvider;
  auth_url: string;
  status: "pending";
};

export type AuthUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  handle?: string | null;
  avatar_url?: string | null;
  provider?: AuthProvider | null;
};

export type AuthAckResponse = {
  auth_id: string;
  provider?: AuthProvider | null;
  status: "pending" | "success" | "error";
  acknowledged: boolean;
  error?: string | null;
  user?: AuthUser | null;
  session_token?: string | null;
  session_expires_at?: number | null;
};

export type AuthLogoutResponse = {
  ok: boolean;
  revoked: boolean;
};

export type AuthDeleteAccountResponse = {
  ok: boolean;
  deleted: boolean;
  deleted_user_id: string;
  revoked_sessions: number;
};

export type AdminResetResponse = {
  ok: boolean;
  auth_state_reset: boolean;
  queue_reset: boolean;
  nodes_reset: boolean;
  posts_reset: boolean;
  profile_reset: boolean;
  sync_reset: boolean;
  disconnected_accounts: number;
};

export type ApiPost = {
  id: string;
  source?: string | null;
  userName?: string | null;
  userHandle?: string | null;
  userAvatar?: string | null;
  type?: "text" | "image" | "video" | null;
  content?: string | null;
  mediaUrl?: string | null;
  videoThumbnail?: string | null;
  timestamp?: string | number | null;
  retweetedTweet?: RetweetedPost | null;
};

export type RetweetedPost = {
  id: string;
  source?: string | null;
  userName?: string | null;
  userHandle?: string | null;
  userAvatar?: string | null;
  type?: "text" | "image" | "video" | null;
  content?: string | null;
  mediaUrl?: string | null;
  videoThumbnail?: string | null;
  timestamp?: string | number | null;
};

export type ApiNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  size: number;
  tone: "primary" | "secondary" | "accent";
  posts?: ApiPost[] | null;
};

export type ApiEdge = {
  from: string;
  to: string;
  strength: 1 | 2 | 3;
};

export type NodesAndPostsResponse = {
  nodes: ApiNode[];
  edges: ApiEdge[];
};

export type TwitterLinkResponse = {
  auth_url?: string | null;
};

export type TwitterSyncRequest = {
  user_id?: string;
  limit?: number;
  force?: boolean;
};

export type TwitterSyncResponse = Record<string, unknown>;

export type TwitterFeedRequest = {
  user_id?: string;
  limit?: number;
};

export type TwitterFeedSyncResponse = Record<string, unknown>;

export type TwitterSyncStatusResponse = {
  running?: boolean | null;
  graph_ready?: boolean | null;
  requires_auth?: boolean | null;
  auth_url?: string | null;
  last_error?: string | null;
};

export type PostFeedbackRequest = {
  post_id: string;
  liked: boolean;
  source?: string | null;
  content?: string | null;
};

export type PostFeedbackResponse = {
  ok: boolean;
  post_id: string;
  liked: boolean;
  source?: string | null;
  likes: number;
  dislikes: number;
};

export type QueueClearResponse = Record<string, unknown>;

export type QueueStatusResponse = Record<string, unknown>;

export type QueueStatusRequest = {
  limit?: number;
  userId?: string;
};

export type UserProfileResponse = {
  name?: string | null;
  handle?: string | null;
  avatar_url?: string | null;
  linked?: boolean | null;
  requires_auth?: boolean | null;
  auth_url?: string | null;
};

export type UserProfileRequest = {
  userId?: string;
  refresh?: boolean;
};
