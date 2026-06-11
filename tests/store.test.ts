// tests/store.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { createProjectState } from "../src/store/useProject";

describe("project state", () => {
  let s: ReturnType<typeof createProjectState>;
  beforeEach(() => { s = createProjectState(); });

  it("initializes with starter moods/templates and a seed", () => {
    expect(s.getState().moods.length).toBeGreaterThanOrEqual(4);
    expect(s.getState().templates.length).toBeGreaterThanOrEqual(3);
    expect(typeof s.getState().seed).toBe("number");
  });

  it("setText updates text", () => {
    s.getState().setText("hello");
    expect(s.getState().text).toBe("hello");
  });

  it("saveMood adds a new custom mood and selects it", () => {
    const before = s.getState().moods.length;
    s.getState().saveMood({ ...s.getState().moods[0], id: "", name: "my mood" });
    expect(s.getState().moods.length).toBe(before + 1);
    const created = s.getState().moods[s.getState().moods.length - 1];
    expect(created.name).toBe("my mood");
    expect(created.id).not.toBe("");
    expect(s.getState().moodId).toBe(created.id);
  });

  it("toProjectJson / loadProjectJson round-trips", () => {
    s.getState().setText("round trip");
    const json = s.getState().toProjectJson();
    const s2 = createProjectState();
    s2.getState().loadProjectJson(json);
    expect(s2.getState().text).toBe("round trip");
    expect(s2.getState().seed).toBe(s.getState().seed);
  });
});
