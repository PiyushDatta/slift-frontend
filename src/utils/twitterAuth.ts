import { Linking, Platform } from "react-native";
import { toTrustedAuthUrl } from "./urlSecurity";

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
  focus?: () => void;
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
  const trustedResponseAuthUrl = responseAuthUrl
    ? toTrustedAuthUrl(responseAuthUrl)
    : null;
  if (trustedResponseAuthUrl) {
    return trustedResponseAuthUrl;
  }

  const linkResponse = await resolveTwitterLink();
  const linkAuthUrl = asNonEmptyString(linkResponse?.auth_url);
  return linkAuthUrl ? toTrustedAuthUrl(linkAuthUrl) : null;
};

export const openAuthUrl = async (
  authUrl: string,
  popup: AuthPopupHandle | null,
): Promise<AuthPopupHandle | null> => {
  const trustedAuthUrl = toTrustedAuthUrl(authUrl);
  if (!trustedAuthUrl) {
    throw new Error("Unsafe auth URL.");
  }

  const browserWindow = getBrowserWindow();
  if (browserWindow) {
    let authTab = popup;
    if (!authTab && browserWindow.open) {
      authTab = browserWindow.open("about:blank", "_blank");
      try {
        if (authTab) {
          authTab.opener = null;
        }
      } catch {
        // Best-effort hardening only.
      }
    }

    if (authTab?.location) {
      authTab.location.href = trustedAuthUrl;
      authTab.focus?.();
      return authTab;
    }

    throw new Error("Unable to open auth popup window.");
  }

  await Linking.openURL(trustedAuthUrl);
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

  const browserWindow = getBrowserWindow();
  const focusDelay = closeDelaysMs[closeDelaysMs.length - 1] + 120;
  setTimeout(() => {
    try {
      browserWindow?.focus?.();
    } catch {
      // Best effort only.
    }
  }, focusDelay);
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
