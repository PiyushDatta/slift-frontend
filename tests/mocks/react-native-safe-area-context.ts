import { mock } from "bun:test";

mock.module("react-native-safe-area-context", () => {
  const React = require("react");

  const createComponent =
    (name: string) =>
    ({ children, ...props }: any) =>
      React.createElement(name, props, children);

  return {
    SafeAreaProvider: createComponent("SafeAreaProvider"),
    SafeAreaView: createComponent("SafeAreaView"),
    SafeAreaInsetsContext: {
      Consumer: ({ children }: any) =>
        typeof children === "function"
          ? children({ top: 0, bottom: 0, left: 0, right: 0 })
          : children,
      Provider: createComponent("SafeAreaInsetsProvider"),
    },
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    initialWindowMetrics: {
      insets: { top: 0, bottom: 0, left: 0, right: 0 },
      frame: { x: 0, y: 0, width: 390, height: 844 },
    },
  };
});
