export const FOR_YOU_NODE_ID = "for_you";
export const FOR_YOU_NODE_LABEL = "For you";

export const normalizeNodeKey = (value: string) =>
  value.toLowerCase().replace(/&/g, "and").replace(/\s+/g, " ").trim();

const normalizeForYouMatchKey = (value: string) =>
  normalizeNodeKey(value).replace(/[_-]+/g, " ");

export const isForYouNodeId = (value: string) =>
  normalizeForYouMatchKey(value) === "for you";
