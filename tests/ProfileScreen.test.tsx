import React from "react";
import { describe, expect, it, mock } from "bun:test";
import { renderWithProviders } from "./utils/renderWithProviders";

mock.module("../src/api", () => ({
  getUserProfile: async () => ({
    name: "Fun Bob",
    handle: "@funbob101",
    avatar_url: "https://i.pravatar.cc/100?img=50",
  }),
  logoutAuthSession: async () => ({ ok: true, revoked: true }),
  deleteAuthAccount: async () => ({
    ok: true,
    deleted: true,
    deleted_user_id: "u_1",
    revoked_sessions: 1,
  }),
  getTwitterSyncStatus: async () => ({ running: false }),
  syncTwitter: async () => ({ accepted: true, running: false }),
  clearQueue: async () => ({ queue_size: 0 }),
}));

mock.module("../src/context/AuthContext", () => ({
  useAuth: () => ({
    status: "authenticated",
    sessionToken: "token",
    sessionExpiresAt: null,
    isAuthenticating: false,
    reauthMessage: null,
    startAuth: async () => true,
    signOut: () => {},
    clearReauthMessage: () => {},
  }),
}));

import { ProfileScreen } from "../src/screens/ProfileScreen";

describe("ProfileScreen", () => {
  it("renders profile header and settings section", async () => {
    const { findByText, getAllByText } = renderWithProviders(
      <ProfileScreen />,
      {
        initialProfileData: {
          name: "Fun Bob",
          handle: "@funbob101",
          avatar_url: "https://i.pravatar.cc/100?img=50",
        },
      },
    );

    expect(await findByText("Fun Bob")).toBeTruthy();
    expect(await findByText("@funbob101")).toBeTruthy();
    expect(await findByText("Profile Settings")).toBeTruthy();
    expect(await findByText("App Settings")).toBeTruthy();
    expect(getAllByText("small").length).toBeGreaterThan(0);
    expect(getAllByText("medium").length).toBeGreaterThan(0);
    expect(getAllByText("large").length).toBeGreaterThan(0);
    expect(await findByText("Drag Elasticity")).toBeTruthy();
    expect(await findByText("Firm")).toBeTruthy();
    expect(await findByText("Soft")).toBeTruthy();
  });
});
