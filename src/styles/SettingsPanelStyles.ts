import { StyleSheet } from "react-native";

import { uiTokens } from "../config/uiSettings";
import { theme } from "./theme";

export const createSettingsPanelStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.appBase,
    },
    scrollContent: {
      gap: uiTokens.spacing(16),
      paddingHorizontal: uiTokens.spacing(18),
      paddingTop: uiTokens.spacing(10),
      paddingBottom: uiTokens.spacing(104),
    },
    hero: {
      position: "relative",
      gap: uiTokens.spacing(6),
      paddingHorizontal: uiTokens.spacing(16),
      paddingVertical: uiTokens.spacing(14),
      borderRadius: uiTokens.radius(20),
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: theme.colors.overlayDark,
      overflow: "hidden",
      shadowColor: "#95abcb",
      shadowOpacity: 0.2,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    heroGlow: {
      position: "absolute",
      width: 200,
      height: 74,
      top: -28,
      right: -26,
      borderRadius: uiTokens.radius(999),
      backgroundColor: "rgba(110, 168, 255, 0.18)",
      transform: [{ rotate: "8deg" }],
    },
    title: {
      fontSize: uiTokens.font(24),
      fontWeight: "700",
      color: theme.colors.textPrimary,
      fontFamily: theme.fontFamilyDisplay,
    },
    subtitle: {
      color: theme.colors.textMuted,
      fontSize: uiTokens.font(15),
      fontFamily: theme.fontFamilyBody,
      lineHeight: uiTokens.font(20),
    },
    sectionCard: {
      gap: uiTokens.spacing(12),
      padding: uiTokens.spacing(16),
      borderRadius: uiTokens.radius(18),
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: theme.colors.overlayDark,
      shadowColor: "#97add0",
      shadowOpacity: 0.18,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
      elevation: 4,
    },
    section: {
      gap: uiTokens.spacing(12),
    },
    sliderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: uiTokens.spacing(8),
    },
    slider: {
      flex: 1,
      height: uiTokens.spacing(24),
    },
    sliderLabel: {
      fontSize: uiTokens.font(12),
      color: theme.colors.textMuted,
      fontWeight: "600",
      fontFamily: theme.fontFamilyBody,
    },
    sliderValue: {
      fontSize: uiTokens.font(12),
      color: theme.colors.textPrimary,
      fontWeight: "700",
      textTransform: "uppercase",
      fontFamily: theme.fontFamilyBody,
    },
    row: {
      flexDirection: "row",
      gap: uiTokens.spacing(12),
      flexWrap: "wrap",
    },
    pill: {
      backgroundColor: "rgba(17, 24, 35, 0.66)",
      borderRadius: uiTokens.radius(999),
      paddingHorizontal: uiTokens.spacing(14),
      paddingVertical: uiTokens.spacing(8),
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
    },
    pillActive: {
      backgroundColor: theme.colors.accentAmber,
      borderColor: "rgba(221, 232, 250, 0.42)",
    },
    pillText: {
      color: theme.colors.textPrimary,
      fontSize: uiTokens.font(14),
      textTransform: "capitalize",
      fontFamily: theme.fontFamilyBody,
      fontWeight: "600",
    },
    pillTextActive: {
      color: "#11171f",
    },
  });
