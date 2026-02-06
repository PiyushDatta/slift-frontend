// Env parsing is intentionally strict: only "true" enables the flag.
const readEnvFlag = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) {
    return fallback;
  }

  return value.toLowerCase() === "true";
};

export const computeFeatures = (
  env: Record<string, string | undefined> = process.env,
) =>
  ({
    enableTabs: readEnvFlag(env.EXPO_PUBLIC_FEATURE_TABS, false),
    enableMediaScreen: readEnvFlag(env.EXPO_PUBLIC_FEATURE_MEDIA_SCREEN, false),
    enableProfileScreen: readEnvFlag(
      env.EXPO_PUBLIC_FEATURE_PROFILE_SCREEN,
      false,
    ),
  }) as const;

export const features = computeFeatures();
