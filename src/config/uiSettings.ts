import { Platform } from "react-native";

export type UiSize = "small" | "medium" | "large";

type SizeScale = {
  font: number;
  spacing: number;
  radius: number;
};

const SIZE_SCALE: Record<UiSize, SizeScale> = {
  small: { font: 0.9, spacing: 0.9, radius: 0.9 },
  medium: { font: 1, spacing: 1, radius: 1 },
  large: { font: 1.1, spacing: 1.1, radius: 1.1 },
};

const PLATFORM_SCALE = Platform.select({
  ios: 1,
  android: 1,
  web: 1,
  default: 1,
});

export const uiSettings = {
  size: "medium" as UiSize,
  elasticity: 0.3,
  platformScale: PLATFORM_SCALE,
};

const round = (value: number) => Math.round(value);

export const uiTokens = {
  font: (value: number) => {
    const base = SIZE_SCALE[uiSettings.size];
    const scale = base.font * uiSettings.platformScale;
    return round(value * scale);
  },
  spacing: (value: number) => {
    const base = SIZE_SCALE[uiSettings.size];
    return round(value * base.spacing);
  },
  radius: (value: number) => {
    const base = SIZE_SCALE[uiSettings.size];
    return round(value * base.radius);
  },
};
