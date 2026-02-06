import { StyleSheet } from "react-native";

import { uiTokens } from "../config/uiSettings";
import { theme } from "./theme";

export const createSyncTwitterGateStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: uiTokens.spacing(24),
      backgroundColor: "rgba(10, 14, 21, 0.22)",
    },
    blurLayer: {
      ...StyleSheet.absoluteFillObject,
    },
    card: {
      width: "100%",
      maxWidth: 420,
      borderRadius: uiTokens.radius(20),
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: "rgba(15, 20, 28, 0.82)",
      paddingHorizontal: uiTokens.spacing(18),
      paddingVertical: uiTokens.spacing(20),
      gap: uiTokens.spacing(12),
      alignItems: "center",
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: uiTokens.font(22),
      lineHeight: uiTokens.font(26),
      fontWeight: "700",
      fontFamily: theme.fontFamilyDisplay,
      textAlign: "center",
    },
    subtitle: {
      color: theme.colors.textMuted,
      fontSize: uiTokens.font(14),
      lineHeight: uiTokens.font(20),
      fontFamily: theme.fontFamilyBody,
      textAlign: "center",
    },
    actionButton: {
      width: "100%",
      borderRadius: uiTokens.radius(14),
      borderWidth: 1,
      borderColor: "rgba(246, 173, 27, 0.4)",
      backgroundColor: theme.colors.accentAmber,
      paddingVertical: uiTokens.spacing(11),
      alignItems: "center",
      justifyContent: "center",
    },
    actionButtonDisabled: {
      opacity: 0.7,
    },
    actionButtonText: {
      color: "#1a1310",
      fontSize: uiTokens.font(16),
      lineHeight: uiTokens.font(20),
      fontWeight: "700",
      fontFamily: theme.fontFamilyDisplay,
    },
    loadingWrap: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: uiTokens.spacing(8),
      paddingVertical: uiTokens.spacing(6),
    },
    loadingText: {
      color: theme.colors.textPrimary,
      fontSize: uiTokens.font(14),
      lineHeight: uiTokens.font(18),
      fontFamily: theme.fontFamilyBody,
      fontWeight: "600",
    },
    errorText: {
      color: theme.colors.accentAmber,
      fontSize: uiTokens.font(12),
      lineHeight: uiTokens.font(17),
      fontFamily: theme.fontFamilyBody,
      textAlign: "center",
    },
  });
