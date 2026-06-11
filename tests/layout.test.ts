// tests/layout.test.ts
import { describe, it, expect } from "vitest";
import { layoutPage } from "../src/engine/layout";
import { segmentClusters } from "../src/engine/segment";
import type { Mood, Template } from "../src/engine/types";

const mood: Mood = {
  id: "m", name: "m",
  fonts: { thai: "T", latin: "L", math: "M" },
  fontPx: 24, jitter: 0, slope: 0, spacing: 2, spacingJitter: 0,
  sizeVar: 0, baselineDrift: 0, inkDarkness: 1, inkColor: "#000",
};
const template: Template = {
  id: "t", name: "t", widthMm: 100, heightMm: 100,
  kind: "blank", ruleSpacingMm: 9, marginMm: 10,
};
// fixed 10px per character so widths are predictable
const measure = (text: string) => text.length * 10;

describe("layout", () => {
  it("with zero jitter, places clusters left-to-right on one baseline", () => {
    const clusters = segmentClusters("ab");
    const out = layoutPage(clusters, { mood, template, seed: 1, lineOverrides: [], measure, dpi: 96 });
    expect(out).toHaveLength(2);
    expect(out[0].y).toBe(out[1].y);          // same baseline
    expect(out[1].x).toBeGreaterThan(out[0].x); // advances right
  });

  it("wraps to a new baseline when the page width is exceeded", () => {
    const wide = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; // 29 chars * 10px = 290px > available ~302px from margin, wraps before end
    const clusters = segmentClusters(wide);
    const out = layoutPage(clusters, { mood, template, seed: 1, lineOverrides: [], measure, dpi: 96 });
    const baselines = new Set(out.map((c) => Math.round(c.y)));
    expect(baselines.size).toBeGreaterThan(1);
  });

  it("respects an explicit line break (\\n) starting a new baseline", () => {
    const clusters = segmentClusters("a\nb");
    const out = layoutPage(clusters, { mood, template, seed: 1, lineOverrides: [], measure, dpi: 96 });
    const visible = out.filter((c) => c.text.trim() !== "");
    expect(visible[1].y).toBeGreaterThan(visible[0].y);
  });

  it("zero jitter => zero rotation", () => {
    const clusters = segmentClusters("a");
    const out = layoutPage(clusters, { mood, template, seed: 1, lineOverrides: [], measure, dpi: 96 });
    expect(out[0].rotation).toBe(0);
  });

  it("a lineOverride startXMm moves that line's left start", () => {
    const clusters = segmentClusters("a\nb");
    const base = layoutPage(clusters, { mood, template, seed: 1, lineOverrides: [], measure, dpi: 96 });
    const moved = layoutPage(clusters, { mood, template, seed: 1, lineOverrides: [{ lineIndex: 1, startXMm: 30 }], measure, dpi: 96 });
    const baseLine2 = base.filter((c) => c.text === "b")[0];
    const movedLine2 = moved.filter((c) => c.text === "b")[0];
    expect(movedLine2.x).not.toBe(baseLine2.x);
  });
});
