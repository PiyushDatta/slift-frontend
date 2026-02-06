import { Platform } from "react-native";

const fontFamilyDisplay = Platform.select({
  ios: "Avenir Next",
  android: "sans-serif",
  web: '"Avenir Next", "Trebuchet MS", "Segoe UI", sans-serif',
  default: "sans-serif",
});

const fontFamilyBody = Platform.select({
  ios: "Avenir Next",
  android: "sans-serif-medium",
  web: '"Avenir Next", "Trebuchet MS", "Segoe UI", sans-serif',
  default: "sans-serif",
});

export const theme = {
  fontFamilyDisplay,
  fontFamilyBody,
  colors: {
    appBase: "#0f1319",
    appBaseSoft: "#171d26",
    surface: "#151c26",
    surfaceRaised: "#1b232f",
    surfaceMuted: "#202a36",
    borderSoft: "rgba(255, 255, 255, 0.08)",
    borderStrong: "rgba(255, 255, 255, 0.16)",
    textPrimary: "#f4f7fd",
    textMuted: "rgba(196, 208, 230, 0.72)",
    textSoft: "rgba(196, 208, 230, 0.52)",
    accentBlue: "#8fb0db",
    accentBlueSoft: "rgba(143, 176, 219, 0.2)",
    accentAmber: "#f6ad1b",
    accentAmberSoft: "rgba(246, 173, 27, 0.2)",
    accentMint: "#4adf7e",
    overlayDark: "rgba(18, 24, 32, 0.88)",
  },
} as const;
