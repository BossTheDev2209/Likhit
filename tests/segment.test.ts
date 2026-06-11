// tests/segment.test.ts
import { describe, it, expect } from "vitest";
import { segmentClusters, detectScript } from "../src/engine/segment";

describe("segment", () => {
  it("keeps Thai base + stacked vowel/tone as ONE cluster", () => {
    // "ก" + sara ii (U+0E35) + mai tho (U+0E49) must stay together
    const clusters = segmentClusters("กี้");
    expect(clusters).toHaveLength(1);
    expect(clusters[0].text).toBe("กี้");
    expect(clusters[0].script).toBe("thai");
  });

  it("splits a mixed string into per-cluster scripts", () => {
    const clusters = segmentClusters("กA+");
    expect(clusters.map((c) => c.script)).toEqual(["thai", "latin", "math"]);
  });

  it("indexes clusters in order", () => {
    const clusters = segmentClusters("ab");
    expect(clusters.map((c) => c.index)).toEqual([0, 1]);
  });

  it("detectScript classifies representative chars", () => {
    expect(detectScript("ก")).toBe("thai");
    expect(detectScript("Z")).toBe("latin");
    expect(detectScript("7")).toBe("latin"); // digits ride with latin fonts
    expect(detectScript("=")).toBe("math");
    expect(detectScript(" ")).toBe("space");
  });
});
