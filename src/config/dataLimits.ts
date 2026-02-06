export const MAX_TOPIC_NODES = 30;
export const MIN_POSTS_PER_NODE = 30;
export const MAX_POSTS_PER_NODE = 100;
export const VISIBLE_FOR_YOU_POSTS = 30;

export const BACKGROUND_FETCH_LIMIT = 100;
export const BACKGROUND_REFRESH_INTERVAL_MS = 10000;
export const BACKGROUND_STOP_TOTAL_TOPIC_POSTS = 500;

export const SYNC_BOOTSTRAP_FETCH_LIMITS = [5, 10] as const;
export const SYNC_STEADY_FETCH_LIMIT = 20;

export const getSyncFetchLimit = (attempt: number) =>
  SYNC_BOOTSTRAP_FETCH_LIMITS[attempt] ?? SYNC_STEADY_FETCH_LIMIT;
