import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Linking, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

import {
  ApiRequestError,
  configureApiAuth,
  getAuthAck,
  startGoogleAuth,
  validateSessionToken,
} from "../api";

type AuthStatus = "checking" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  sessionToken: string | null;
  sessionExpiresAt: number | null;
  isAuthenticating: boolean;
  reauthMessage: string | null;
  startAuth: () => Promise<boolean>;
  signOut: () => void;
  clearReauthMessage: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: React.ReactNode;
};

const SESSION_TOKEN_KEY = "slift_session_token";
const SESSION_EXPIRES_AT_KEY = "slift_session_expires_at";
const AUTH_ACK_POLL_MS = 1400;
const AUTH_ACK_TIMEOUT_MS = 120_000;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const normalizeExpiryMs = (value?: number | null) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return value < 1_000_000_000_000 ? value * 1000 : value;
};

const canUseWebStorage = () =>
  Platform.OS === "web" &&
  typeof globalThis !== "undefined" &&
  "localStorage" in globalThis;

const canUseWebWindow = () =>
  Platform.OS === "web" &&
  typeof globalThis !== "undefined" &&
  "window" in globalThis;

const openAuthConsentUrl = async (url: string) => {
  if (canUseWebWindow()) {
    const windowRef = (globalThis as any).window;
    const popup = windowRef?.open?.(url, "_blank");
    if (popup) {
      popup.focus?.();
      return;
    }
    windowRef?.location?.assign?.(url);
    return;
  }

  await Linking.openURL(url);
};

const readPersistedSession = async () => {
  if (Platform.OS === "web") {
    if (!canUseWebStorage()) {
      return null;
    }

    try {
      const token = globalThis.localStorage.getItem(SESSION_TOKEN_KEY);
      const expiresAtRaw = globalThis.localStorage.getItem(
        SESSION_EXPIRES_AT_KEY,
      );
      const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : null;
      return token
        ? {
            token,
            expiresAt: normalizeExpiryMs(expiresAt),
          }
        : null;
    } catch {
      return null;
    }
  }

  try {
    const [token, expiresAtRaw] = await Promise.all([
      SecureStore.getItemAsync(SESSION_TOKEN_KEY),
      SecureStore.getItemAsync(SESSION_EXPIRES_AT_KEY),
    ]);
    const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : null;
    return token
      ? {
          token,
          expiresAt: normalizeExpiryMs(expiresAt),
        }
      : null;
  } catch {
    return null;
  }
};

const persistSession = async (token: string, expiresAt: number | null) => {
  if (Platform.OS === "web") {
    if (!canUseWebStorage()) {
      return;
    }

    try {
      globalThis.localStorage.setItem(SESSION_TOKEN_KEY, token);
      if (typeof expiresAt === "number") {
        globalThis.localStorage.setItem(
          SESSION_EXPIRES_AT_KEY,
          String(expiresAt),
        );
      } else {
        globalThis.localStorage.removeItem(SESSION_EXPIRES_AT_KEY);
      }
    } catch {
      // Best effort only; app can run with in-memory session state.
    }
    return;
  }

  try {
    await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
    if (typeof expiresAt === "number") {
      await SecureStore.setItemAsync(SESSION_EXPIRES_AT_KEY, String(expiresAt));
    } else {
      await SecureStore.deleteItemAsync(SESSION_EXPIRES_AT_KEY);
    }
  } catch {
    // Best effort only; app can run with in-memory session state.
  }
};

const clearPersistedSession = async () => {
  if (Platform.OS === "web") {
    if (!canUseWebStorage()) {
      return;
    }

    try {
      globalThis.localStorage.removeItem(SESSION_TOKEN_KEY);
      globalThis.localStorage.removeItem(SESSION_EXPIRES_AT_KEY);
    } catch {
      // Best effort only.
    }
    return;
  }

  try {
    await Promise.all([
      SecureStore.deleteItemAsync(SESSION_TOKEN_KEY),
      SecureStore.deleteItemAsync(SESSION_EXPIRES_AT_KEY),
    ]);
  } catch {
    // Best effort only.
  }
};

const isExpired = (expiresAt: number | null) =>
  typeof expiresAt === "number" && Date.now() >= expiresAt;

export function AuthProvider({ children }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [reauthMessage, setReauthMessage] = useState<string | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const authInFlightRef = useRef(false);

  useEffect(() => {
    sessionTokenRef.current = sessionToken;
  }, [sessionToken]);

  const clearSession = useCallback((message?: string) => {
    setSessionToken(null);
    setSessionExpiresAt(null);
    setStatus("unauthenticated");
    if (message) {
      setReauthMessage(message);
    } else {
      setReauthMessage(null);
    }
    void clearPersistedSession();
  }, []);

  const applySession = useCallback(
    (token: string, expiresAt?: number | null) => {
      const expiresAtMs = normalizeExpiryMs(expiresAt);
      setSessionToken(token);
      setSessionExpiresAt(expiresAtMs);
      setStatus("authenticated");
      setReauthMessage(null);
      void persistSession(token, expiresAtMs);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    const hydrateSession = async () => {
      const persisted = await readPersistedSession();
      if (cancelled) return;

      if (!persisted?.token) {
        setStatus("unauthenticated");
        return;
      }

      if (isExpired(persisted.expiresAt)) {
        await clearPersistedSession();
        if (cancelled) return;
        setSessionToken(null);
        setSessionExpiresAt(null);
        setStatus("unauthenticated");
        setReauthMessage("Your session expired. Please sign in again.");
        return;
      }

      try {
        const isValid = await validateSessionToken(persisted.token);
        if (cancelled) return;

        // Backend remains source of truth, but boot policy requires a fresh token
        // each app launch instead of reusing persisted client state.
        await clearPersistedSession();
        if (cancelled) return;
        setSessionToken(null);
        setSessionExpiresAt(null);
        setStatus("unauthenticated");
        setReauthMessage(
          isValid
            ? "Session verified. Please sign in to refresh your token."
            : "Your session expired. Please sign in again.",
        );
      } catch (error) {
        await clearPersistedSession();
        if (cancelled) return;
        setStatus("unauthenticated");
        setSessionToken(null);
        setSessionExpiresAt(null);
        if (!(error instanceof ApiRequestError) || error.status !== 401) {
          setReauthMessage("Unable to verify your session. Please sign in.");
        }
      }
    };

    void hydrateSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    if (typeof sessionExpiresAt !== "number") {
      return;
    }

    const remainingMs = sessionExpiresAt - Date.now();
    if (remainingMs <= 0) {
      clearSession("Your session expired. Please sign in again.");
      return;
    }

    const timeout = setTimeout(() => {
      clearSession("Your session expired. Please sign in again.");
    }, remainingMs);

    return () => {
      clearTimeout(timeout);
    };
  }, [clearSession, sessionExpiresAt, status]);

  const handleUnauthorized = useCallback(() => {
    clearSession("Your session expired. Please sign in again.");
  }, [clearSession]);

  useEffect(() => {
    configureApiAuth({
      getToken: () => sessionTokenRef.current,
      onUnauthorized: handleUnauthorized,
    });
  }, [handleUnauthorized]);

  const startAuth = useCallback(async (): Promise<boolean> => {
    if (authInFlightRef.current) {
      return false;
    }
    authInFlightRef.current = true;
    setIsAuthenticating(true);
    setReauthMessage(null);

    try {
      const startResponse = await startGoogleAuth();

      if (startResponse.status !== "pending" || !startResponse.auth_id) {
        clearSession("Authentication did not start correctly. Please retry.");
        return false;
      }

      if (!startResponse.auth_url) {
        clearSession("No auth URL returned. Please retry.");
        return false;
      }

      try {
        await openAuthConsentUrl(startResponse.auth_url);
      } catch {
        // Continue polling; user can still complete auth outside this call.
      }

      let authAckSignaled = false;
      let removeMessageListener = () => {};

      if (canUseWebWindow()) {
        const windowRef = (globalThis as any).window;
        const onMessage = (event: any) => {
          const payload = event?.data;
          if (!payload || payload.type !== "auth_ack") {
            return;
          }
          if (
            payload.auth_id !== startResponse.auth_id ||
            payload.provider !== "google"
          ) {
            return;
          }
          authAckSignaled = true;
        };

        windowRef?.addEventListener?.("message", onMessage);
        removeMessageListener = () => {
          windowRef?.removeEventListener?.("message", onMessage);
        };
      }

      try {
        const startedAt = Date.now();
        while (Date.now() - startedAt <= AUTH_ACK_TIMEOUT_MS) {
          if (!authAckSignaled) {
            await sleep(AUTH_ACK_POLL_MS);
          }
          authAckSignaled = false;
          const ack = await getAuthAck(startResponse.auth_id);

          if (ack.status === "pending") {
            continue;
          }

          if (
            ack.status === "success" &&
            ack.acknowledged &&
            ack.session_token
          ) {
            applySession(ack.session_token, ack.session_expires_at ?? null);
            return true;
          }

          if (ack.status === "error") {
            clearSession(
              ack.error ?? "Authentication failed. Please try again.",
            );
            return false;
          }

          clearSession("Authentication response was incomplete. Please retry.");
          return false;
        }

        clearSession("Authentication timed out. Finish sign-in and try again.");
        return false;
      } finally {
        removeMessageListener();
      }
    } catch {
      clearSession("Unable to authenticate right now. Please try again.");
      return false;
    } finally {
      authInFlightRef.current = false;
      setIsAuthenticating(false);
    }
  }, [applySession, clearSession]);

  const signOut = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const clearReauthMessage = useCallback(() => {
    setReauthMessage(null);
  }, []);

  const value = useMemo(
    () => ({
      status,
      sessionToken,
      sessionExpiresAt,
      isAuthenticating,
      reauthMessage,
      startAuth,
      signOut,
      clearReauthMessage,
    }),
    [
      status,
      sessionToken,
      sessionExpiresAt,
      isAuthenticating,
      reauthMessage,
      startAuth,
      signOut,
      clearReauthMessage,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
