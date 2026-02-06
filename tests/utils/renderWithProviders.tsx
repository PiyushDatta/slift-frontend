import React from "react";
import { render, RenderOptions } from "@testing-library/react-native";

import { SettingsProvider } from "../../src/context/SettingsContext";
import { KnowledgeSelectionProvider } from "../../src/context/KnowledgeSelectionContext";
import { NodesDataProvider } from "../../src/context/NodesDataContext";
import { ProfileDataProvider } from "../../src/context/ProfileDataContext";

type Options = RenderOptions & {
  initialSize?: "small" | "medium" | "large";
  initialElasticity?: number;
  initialNodesData?: import("../../src/api").NodesAndPostsResponse;
  disableNodesAutoLoad?: boolean;
  initialProfileData?: import("../../src/api").UserProfileResponse;
  disableProfileAutoLoad?: boolean;
};

export function renderWithProviders(
  ui: React.ReactElement,
  {
    initialSize = "medium",
    initialElasticity = 0.3,
    initialNodesData,
    disableNodesAutoLoad = true,
    initialProfileData,
    disableProfileAutoLoad = true,
    ...options
  }: Options = {},
) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <SettingsProvider
      initialSize={initialSize}
      initialElasticity={initialElasticity}
    >
      <KnowledgeSelectionProvider>
        <NodesDataProvider
          initialData={initialNodesData}
          disableAutoLoad={disableNodesAutoLoad}
        >
          <ProfileDataProvider
            initialData={initialProfileData}
            disableAutoLoad={disableProfileAutoLoad}
          >
            {children}
          </ProfileDataProvider>
        </NodesDataProvider>
      </KnowledgeSelectionProvider>
    </SettingsProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
}
