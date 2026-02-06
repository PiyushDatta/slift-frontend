import React from "react";
import { StyleSheet, View } from "react-native";
import { theme } from "../styles/theme";

export function AppBackground() {
  return (
    <View pointerEvents="none" style={styles.background}>
      <View style={styles.baseTint} />
      <View style={styles.softWash} />
      <View style={[styles.ambientOrb, styles.ambientOrbA]} />
      <View style={[styles.ambientOrb, styles.ambientOrbB]} />
      <View style={[styles.ambientOrb, styles.ambientOrbC]} />
      <View style={styles.diagonalRibbon} />
      <View style={styles.diagonalRibbonSecondary} />
      <View style={styles.backgroundGrid} />
      <View style={styles.edgeVignette} />
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  baseTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.appBase,
  },
  softWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.22)",
  },
  ambientOrb: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.88,
  },
  ambientOrbA: {
    width: 520,
    height: 520,
    backgroundColor: "rgba(143, 176, 219, 0.2)",
    top: -250,
    left: -220,
    transform: [{ rotate: "-11deg" }],
  },
  ambientOrbB: {
    width: 560,
    height: 560,
    backgroundColor: "rgba(74, 223, 126, 0.12)",
    bottom: -320,
    right: -240,
    transform: [{ rotate: "14deg" }],
  },
  ambientOrbC: {
    position: "absolute",
    width: 420,
    height: 420,
    backgroundColor: "rgba(246, 173, 27, 0.16)",
    bottom: -110,
    left: -180,
  },
  diagonalRibbon: {
    position: "absolute",
    width: "120%",
    height: 190,
    left: "-10%",
    top: 88,
    backgroundColor: "rgba(143, 176, 219, 0.08)",
    transform: [{ rotate: "-4deg" }],
  },
  diagonalRibbonSecondary: {
    position: "absolute",
    width: "120%",
    height: 180,
    left: "-6%",
    top: "42%",
    backgroundColor: "rgba(0, 0, 0, 0.18)",
    transform: [{ rotate: "-5deg" }],
  },
  backgroundGrid: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0.2,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  edgeVignette: {
    ...StyleSheet.absoluteFillObject,
    borderColor: "rgba(0, 0, 0, 0.45)",
    borderWidth: 1,
    shadowColor: "#000000",
    shadowRadius: 26,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 0 },
  },
});
