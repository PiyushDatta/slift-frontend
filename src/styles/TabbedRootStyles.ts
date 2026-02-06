import { StyleSheet } from "react-native";

import { uiTokens } from "../config/uiSettings";
import { theme } from "./theme";

export const createTabbedRootStyles = () =>
  StyleSheet.create({
    tabBarContainer: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: uiTokens.spacing(20),
    },
    tabBarContent: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "center",
      gap: uiTokens.spacing(8),
      alignSelf: "center",
    },
    tabItem: {
      minWidth: uiTokens.spacing(72),
      paddingVertical: uiTokens.spacing(2),
      justifyContent: "center",
      alignItems: "center",
    },
    tabItemPressed: {
      opacity: 0.82,
    },
    iconAnchor: {
      width: uiTokens.spacing(64),
      height: uiTokens.spacing(64),
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    iconGlow: {
      position: "absolute",
      width: uiTokens.spacing(62),
      height: uiTokens.spacing(62),
      borderRadius: uiTokens.radius(31),
      backgroundColor: "rgba(246, 173, 27, 0.16)",
      borderWidth: 1,
      borderColor: "rgba(246, 173, 27, 0.32)",
    },
    iconWrap: {
      width: uiTokens.spacing(52),
      height: uiTokens.spacing(52),
      borderRadius: uiTokens.radius(26),
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: "rgba(15, 19, 25, 0.9)",
      shadowColor: "#070d16",
      shadowRadius: uiTokens.spacing(14),
      shadowOpacity: 0.36,
      shadowOffset: { width: 0, height: uiTokens.spacing(8) },
      elevation: uiTokens.spacing(6),
    },
    iconWrapActive: {
      borderColor: "rgba(246, 173, 27, 0.62)",
      backgroundColor: "rgba(246, 173, 27, 0.2)",
      shadowColor: "#f6ad1b",
      shadowOpacity: 0.34,
      shadowRadius: uiTokens.spacing(16),
      shadowOffset: { width: 0, height: uiTokens.spacing(8) },
      elevation: uiTokens.spacing(8),
    },
  });
