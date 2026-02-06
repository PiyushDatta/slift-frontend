import { mock } from "bun:test";

mock.module("@react-navigation/native", () => {
  const React = require("react");
  const navigate = (...args: any[]) =>
    (globalThis as any).__NAV_CALLS__.push(args);
  const useRoute = () => ({
    params: (globalThis as any).__ROUTE_PARAMS__ ?? undefined,
  });
  (globalThis as any).__NAV_CALLS__ = (globalThis as any).__NAV_CALLS__ ?? [];
  return {
    NavigationContainer: ({ children }: any) =>
      React.createElement("NavigationContainer", null, children),
    useNavigationContainerRef: () => ({
      current: {
        addListener: () => () => {},
        removeListener: () => {},
      },
    }),
    useNavigation: () => ({
      navigate,
    }),
    useRoute,
  };
});
