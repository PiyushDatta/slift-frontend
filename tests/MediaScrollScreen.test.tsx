import React from "react";
import { beforeEach, describe, expect, it } from "bun:test";

import { renderWithProviders } from "./utils/renderWithProviders";
import { MediaScrollScreen } from "../src/screens/MediaScrollScreen";

describe("MediaScrollScreen", () => {
  beforeEach(() => {
    (globalThis as any).__ROUTE_PARAMS__ = undefined;
  });

  it("defaults to For you and shows blended posts", async () => {
    const initialNodesData = {
      nodes: [
        {
          id: "ai",
          label: "AI",
          x: 0,
          y: 0,
          size: 60,
          tone: "primary" as const,
          posts: [{ id: "p1", content: "from ai", timestamp: 1 }],
        },
        {
          id: "crypto",
          label: "Crypto",
          x: 100,
          y: 40,
          size: 56,
          tone: "secondary" as const,
          posts: [{ id: "p2", content: "from crypto", timestamp: 2 }],
        },
      ],
      edges: [],
    };

    const { findByText } = renderWithProviders(<MediaScrollScreen />, {
      initialNodesData,
    });

    expect(await findByText("For you")).toBeTruthy();
    expect(await findByText("from ai")).toBeTruthy();
    expect(await findByText("from crypto")).toBeTruthy();
  });

  it("renders For you label when route nodeId is for_you", async () => {
    (globalThis as any).__ROUTE_PARAMS__ = { nodeId: "for_you" };

    const initialNodesData = {
      nodes: [
        {
          id: "for_you",
          label: "For you",
          x: 0,
          y: 0,
          size: 80,
          tone: "primary" as const,
          posts: [{ id: "p1", content: "from for you", timestamp: 1 }],
        },
      ],
      edges: [],
    };

    const { findByText } = renderWithProviders(<MediaScrollScreen />, {
      initialNodesData,
    });

    expect(await findByText("For you")).toBeTruthy();
    expect(await findByText("from for you")).toBeTruthy();
  });
});
