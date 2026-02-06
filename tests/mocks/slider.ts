import { mock } from "bun:test";

mock.module("@react-native-community/slider", () => {
  const React = require("react");
  const Slider = ({ onValueChange, value, ...props }: any) =>
    React.createElement("Slider", { onValueChange, value, ...props });
  return { __esModule: true, default: Slider };
});
