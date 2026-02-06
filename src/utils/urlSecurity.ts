const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

const DEFAULT_AUTH_HOST_PATTERNS = [
  "accounts.google.com",
  "twitter.com",
  "x.com",
  "api.twitter.com",
  "oauth.twitter.com",
  "localhost",
  "127.0.0.1",
  "::1",
];

const normalizeBaseUrl = (value: string) => value.replace(/\/$/, "");

const parseUrl = (value: string): URL | null => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const readApiBaseUrl = () =>
  normalizeBaseUrl(
    process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL,
  );

const getApiBaseUrlObject = () => parseUrl(readApiBaseUrl());

const isLocalHost = (hostname: string) => {
  const normalized = hostname.trim().toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "[::1]"
  );
};

const isWebRuntime = () =>
  typeof globalThis !== "undefined" &&
  typeof (globalThis as { window?: unknown }).window !== "undefined";

const readWindowLocation = () => {
  if (!isWebRuntime()) return null;
  const maybeWindow = globalThis as typeof globalThis & {
    window?: {
      location?: {
        origin?: string;
        hostname?: string;
      };
    };
  };
  return maybeWindow.window?.location ?? null;
};

const readWindowOrigin = () => {
  const origin = readWindowLocation()?.origin;
  return typeof origin === "string" ? origin : null;
};

const readWindowHost = () => {
  const host = readWindowLocation()?.hostname;
  return typeof host === "string" ? host.toLowerCase() : null;
};

const normalizeHostPattern = (value: string) => value.trim().toLowerCase();

const hostMatchesPattern = (hostname: string, pattern: string) => {
  if (pattern.startsWith("*.")) {
    const suffix = pattern.slice(2);
    return hostname === suffix || hostname.endsWith(`.${suffix}`);
  }
  return hostname === pattern;
};

const readAuthHostPatterns = () => {
  const patterns = new Set<string>(
    DEFAULT_AUTH_HOST_PATTERNS.map(normalizeHostPattern),
  );
  const apiBase = getApiBaseUrlObject();
  if (apiBase?.hostname) {
    patterns.add(apiBase.hostname.toLowerCase());
  }
  const webHost = readWindowHost();
  if (webHost) {
    patterns.add(webHost);
  }
  return Array.from(patterns.values());
};

const hasSafeProtocol = (url: URL) =>
  url.protocol === "https:" ||
  (url.protocol === "http:" && isLocalHost(url.hostname));

const resolveCandidateUrl = (value: string): URL | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const direct = parseUrl(trimmed);
  if (direct) return direct;

  const apiBase = getApiBaseUrlObject();
  if (!apiBase) return null;

  try {
    return new URL(trimmed, apiBase);
  } catch {
    return null;
  }
};

const isAllowedHost = (hostname: string) => {
  const normalizedHost = hostname.toLowerCase();
  return readAuthHostPatterns().some((pattern) =>
    hostMatchesPattern(normalizedHost, pattern),
  );
};

export const getApiBaseUrl = () => readApiBaseUrl();

export const assertSafeApiBaseUrlForWeb = () => {
  if (!isWebRuntime()) {
    return;
  }

  const apiBase = getApiBaseUrlObject();
  if (!apiBase) {
    throw new Error(
      "Invalid EXPO_PUBLIC_API_BASE_URL. Provide an absolute HTTP(S) URL.",
    );
  }

  if (apiBase.protocol === "http:" && !isLocalHost(apiBase.hostname)) {
    throw new Error(
      "Insecure EXPO_PUBLIC_API_BASE_URL on web. Use HTTPS for non-local hosts.",
    );
  }

  const webOrigin = readWindowOrigin();
  if (
    typeof webOrigin === "string" &&
    webOrigin.startsWith("https://") &&
    apiBase.protocol !== "https:" &&
    !isLocalHost(apiBase.hostname)
  ) {
    throw new Error(
      "Web app loaded over HTTPS cannot call a non-HTTPS API base URL.",
    );
  }
};

export const toTrustedAuthUrl = (value: string): string | null => {
  const parsed = resolveCandidateUrl(value);
  if (!parsed) return null;
  if (!hasSafeProtocol(parsed)) return null;
  if (!isAllowedHost(parsed.hostname)) return null;
  return parsed.toString();
};

export const isTrustedAuthOrigin = (
  origin: string,
  authUrl?: string | null,
) => {
  const parsedOrigin = parseUrl(origin);
  if (!parsedOrigin) return false;
  if (!hasSafeProtocol(parsedOrigin)) return false;

  const trustedOrigins = new Set<string>();
  const webOrigin = readWindowOrigin();
  if (webOrigin) {
    trustedOrigins.add(webOrigin);
  }
  const apiBase = getApiBaseUrlObject();
  if (apiBase) {
    trustedOrigins.add(apiBase.origin);
  }
  if (authUrl) {
    const trustedAuthUrl = toTrustedAuthUrl(authUrl);
    if (trustedAuthUrl) {
      const parsedAuthUrl = parseUrl(trustedAuthUrl);
      if (parsedAuthUrl) {
        trustedOrigins.add(parsedAuthUrl.origin);
      }
    }
  }

  if (trustedOrigins.has(parsedOrigin.origin)) {
    return true;
  }

  return isAllowedHost(parsedOrigin.hostname);
};
