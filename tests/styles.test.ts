import { describe, expect, it } from "bun:test";

import { createMediaScrollStyles } from "../src/styles/MediaScrollScreenStyles";
import { createKnowledgeGraphStyles } from "../src/styles/KnowledgeGraphScreenStyles";
import { createProfileScreenStyles } from "../src/styles/ProfileScreenStyles";
import { createSettingsPanelStyles } from "../src/styles/SettingsPanelStyles";

describe("styles", () => {
  it("Media scroll styles expose expected keys", () => {
    const mediaStyles = createMediaScrollStyles();
    expect(mediaStyles).toHaveProperty("container");
    expect(mediaStyles).toHaveProperty("card");
    expect(mediaStyles).toHaveProperty("media");
    expect(mediaStyles).toHaveProperty("videoOverlay");
  });

  it("Knowledge graph styles expose expected keys", () => {
    const graphStyles = createKnowledgeGraphStyles();
    expect(graphStyles).toHaveProperty("container");
    expect(graphStyles).toHaveProperty("canvas");
    expect(graphStyles).toHaveProperty("node");
    expect(graphStyles).toHaveProperty("edge");
  });

  it("Profile styles expose expected keys", () => {
    const profileStyles = createProfileScreenStyles();
    expect(profileStyles).toHaveProperty("container");
    expect(profileStyles).toHaveProperty("header");
    expect(profileStyles).toHaveProperty("section");
  });

  it("Settings panel styles expose expected keys", () => {
    const settingsStyles = createSettingsPanelStyles();
    expect(settingsStyles).toHaveProperty("container");
    expect(settingsStyles).toHaveProperty("title");
    expect(settingsStyles).toHaveProperty("pill");
  });
});
