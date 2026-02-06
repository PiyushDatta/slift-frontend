import React, { useMemo } from "react";
import { Text, View, Pressable } from "react-native";
import Slider from "@react-native-community/slider";

import { useSettings } from "../context/SettingsContext";
import { createSettingsPanelStyles } from "../styles/SettingsPanelStyles";
import { theme } from "../styles/theme";

const SIZE_OPTIONS = ["small", "medium", "large"] as const;

export function SettingsSizeSelector() {
  const { size, setSize, elasticity, setElasticity } = useSettings();
  const styles = useMemo(createSettingsPanelStyles, [size]);

  const elasticityLabel =
    elasticity >= 0.4 ? "soft" : elasticity <= 0.25 ? "firm" : "medium";

  return (
    <View style={styles.section}>
      <Text style={styles.subtitle}>UI Size</Text>
      <View style={styles.row}>
        {SIZE_OPTIONS.map((option) => {
          const isActive = option === size;
          return (
            <Pressable
              key={option}
              style={({ pressed }) => [
                styles.pill,
                isActive && styles.pillActive,
                pressed ? { opacity: 0.85 } : null,
              ]}
              onPress={() => setSize(option)}
            >
              <Text
                style={[styles.pillText, isActive && styles.pillTextActive]}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.subtitle}>Drag Elasticity</Text>
      <View style={styles.sliderRow}>
        <Text style={styles.sliderLabel}>Firm</Text>
        <Slider
          style={styles.slider}
          minimumValue={0.2}
          maximumValue={0.5}
          step={0.05}
          value={elasticity}
          minimumTrackTintColor={theme.colors.accentBlue}
          maximumTrackTintColor={theme.colors.borderSoft}
          thumbTintColor={theme.colors.accentBlue}
          onValueChange={(value) => setElasticity(value)}
        />
        <Text style={styles.sliderLabel}>Soft</Text>
      </View>
      <Text style={styles.sliderValue}>{elasticityLabel}</Text>
    </View>
  );
}
