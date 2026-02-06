import React from "react";
import { describe, expect, it } from "bun:test";
import { render, fireEvent } from "@testing-library/react-native";

import { SettingsProvider, useSettings } from "../src/context/SettingsContext";
import { uiSettings } from "../src/config/uiSettings";

const SettingsProbe = () => {
  const { size, setSize, elasticity, setElasticity } = useSettings();
  return (
    <>
      <TextNode label={`size:${size}`} />
      <TextNode label={`elasticity:${elasticity}`} />
      <Press label="set-large" onPress={() => setSize("large")} />
      <Press label="set-soft" onPress={() => setElasticity(0.45)} />
    </>
  );
};

import { Pressable, Text } from "react-native";

const TextNode = ({ label }: { label: string }) => <Text>{label}</Text>;

const Press = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable accessibilityLabel={label} onPress={onPress} />
);

describe("SettingsContext", () => {
  it("provides default size and updates", () => {
    const { getByLabelText, getByText } = render(
      <SettingsProvider initialSize="small">
        <SettingsProbe />
      </SettingsProvider>,
    );

    expect(getByText("size:small")).toBeTruthy();

    fireEvent.press(getByLabelText("set-large"));

    expect(getByText("size:large")).toBeTruthy();
    expect(uiSettings.size).toBe("large");

    fireEvent.press(getByLabelText("set-soft"));

    expect(getByText("elasticity:0.45")).toBeTruthy();
    expect(uiSettings.elasticity).toBe(0.45);
  });
});
