import type { TwitterSyncStatusResponse } from "../api";

export type GraphReadyState = "ready" | "auth_required" | "timeout";

export type GraphReadyResult = {
  state: GraphReadyState;
  status: TwitterSyncStatusResponse | null;
};

const DEFAULT_STATUS_BACKOFF_MS = [1000, 1500, 2500, 4000, 6000, 9000];
const DEFAULT_MAX_STATUS_POLLS = 8;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const readBoolean = (value: unknown): boolean | null => {
  if (value === true) return true;
  if (value === false) return false;
  return null;
};

const getStatusSignal = (
  status: TwitterSyncStatusResponse | null,
  key: string,
): boolean | null => {
  if (!status) return null;
  const record = status as Record<string, unknown>;
  return readBoolean(record[key]);
};

export const isTwitterGraphReady = (
  status: TwitterSyncStatusResponse | null,
): boolean => {
  const graphReady =
    getStatusSignal(status, "graph_ready") ??
    getStatusSignal(status, "graphReady") ??
    getStatusSignal(status, "ready");
  if (graphReady === true) {
    return true;
  }

  return status?.running === false && status?.requires_auth !== true;
};

export const isTwitterAuthRequired = (
  status: TwitterSyncStatusResponse | null,
): boolean =>
  status?.requires_auth === true ||
  getStatusSignal(status, "requiresAuth") === true;

export const waitForTwitterGraphReady = async (
  getStatus: () => Promise<TwitterSyncStatusResponse>,
  options?: {
    maxPolls?: number;
    backoffMs?: number[];
  },
): Promise<GraphReadyResult> => {
  const maxPolls = Math.max(options?.maxPolls ?? DEFAULT_MAX_STATUS_POLLS, 1);
  const backoffMs = options?.backoffMs?.length
    ? options.backoffMs
    : DEFAULT_STATUS_BACKOFF_MS;

  let lastStatus: TwitterSyncStatusResponse | null = null;

  for (let pollAttempt = 0; pollAttempt < maxPolls; pollAttempt += 1) {
    const status = await getStatus().catch(() => null);
    lastStatus = status;

    if (isTwitterAuthRequired(status)) {
      return { state: "auth_required", status };
    }

    if (isTwitterGraphReady(status)) {
      return { state: "ready", status };
    }

    if (pollAttempt >= maxPolls - 1) {
      break;
    }

    const sleepMs = backoffMs[Math.min(pollAttempt, backoffMs.length - 1)];
    await sleep(sleepMs);
  }

  return { state: "timeout", status: lastStatus };
};
