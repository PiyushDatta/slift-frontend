import { Linking, Platform } from "react-native";

export type AuthPopupHandle = {
  close?: () => void;
  focus?: () => void;
  opener?: unknown;
  closed?: boolean;
  location?: {
    href?: string;
  };
};

type BrowserWindowHandle = {
  open?: (
    url?: string,
    target?: string,
    features?: string,
  ) => AuthPopupHandle | null;
  location?: {
    href?: string;
  };
};

const getBrowserWindow = (): BrowserWindowHandle | null => {
  if (Platform.OS !== "web" || typeof globalThis === "undefined") {
    return null;
  }

  const maybeWindow = globalThis as typeof globalThis & {
    window?: BrowserWindowHandle;
  };
  return maybeWindow.window ?? null;
};

const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const asBooleanTrue = (value: unknown): boolean => value === true;

export const openAuthPopup = (): AuthPopupHandle | null => {
  const browserWindow = getBrowserWindow();
  if (!browserWindow?.open) {
    return null;
  }

  const popup = browserWindow.open("about:blank", "_blank");
  try {
    if (popup) {
      popup.opener = null;
    }
  } catch {
    // Best-effort hardening only.
  }

  popup?.focus?.();
  return popup;
};

export const closeAuthPopup = (popup: AuthPopupHandle | null) => {
  popup?.close?.();
};

export const getSyncRequiresAuth = (value: unknown): boolean => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return asBooleanTrue(record.requires_auth);
};

export const getSyncAuthUrl = (value: unknown): string | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  return asNonEmptyString(record.auth_url);
};

export const getTwitterAuthUrlFromSyncResponse = async (
  syncResponse: unknown,
  resolveTwitterLink: () => Promise<{ auth_url?: unknown }>,
): Promise<string | null> => {
  const responseAuthUrl = getSyncAuthUrl(syncResponse);
  if (responseAuthUrl) {
    return responseAuthUrl;
  }

  const linkResponse = await resolveTwitterLink();
  return asNonEmptyString(linkResponse?.auth_url);
};

export const openAuthUrl = async (
  authUrl: string,
  popup: AuthPopupHandle | null,
): Promise<AuthPopupHandle | null> => {
  const browserWindow = getBrowserWindow();
  if (browserWindow) {
    if (popup?.location) {
      popup.location.href = authUrl;
      return popup;
    }

    if (browserWindow.open) {
      const nextTab = browserWindow.open(authUrl, "_blank");
      if (nextTab) {
        nextTab.focus?.();
        return nextTab;
      }
    }

    if (browserWindow.location) {
      // Last resort if popup/new-tab is blocked by browser settings.
      browserWindow.location.href = authUrl;
      return null;
    }
  }

  await Linking.openURL(authUrl);
  return null;
};

type TwitterSyncStatusLike = {
  requires_auth?: boolean | null;
  last_error?: string | null;
};

type WaitForTwitterAuthCompletionOptions = {
  pollIntervalMs?: number;
  maxAttempts?: number;
};

const defaultWaitForTwitterAuthCompletionOptions: Required<WaitForTwitterAuthCompletionOptions> =
  {
    pollIntervalMs: 2000,
    maxAttempts: 120,
  };

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const forceClosePopup = (popup: AuthPopupHandle | null) => {
  if (!popup) {
    return;
  }

  // Some browsers ignore close during redirect; retry with short delays.
  const closeDelaysMs = [0, 250, 900, 1800];
  for (const delay of closeDelaysMs) {
    setTimeout(() => {
      try {
        if (!popup.closed) {
          popup.close?.();
        }
      } catch {
        // Best effort only.
      }
    }, delay);
  }
};

export const waitForTwitterAuthCompletion = async (
  popup: AuthPopupHandle | null,
  getSyncStatus: () => Promise<TwitterSyncStatusLike | null | undefined>,
  options?: WaitForTwitterAuthCompletionOptions,
): Promise<{ authorized: boolean; error?: string }> => {
  const mergedOptions = {
    ...defaultWaitForTwitterAuthCompletionOptions,
    ...(options ?? {}),
  };

  for (let attempt = 0; attempt < mergedOptions.maxAttempts; attempt += 1) {
    const status = await getSyncStatus().catch(() => null);
    if (status?.requires_auth === false) {
      forceClosePopup(popup);
      return { authorized: true };
    }

    const errorMessage = asNonEmptyString(status?.last_error);
    if (errorMessage && status?.requires_auth !== true) {
      forceClosePopup(popup);
      return { authorized: false, error: errorMessage };
    }

    await sleep(mergedOptions.pollIntervalMs);
  }

  forceClosePopup(popup);
  return {
    authorized: false,
    error: "Twitter authorization timed out. Please try again.",
  };
};
