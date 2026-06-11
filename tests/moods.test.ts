// tests/moods.test.ts
import { describe, it, expect } from "vitest";
import { STARTER_MOODS } from "../src/engine/moods";

describe("starter moods", () => {
  it("ships the four named Thai moods with unique ids", () => {
    const ids = STARTER_MOODS.map((m) => m.id);
    expect(ids).toEqual(["banchong", "pakati", "kikiat", "ripkhian"]);
    expect(new Set(ids).size).toBe(4);
  });
  it("neat (banchong) has less jitter than rushed (ripkhian)", () => {
    const neat = STARTER_MOODS.find((m) => m.id === "banchong")!;
    const rushed = STARTER_MOODS.find((m) => m.id === "ripkhian")!;
    expect(neat.jitter).toBeLessThan(rushed.jitter);
  });
  it("every mood maps all three scripts to a font", () => {
    for (const m of STARTER_MOODS) {
      expect(m.fonts.thai).toBeTruthy();
      expect(m.fonts.latin).toBeTruthy();
      expect(m.fonts.math).toBeTruthy();
    }
  });
});
