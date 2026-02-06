import { mock } from "bun:test";

mock.module("@react-navigation/bottom-tabs", () => {
  const React = require("react");
  return {
    createBottomTabNavigator: () => ({
      Navigator: ({ children }: any) =>
        React.createElement("TabNavigator", null, children),
      Screen: ({ component: Component }: any) =>
        React.createElement(
          "TabScreen",
          null,
          React.createElement(Component, null),
        ),
    }),
  };
});
