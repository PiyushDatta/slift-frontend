import { describe, expect, it, mock } from "bun:test";
import React, { useEffect } from "react";
import { act, render, waitFor } from "@testing-library/react-native";

import type { NodesAndPostsResponse } from "../src/api";
import {
  MAX_POSTS_PER_NODE,
  MIN_POSTS_PER_NODE,
} from "../src/config/dataLimits";

let nextResponses: NodesAndPostsResponse[] = [];

mock.module("../src/api", () => ({
  getNodesAndPosts: async () =>
    nextResponses.shift() ?? { nodes: [], edges: [] },
}));

import {
  NodesDataProvider,
  useNodesData,
} from "../src/context/NodesDataContext";

const Probe = ({ onUpdate }: { onUpdate: (value: any) => void }) => {
  const value = useNodesData();
  useEffect(() => {
    onUpdate(value);
  }, [value, onUpdate]);
  return null;
};

describe("NodesDataContext", () => {
  it("merges nodes and posts without dropping existing nodes", async () => {
    nextResponses = [
      {
        nodes: [
          {
            id: "a",
            label: "Alpha",
            x: 0,
            y: 0,
            size: 60,
            tone: "primary",
            posts: [{ id: "1", content: "old", timestamp: 1000 }],
          },
          {
            id: "b",
            label: "Beta",
            x: 50,
            y: 40,
            size: 55,
            tone: "secondary",
            posts: [{ id: "2", content: "beta", timestamp: 900 }],
          },
        ],
        edges: [{ from: "a", to: "b", strength: 1 }],
      },
      {
        nodes: [
          {
            id: "a",
            label: "Alpha",
            x: 10,
            y: 10,
            size: 60,
            tone: "primary",
            posts: [
              { id: "3", content: "new", timestamp: 2000 },
              { id: "1", content: "old", timestamp: 1000 },
            ],
          },
          {
            id: "c",
            label: "Gamma",
            x: -20,
            y: 30,
            size: 52,
            tone: "accent",
            posts: [{ id: "4", content: "gamma", timestamp: 1500 }],
          },
        ],
        edges: [{ from: "a", to: "c", strength: 2 }],
      },
    ];

    let latest: any;

    render(
      <NodesDataProvider disableAutoLoad>
        <Probe onUpdate={(value) => (latest = value)} />
      </NodesDataProvider>,
    );

    await waitFor(() => expect(latest).toBeTruthy());

    await act(async () => {
      await latest.refreshNodes();
    });
    await act(async () => {
      await latest.refreshNodes();
    });

    await waitFor(() => expect(latest.data?.nodes?.length).toBe(4));

    const nodeA = latest.data.nodes.find((node: any) => node.id === "a");
    const nodeB = latest.data.nodes.find((node: any) => node.id === "b");
    const nodeC = latest.data.nodes.find((node: any) => node.id === "c");
    const forYouNode = latest.data.nodes.find(
      (node: any) => node.id === "for_you",
    );

    expect(nodeA.posts.map((post: any) => post.id)).toEqual(["3", "1"]);
    expect(nodeB.posts.map((post: any) => post.id)).toEqual(["2"]);
    expect(nodeC.posts.map((post: any) => post.id)).toEqual(["4"]);
    expect(forYouNode.posts.map((post: any) => post.id)).toEqual([
      "3",
      "4",
      "1",
      "2",
    ]);
    expect(latest.data.edges.length).toBe(2);
  });

  it("caps posts to 100 and keeps the newest ones", async () => {
    const makePosts = (start: number, end: number) =>
      Array.from({ length: end - start + 1 }, (_, index) => {
        const value = start + index;
        return { id: `${value}`, timestamp: value };
      });

    nextResponses = [
      {
        nodes: [
          {
            id: "alpha",
            label: "Alpha",
            x: 0,
            y: 0,
            size: 60,
            tone: "primary",
            posts: makePosts(1, 80),
          },
        ],
        edges: [],
      },
      {
        nodes: [
          {
            id: "alpha",
            label: "Alpha",
            x: 0,
            y: 0,
            size: 60,
            tone: "primary",
            posts: makePosts(81, 150),
          },
        ],
        edges: [],
      },
    ];

    let latest: any;

    render(
      <NodesDataProvider disableAutoLoad>
        <Probe onUpdate={(value) => (latest = value)} />
      </NodesDataProvider>,
    );

    await waitFor(() => expect(latest).toBeTruthy());

    await act(async () => {
      await latest.refreshNodes();
    });
    await act(async () => {
      await latest.refreshNodes();
    });

    await waitFor(() => expect(latest.data?.nodes?.length).toBe(2));

    const node = latest.data.nodes.find((entry: any) => entry.id === "alpha");
    expect(node.posts.length).toBe(100);
    expect(node.posts[0].id).toBe("150");
    expect(node.posts[node.posts.length - 1].id).toBe("51");
  });

  it("limits topic nodes to 30 and keeps for_you separate", async () => {
    const topicNodes = Array.from({ length: 35 }, (_, index) => ({
      id: `topic-${index + 1}`,
      label: `Topic ${index + 1}`,
      x: index * 10,
      y: index * 5,
      size: 60,
      tone: "primary" as const,
      posts: [{ id: `p-${index + 1}`, timestamp: index + 1 }],
    }));
    const topicEdges = Array.from({ length: 34 }, (_, index) => ({
      from: `topic-${index + 1}`,
      to: `topic-${index + 2}`,
      strength: 1 as const,
    }));

    nextResponses = [
      {
        nodes: topicNodes,
        edges: topicEdges,
      },
    ];

    let latest: any;

    render(
      <NodesDataProvider disableAutoLoad>
        <Probe onUpdate={(value) => (latest = value)} />
      </NodesDataProvider>,
    );

    await waitFor(() => expect(latest).toBeTruthy());

    await act(async () => {
      await latest.refreshNodes();
    });

    await waitFor(() => expect(latest.data?.nodes?.length).toBe(31));

    const topicCount = latest.data.nodes.filter(
      (node: any) => node.id !== "for_you",
    ).length;
    const forYou = latest.data.nodes.find((node: any) => node.id === "for_you");

    expect(topicCount).toBe(30);
    expect(forYou).toBeTruthy();
    expect(forYou.posts.length).toBeGreaterThanOrEqual(MIN_POSTS_PER_NODE);
    expect(forYou.posts.length).toBeLessThanOrEqual(MAX_POSTS_PER_NODE);
  });

  it("treats & and and as the same node id", async () => {
    nextResponses = [
      {
        nodes: [
          {
            id: "business & finance",
            label: "Business & Finance",
            x: 0,
            y: 0,
            size: 60,
            tone: "primary",
            posts: [{ id: "1", content: "older", timestamp: 1000 }],
          },
          {
            id: "design",
            label: "Design",
            x: 50,
            y: 0,
            size: 50,
            tone: "secondary",
            posts: [],
          },
        ],
        edges: [{ from: "business & finance", to: "design", strength: 1 }],
      },
      {
        nodes: [
          {
            id: "business and finance",
            label: "Business and Finance",
            x: 10,
            y: 10,
            size: 60,
            tone: "primary",
            posts: [{ id: "2", content: "newer", timestamp: 2000 }],
          },
        ],
        edges: [{ from: "business and finance", to: "design", strength: 1 }],
      },
    ];

    let latest: any;

    render(
      <NodesDataProvider disableAutoLoad>
        <Probe onUpdate={(value) => (latest = value)} />
      </NodesDataProvider>,
    );

    await waitFor(() => expect(latest).toBeTruthy());

    await act(async () => {
      await latest.refreshNodes();
    });
    await act(async () => {
      await latest.refreshNodes();
    });

    await waitFor(() => expect(latest.data?.nodes?.length).toBe(3));

    const node = latest.data.nodes.find(
      (entry: any) => entry.id === "business and finance",
    );
    const forYouNode = latest.data.nodes.find(
      (entry: any) => entry.id === "for_you",
    );

    expect(node).toBeTruthy();
    expect(node.posts.map((post: any) => post.id)).toEqual(["2", "1"]);
    expect(forYouNode).toBeTruthy();
    expect(forYouNode.posts.map((post: any) => post.id)).toEqual(["2", "1"]);
    expect(latest.data.edges[0].from).toBe("business and finance");
  });
});
