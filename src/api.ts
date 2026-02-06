import { apiContract } from "./contracts";
export type {
  AuthProvider,
  AuthStartResponse,
  AuthUser,
  AuthAckResponse,
  AuthLogoutResponse,
  AuthDeleteAccountResponse,
  AdminResetResponse,
  ApiPost,
  ApiNode,
  ApiEdge,
  NodesAndPostsResponse,
  TwitterLinkResponse,
  TwitterSyncRequest,
  TwitterSyncResponse,
  TwitterFeedRequest,
  TwitterFeedSyncResponse,
  TwitterSyncStatusResponse,
  QueueClearResponse,
  QueueStatusResponse,
  QueueStatusRequest,
  UserProfileResponse,
  UserProfileRequest,
} from "./contracts";
import type {
  AuthStartResponse,
  AuthAckResponse,
  AuthLogoutResponse,
  AuthDeleteAccountResponse,
  AdminResetResponse,
  NodesAndPostsResponse,
  TwitterLinkResponse,
  TwitterSyncRequest,
  TwitterSyncResponse,
  TwitterFeedRequest,
  TwitterFeedSyncResponse,
  TwitterSyncStatusResponse,
  QueueClearResponse,
  QueueStatusResponse,
  QueueStatusRequest,
  UserProfileResponse,
  UserProfileRequest,
} from "./contracts";
import { assertSafeApiBaseUrlForWeb, getApiBaseUrl } from "./utils/urlSecurity";

const API_BASE_URL = getApiBaseUrl();

export class ApiRequestError extends Error {
  status: number;

  constructor(status: number, message?: string) {
    super(message ?? `Request failed with status ${status}`);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

type ApiAuthConfig = {
  getToken: () => string | null;
  onUnauthorized?: (() => void) | null;
};

let apiAuthConfig: ApiAuthConfig = {
  getToken: () => null,
  onUnauthorized: null,
};

export const configureApiAuth = (config: Partial<ApiAuthConfig>) => {
  apiAuthConfig = {
    ...apiAuthConfig,
    ...config,
  };
};

const buildUrl = (path: string) => {
  assertSafeApiBaseUrlForWeb();
  return `${API_BASE_URL}${path}`;
};

const getAuthToken = () => apiAuthConfig.getToken();

const shouldSendUserId = (userId?: string) =>
  typeof userId === "string" && userId.length > 0 && !getAuthToken();

const requestJson = async <T>(
  path: string,
  options?: RequestInit,
  requestOptions?: {
    requiresAuth?: boolean;
  },
): Promise<T> => {
  const headers = new Headers(options?.headers);
  const token = requestOptions?.requiresAuth ? getAuthToken() : null;

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path), {
    ...options,
    headers,
  });

  if (response.status === 401 && requestOptions?.requiresAuth) {
    apiAuthConfig.onUnauthorized?.();
    throw new ApiRequestError(401);
  }

  if (!response.ok) {
    throw new ApiRequestError(response.status);
  }

  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
};

export const validateSessionToken = async (token: string): Promise<boolean> => {
  const headers = new Headers({
    Authorization: `Bearer ${token}`,
  });
  const response = await fetch(buildUrl(apiContract.get.getUserProfile.path), {
    headers,
  });

  if (response.status === 401) {
    return false;
  }

  if (!response.ok) {
    throw new ApiRequestError(response.status);
  }

  return true;
};

export const startGoogleAuth = async (): Promise<AuthStartResponse> =>
  requestJson<AuthStartResponse>(apiContract.get.startGoogleAuth.path);

export const startTwitterAuth = async (): Promise<AuthStartResponse> =>
  requestJson<AuthStartResponse>(apiContract.get.startTwitterAuth.path);

export const getAuthAck = async (authId: string): Promise<AuthAckResponse> =>
  requestJson<AuthAckResponse>(
    `${apiContract.get.getAuthAck.path}?auth_id=${encodeURIComponent(authId)}`,
  );

export const logoutAuthSession = async (): Promise<AuthLogoutResponse> => {
  return requestJson<AuthLogoutResponse>(
    apiContract.post.logoutAuthSession.path,
    {
      method: "POST",
    },
    { requiresAuth: true },
  );
};

export const deleteAuthAccount =
  async (): Promise<AuthDeleteAccountResponse> => {
    return requestJson<AuthDeleteAccountResponse>(
      apiContract.delete.deleteAuthAccount.path,
      {
        method: "DELETE",
      },
      { requiresAuth: true },
    );
  };

export const adminResetState = async (): Promise<AdminResetResponse> => {
  return requestJson<AdminResetResponse>(
    apiContract.post.adminResetState.path,
    {
      method: "POST",
    },
    { requiresAuth: true },
  );
};

export const getTwitterLink = async (
  userId?: string,
): Promise<TwitterLinkResponse> => {
  const requestedUserId = shouldSendUserId(userId) ? userId : undefined;
  const url = requestedUserId
    ? `${apiContract.get.getTwitterLink.path}?user_id=${encodeURIComponent(
        requestedUserId,
      )}`
    : apiContract.get.getTwitterLink.path;

  return requestJson<TwitterLinkResponse>(url, undefined, {
    requiresAuth: true,
  });
};

export const getNodesAndPosts = async (
  limit?: number,
  options?: {
    signal?: AbortSignal;
  },
): Promise<NodesAndPostsResponse> => {
  const url =
    typeof limit === "number"
      ? `${apiContract.get.getNodesAndPosts.path}?limit=${encodeURIComponent(
          limit,
        )}`
      : apiContract.get.getNodesAndPosts.path;

  return requestJson<NodesAndPostsResponse>(
    url,
    {
      signal: options?.signal,
    },
    {
      requiresAuth: true,
    },
  );
};

export const syncTwitter = async (
  options?: TwitterSyncRequest,
): Promise<TwitterSyncResponse> => {
  return requestJson<TwitterSyncResponse>(
    apiContract.post.syncTwitter.path,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: shouldSendUserId(options?.user_id)
          ? options?.user_id
          : undefined,
        limit: options?.limit,
        force: options?.force,
      }),
    },
    { requiresAuth: true },
  );
};

export const syncTwitterFeed = async (
  options?: TwitterFeedRequest,
): Promise<TwitterFeedSyncResponse> => {
  return requestJson<TwitterFeedSyncResponse>(
    apiContract.post.syncTwitterFeed.path,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: shouldSendUserId(options?.user_id)
          ? options?.user_id
          : undefined,
        limit: options?.limit,
      }),
    },
    { requiresAuth: true },
  );
};

export const getTwitterSyncStatus = async (
  userId?: string,
): Promise<TwitterSyncStatusResponse> => {
  const requestedUserId = shouldSendUserId(userId) ? userId : undefined;
  const url = requestedUserId
    ? `${apiContract.get.getTwitterSyncStatus.path}?user_id=${encodeURIComponent(
        requestedUserId,
      )}`
    : apiContract.get.getTwitterSyncStatus.path;
  return requestJson<TwitterSyncStatusResponse>(url, undefined, {
    requiresAuth: true,
  });
};

export const clearQueue = async (): Promise<QueueClearResponse> => {
  return requestJson<QueueClearResponse>(
    apiContract.post.clearQueue.path,
    {
      method: "POST",
    },
    { requiresAuth: true },
  );
};

export const getQueueStatus = async (
  options?: QueueStatusRequest,
): Promise<QueueStatusResponse> => {
  const params = new URLSearchParams();
  if (typeof options?.limit === "number" && Number.isFinite(options.limit)) {
    params.set("limit", String(options.limit));
  }
  const requestedUserId = shouldSendUserId(options?.userId)
    ? options?.userId
    : undefined;
  if (requestedUserId) {
    params.set("user_id", requestedUserId);
  }
  const query = params.toString();
  const url = query
    ? `${apiContract.get.getQueueStatus.path}?${query}`
    : apiContract.get.getQueueStatus.path;

  return requestJson<QueueStatusResponse>(url, undefined, {
    requiresAuth: true,
  });
};

export const getUserProfile = async (
  options?: UserProfileRequest,
): Promise<UserProfileResponse> => {
  const params = new URLSearchParams();
  const requestedUserId = shouldSendUserId(options?.userId)
    ? options?.userId
    : undefined;
  if (requestedUserId) {
    params.set("user_id", requestedUserId);
  }
  if (options?.refresh) {
    params.set("refresh", "true");
  }
  const query = params.toString();
  const url = query
    ? `${apiContract.get.getUserProfile.path}?${query}`
    : apiContract.get.getUserProfile.path;

  return requestJson<UserProfileResponse>(url, undefined, {
    requiresAuth: true,
  });
};
