// tests/templates.test.ts
import { describe, it, expect } from "vitest";
import { STARTER_TEMPLATES } from "../src/engine/templates";

describe("starter templates", () => {
  it("includes blank, lined, and grid A4", () => {
    const kinds = STARTER_TEMPLATES.filter((t) => t.id.startsWith("a4")).map((t) => t.kind);
    expect(kinds).toContain("blank");
    expect(kinds).toContain("lined");
    expect(kinds).toContain("grid");
  });
  it("A4 is 210x297mm", () => {
    const a4 = STARTER_TEMPLATES.find((t) => t.id === "a4-lined")!;
    expect(a4.widthMm).toBe(210);
    expect(a4.heightMm).toBe(297);
  });
});
