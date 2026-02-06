import React from "react";
import { describe, expect, it } from "bun:test";

import { renderWithProviders } from "./utils/renderWithProviders";

const sampleGraph = {
  nodes: [
    {
      id: "design",
      label: "Design",
      x: 0,
      y: 0,
      size: 80,
      tone: "primary" as const,
    },
    {
      id: "frontend",
      label: "Frontend",
      x: 120,
      y: -80,
      size: 70,
      tone: "accent" as const,
    },
  ],
  edges: [],
};

import { KnowledgeGraphScreen } from "../src/screens/KnowledgeGraphScreen";

describe("KnowledgeGraphScreen", () => {
  it("renders nodes and header", () => {
    const { getByText } = renderWithProviders(<KnowledgeGraphScreen />, {
      initialNodesData: sampleGraph,
    });

    expect(getByText("Slift")).toBeTruthy();
    expect(getByText("Design")).toBeTruthy();
    expect(getByText("Frontend")).toBeTruthy();
  });
});
