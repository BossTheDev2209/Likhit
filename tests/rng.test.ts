// tests/rng.test.ts
import { describe, it, expect } from "vitest";
import { hashString, mulberry32, makeClusterRng, randRange } from "../src/engine/rng";

describe("rng", () => {
  it("hashString is deterministic and varies by input", () => {
    expect(hashString("abc")).toBe(hashString("abc"));
    expect(hashString("abc")).not.toBe(hashString("abd"));
  });

  it("mulberry32 is deterministic for a seed and in [0,1)", () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    const x = a();
    expect(x).toBe(b());
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThan(1);
  });

  it("makeClusterRng is stable per (seed, index) and differs across index", () => {
    const r1 = makeClusterRng(42, 5)();
    const r1again = makeClusterRng(42, 5)();
    const r2 = makeClusterRng(42, 6)();
    expect(r1).toBe(r1again);
    expect(r1).not.toBe(r2);
  });

  it("randRange stays within bounds", () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 100; i++) {
      const v = randRange(rng, -2, 5);
      expect(v).toBeGreaterThanOrEqual(-2);
      expect(v).toBeLessThan(5);
    }
  });
});
