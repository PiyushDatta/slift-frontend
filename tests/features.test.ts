import { describe, expect, it } from "bun:test";
import { computeFeatures } from "../src/config/features";

describe("features", () => {
  it("defaults to false when env is missing", () => {
    const features = computeFeatures({});

    expect(features.enableTabs).toBe(false);
    expect(features.enableMediaScreen).toBe(false);
    expect(features.enableProfileScreen).toBe(false);
  });

  it("enables flags when env is true", () => {
    const features = computeFeatures({
      EXPO_PUBLIC_FEATURE_TABS: "true",
      EXPO_PUBLIC_FEATURE_MEDIA_SCREEN: "true",
      EXPO_PUBLIC_FEATURE_PROFILE_SCREEN: "true",
    });

    expect(features.enableTabs).toBe(true);
    expect(features.enableMediaScreen).toBe(true);
    expect(features.enableProfileScreen).toBe(true);
  });

  it("treats non-true values as false", () => {
    const features = computeFeatures({
      EXPO_PUBLIC_FEATURE_TABS: "false",
      EXPO_PUBLIC_FEATURE_MEDIA_SCREEN: "no",
      EXPO_PUBLIC_FEATURE_PROFILE_SCREEN: "1",
    });

    expect(features.enableTabs).toBe(false);
    expect(features.enableMediaScreen).toBe(false);
    expect(features.enableProfileScreen).toBe(false);
  });
});
