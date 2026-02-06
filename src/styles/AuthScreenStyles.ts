import { StyleSheet } from "react-native";

import { uiTokens } from "../config/uiSettings";
import { theme } from "./theme";

export const createAuthScreenStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.appBase,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: uiTokens.spacing(20),
    },
    card: {
      width: "100%",
      maxWidth: 460,
      borderRadius: uiTokens.radius(22),
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: "rgba(17, 23, 33, 0.94)",
      paddingHorizontal: uiTokens.spacing(20),
      paddingVertical: uiTokens.spacing(22),
      gap: uiTokens.spacing(14),
      shadowColor: "#060b12",
      shadowOpacity: 0.38,
      shadowRadius: uiTokens.spacing(18),
      shadowOffset: { width: 0, height: uiTokens.spacing(8) },
      elevation: uiTokens.spacing(8),
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: uiTokens.font(34),
      lineHeight: uiTokens.font(38),
      fontWeight: "700",
      fontFamily: theme.fontFamilyDisplay,
    },
    subtitle: {
      color: theme.colors.textMuted,
      fontSize: uiTokens.font(16),
      lineHeight: uiTokens.font(22),
      fontFamily: theme.fontFamilyBody,
    },
    notice: {
      borderRadius: uiTokens.radius(14),
      borderWidth: 1,
      borderColor: "rgba(246, 173, 27, 0.35)",
      backgroundColor: "rgba(246, 173, 27, 0.14)",
      paddingHorizontal: uiTokens.spacing(12),
      paddingVertical: uiTokens.spacing(10),
    },
    noticeText: {
      color: theme.colors.accentAmber,
      fontSize: uiTokens.font(13),
      lineHeight: uiTokens.font(18),
      fontFamily: theme.fontFamilyBody,
      fontWeight: "600",
    },
    actionRow: {
      gap: uiTokens.spacing(10),
      marginTop: uiTokens.spacing(2),
    },
    actionButton: {
      borderRadius: uiTokens.radius(14),
      borderWidth: 1,
      borderColor: "rgba(143, 176, 219, 0.35)",
      backgroundColor: "rgba(143, 176, 219, 0.16)",
      paddingVertical: uiTokens.spacing(12),
      alignItems: "center",
      justifyContent: "center",
    },
    actionButtonAlt: {
      borderColor: theme.colors.borderSoft,
      backgroundColor: "rgba(24, 31, 42, 0.9)",
    },
    actionButtonDisabled: {
      opacity: 0.66,
    },
    actionText: {
      color: theme.colors.textPrimary,
      fontSize: uiTokens.font(16),
      fontWeight: "700",
      fontFamily: theme.fontFamilyDisplay,
    },
    helperText: {
      color: theme.colors.textSoft,
      fontSize: uiTokens.font(12),
      lineHeight: uiTokens.font(17),
      fontFamily: theme.fontFamilyBody,
    },
    checkingWrap: {
      alignItems: "center",
      gap: uiTokens.spacing(12),
      paddingVertical: uiTokens.spacing(16),
    },
    checkingText: {
      color: theme.colors.textMuted,
      fontSize: uiTokens.font(14),
      fontFamily: theme.fontFamilyBody,
    },
  });
