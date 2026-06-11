# Likhit — Handwriting Mimic (v1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A client-only web app that turns typed Thai/English/math text into natural-looking handwriting rendered on a paper template, exportable as PNG/PDF (with material + subtle photo realism) — so a page looks hand-written, not digitally typed.

**Architecture:** Pure-logic engine (seeded RNG → grapheme-cluster segmentation + script routing → baseline layout with controlled jitter) feeds a Canvas 2D renderer. UI is a React editor: source text in, live handwriting preview out, mood sliders, template picker, export. All state is client-side (zustand + localStorage + `.json` import/export). No backend, no login.

**Tech Stack:** Vite + React + TypeScript, Canvas 2D API, `Intl.Segmenter` (built-in) for grapheme clustering, `zustand` for state, `pdf-lib` for PDF export, Vitest for unit tests. Bundled Google handwriting fonts (Thai: Itim/Mali/Sriracha/Charmonman; Latin: Caveat/Shadows Into Light/Gloria Hallelujah).

**Out of scope (separate plans):** v1.5 = photo-import with perspective-aware placement (import option **C**). v2 = capture-your-own-handwriting (SVG glyphs + Thai anchor/attachment system + glyph mixing), OCR import (option **A**), Supabase accounts/sync.

**Design decisions locked during grilling:**
- Engine = handwriting **fonts** for v1 (your-own-handwriting is v2).
- Rendering unit = **grapheme cluster** (base consonant + stacked Thai vowels/tone marks render as one unit, then wobble the unit). This is the one approach that is both correct Thai *and* naturally varied.
- "Edit the doc" = edit **source text + controls**, re-render with a **stable seed**; the re-editable artifact is the saved **project `.json`**, not the exported image.
- Line spacing/start = **auto-jitter by default + full manual per-line override** (both).
- Export = **Level 2 material realism + subtle Level 3 photo mode + print-friendly**, fully digital pipeline.
- Moods = **fully custom** (sliders → "save as my mood"); the 4 named Thai moods ship as editable starter presets. Script auto-routing (Thai/Latin/math each get their own font within a mood). Global mood + per-selection override.
- **Milestone 0 (rendering spike) is a hard GO/NO-GO gate** built before any UI.

---

## File Structure

```
likhit/
  index.html
  package.json
  vite.config.ts
  vitest.config.ts
  public/fonts.css                 # @font-face for bundled handwriting fonts
  src/
    main.tsx                       # React entry
    App.tsx                        # top-level layout: editor pane + canvas pane
    engine/
      types.ts                     # Script, Cluster, Mood, Template, Project, LaidOutCluster
      rng.ts                       # string hash + mulberry32 + seeded helpers
      segment.ts                   # grapheme clustering + per-cluster script detection
      moods.ts                     # 4 starter mood presets + default font maps
      templates.ts                 # A4/other sizes, blank/lined/grid definitions
      layout.ts                    # flow clusters into jittered baselines -> LaidOutCluster[]
      render.ts                    # draw template + clusters onto a CanvasRenderingContext2D
    components/
      HandwritingCanvas.tsx        # renders the page from project state
      SourceEditor.tsx             # textarea for source text
      MoodControls.tsx             # sliders + save/load custom moods
      TemplatePicker.tsx           # template + page-size selection
      LineOverrides.tsx            # per-line manual nudge UI
      Toolbar.tsx                  # export / save / load project buttons
    store/
      useProject.ts                # zustand store + localStorage persistence
    export/
      realism.ts                   # paper texture, ink pressure, subtle photo mode
      png.ts                       # canvas -> PNG download
      pdf.ts                       # canvas -> PDF (pdf-lib), incl. print-friendly
  tests/
    rng.test.ts
    segment.test.ts
    layout.test.ts
    moods.test.ts
    templates.test.ts
    store.test.ts
```

**Responsibilities:** `engine/*` is pure, framework-free, fully unit-tested. `components/*` is React glue. `export/*` turns a rendered canvas into files. `store/*` is the single source of truth. Rendering *quality* (does it look like handwriting?) is verified by eye in Milestone 0 — canvas pixel output is not unit-testable in jsdom, so visual checks are explicit steps.

---

## Milestone 0 — Rendering Spike (GO/NO-GO gate)

**Purpose:** Prove Thai + English + math render as convincing handwriting at the cluster level with stable-seed wobble, *before* building any UI. If the output looks like garbage (detached tone marks, robotic spacing), stop and rethink the engine.

### Task 0: Project scaffold

**Files:**
- Create: `likhit/` (Vite project)
- Create: `likhit/vitest.config.ts`
- Modify: `likhit/package.json`

- [ ] **Step 1: Scaffold Vite React+TS project**

Run (from `C:\Users\khunb\projects\RobloxProjects`):
```bash
npm create vite@latest likhit -- --template react-ts
cd likhit
npm install
npm install zustand pdf-lib
npm install -D vitest
```
Expected: `likhit/` created with `src/App.tsx`, `package.json`, deps installed.

- [ ] **Step 2: Add test script + vitest config**

Add to `likhit/package.json` `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

Create `likhit/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 3: Verify toolchain runs**

Run: `npm run dev` — confirm the default Vite page loads at the printed localhost URL, then stop it.
Run: `npm run test` — Expected: "No test files found" (exit 0). Toolchain confirmed.

- [ ] **Step 4: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold Vite React+TS project with vitest"
```

---

### Task 1: Seeded RNG (`engine/rng.ts`)

Deterministic randomness so re-rendering is stable: the same project seed + the same cluster index always produces the same wobble. Editing text after a cluster will shift later clusters (expected and acceptable for v1).

**Files:**
- Create: `likhit/src/engine/rng.ts`
- Test: `likhit/tests/rng.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/rng.test.ts`
Expected: FAIL — cannot find module `../src/engine/rng`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/engine/rng.ts

/** cyrb53-style string hash -> unsigned 32-bit int. Deterministic. */
export function hashString(str: string): number {
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0) ^ (h1 >>> 0);
}

/** Seeded PRNG returning a function that yields floats in [0,1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable RNG for a given project seed + cluster index. */
export function makeClusterRng(seed: number, clusterIndex: number): () => number {
  return mulberry32(hashString(`${seed}:${clusterIndex}`));
}

/** Uniform float in [min, max). */
export function randRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/rng.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/rng.ts tests/rng.test.ts
git commit -m "feat(engine): seeded RNG for stable per-cluster jitter"
```

---

### Task 2: Grapheme clustering + script detection (`engine/segment.ts`)

**Files:**
- Create: `likhit/src/engine/types.ts`
- Create: `likhit/src/engine/segment.ts`
- Test: `likhit/tests/segment.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/segment.test.ts`
Expected: FAIL — cannot find module `../src/engine/segment`.

- [ ] **Step 3: Write the types, then the implementation**

```ts
// src/engine/types.ts
export type Script = "thai" | "latin" | "math" | "space" | "other";

export interface Cluster {
  text: string;   // one grapheme cluster (may contain stacked Thai marks)
  script: Script;
  index: number;  // position in the document, drives stable RNG
}

export type FontMap = Record<Exclude<Script, "space" | "other">, string>;

export interface Mood {
  id: string;
  name: string;
  fonts: FontMap;        // CSS font-family per script
  fontPx: number;        // nominal glyph size
  jitter: number;        // 0..1 positional wobble strength
  slope: number;         // degrees of per-line baseline tilt range
  spacing: number;       // extra px between clusters
  spacingJitter: number; // 0..1 randomness on inter-cluster gap
  sizeVar: number;       // 0..1 per-cluster size variation
  baselineDrift: number; // px vertical wander within a line
  inkDarkness: number;   // 0..1 base alpha of ink
  inkColor: string;      // hex, e.g. "#1a2b6d"
}

export interface Template {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  kind: "blank" | "lined" | "grid";
  ruleSpacingMm: number; // line/grid spacing for lined/grid
  marginMm: number;
}

export interface LineOverride {
  lineIndex: number;
  startXMm?: number;   // override left start
  gapMm?: number;      // override gap before this line
}

export interface Project {
  schemaVersion: 1;
  seed: number;
  text: string;
  moodId: string;
  moods: Mood[];        // includes starter + custom
  templateId: string;
  templates: Template[];
  lineOverrides: LineOverride[];
}

export interface LaidOutCluster {
  text: string;
  script: Script;
  x: number;        // px from page left
  y: number;        // px baseline from page top
  rotation: number; // radians
  fontPx: number;
  alpha: number;    // ink alpha after pressure variation
}
```

```ts
// src/engine/segment.ts
import type { Cluster, Script } from "./types";

const THAI = /[฀-๿]/;
const LATIN = /[A-Za-z0-9]/;
const MATH = /[+\-*/=<>()[\]{}^%√∫∑πθ×÷±≤≥≠·∞]/;

export function detectScript(grapheme: string): Script {
  const base = grapheme[0] ?? "";
  if (base === " " || base === "\t") return "space";
  if (THAI.test(base)) return "thai";
  if (MATH.test(base)) return "math";
  if (LATIN.test(base)) return "latin";
  return "other";
}

export function segmentClusters(text: string): Cluster[] {
  const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  const out: Cluster[] = [];
  let i = 0;
  for (const { segment } of seg.segment(text)) {
    out.push({ text: segment, script: detectScript(segment), index: i });
    i++;
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/segment.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/types.ts src/engine/segment.ts tests/segment.test.ts
git commit -m "feat(engine): grapheme clustering + script detection"
```

---

### Task 3: Baseline layout engine (`engine/layout.ts`)

Flows clusters into lines along jittered baselines. Width measurement is injected (a `measure(text, fontPx, fontFamily) => widthPx` function) so layout is pure and testable without a canvas.

**Files:**
- Create: `likhit/src/engine/layout.ts`
- Test: `likhit/tests/layout.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
    const wide = "aaaaaaaaaaaaaaaaaaaa"; // 20 chars * 10px = 200px > printable width
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/layout.test.ts`
Expected: FAIL — cannot find module `../src/engine/layout`.

- [ ] **Step 3: Write the implementation**

```ts
// src/engine/layout.ts
import type { Cluster, LaidOutCluster, Mood, Template, LineOverride } from "./types";
import { makeClusterRng, randRange } from "./rng";

export interface LayoutOpts {
  mood: Mood;
  template: Template;
  seed: number;
  lineOverrides: LineOverride[];
  measure: (text: string, fontPx: number, fontFamily: string) => number;
  dpi: number; // pixels per inch for mm->px conversion
}

const mmToPx = (mm: number, dpi: number) => (mm / 25.4) * dpi;
const deg = (d: number) => (d * Math.PI) / 180;

export function layoutPage(clusters: Cluster[], opts: LayoutOpts): LaidOutCluster[] {
  const { mood, template, seed, lineOverrides, measure, dpi } = opts;
  const margin = mmToPx(template.marginMm, dpi);
  const pageW = mmToPx(template.widthMm, dpi);
  const printableRight = pageW - margin;
  const nominalGap = mmToPx(template.ruleSpacingMm, dpi);

  const overrideFor = (line: number) => lineOverrides.find((o) => o.lineIndex === line);

  const out: LaidOutCluster[] = [];
  let lineIndex = 0;
  let baselineTop = margin + mood.fontPx; // first baseline sits a line below the top margin

  const lineStartX = (line: number) => {
    const ov = overrideFor(line);
    if (ov?.startXMm != null) return mmToPx(ov.startXMm, dpi);
    // jitter the left margin a little so it isn't a ruler-straight edge
    const r = makeClusterRng(seed, 100000 + line);
    return margin + randRange(r, 0, mmToPx(2, dpi) * mood.jitter);
  };

  const lineGap = (line: number) => {
    const ov = overrideFor(line);
    if (ov?.gapMm != null) return mmToPx(ov.gapMm, dpi);
    const r = makeClusterRng(seed, 200000 + line);
    const jitterPx = mmToPx(1.5, dpi) * mood.jitter;
    return nominalGap + randRange(r, -jitterPx, jitterPx);
  };

  // each line gets a slight overall slope
  const lineSlope = (line: number) => {
    const r = makeClusterRng(seed, 300000 + line);
    return deg(randRange(r, -mood.slope, mood.slope));
  };

  let x = lineStartX(lineIndex);
  let slope = lineSlope(lineIndex);
  let lineStartXValue = x;

  const newLine = () => {
    lineIndex++;
    baselineTop += lineGap(lineIndex);
    x = lineStartX(lineIndex);
    lineStartXValue = x;
    slope = lineSlope(lineIndex);
  };

  for (const cluster of clusters) {
    if (cluster.text === "\n") {
      newLine();
      continue;
    }

    const fontFamily =
      cluster.script === "thai" ? mood.fonts.thai
      : cluster.script === "math" ? mood.fonts.math
      : mood.fonts.latin;

    const r = makeClusterRng(seed, cluster.index);

    // per-cluster size variation
    const sizeFactor = 1 + randRange(r, -mood.sizeVar, mood.sizeVar) * 0.25;
    const fontPx = mood.fontPx * sizeFactor;

    const width = cluster.text === " "
      ? mood.fontPx * 0.4
      : measure(cluster.text, fontPx, fontFamily);

    // wrap if this cluster would overflow the printable area
    if (x + width > printableRight && cluster.text !== " ") {
      newLine();
    }

    if (cluster.script === "space") {
      x += width + mood.spacing;
      continue;
    }

    // slope contribution + per-cluster vertical drift
    const slopeY = (x - lineStartXValue) * Math.tan(slope);
    const drift = randRange(r, -mood.baselineDrift, mood.baselineDrift);
    const y = baselineTop + slopeY + drift;

    const rotation = deg(randRange(r, -3, 3)) * mood.jitter;
    const xJitter = randRange(r, -1.5, 1.5) * mood.jitter;
    const alpha = mood.inkDarkness * (0.85 + randRange(r, 0, 0.15));

    out.push({
      text: cluster.text,
      script: cluster.script,
      x: x + xJitter,
      y,
      rotation,
      fontPx,
      alpha,
    });

    const gapJitter = randRange(r, 0, mood.spacing) * mood.spacingJitter;
    x += width + mood.spacing + gapJitter;
  }

  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/layout.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/layout.ts tests/layout.test.ts
git commit -m "feat(engine): baseline layout with jitter, wrap, and per-line overrides"
```

---

### Task 4: Starter moods + templates (`engine/moods.ts`, `engine/templates.ts`)

**Files:**
- Create: `likhit/src/engine/moods.ts`
- Create: `likhit/src/engine/templates.ts`
- Test: `likhit/tests/moods.test.ts`
- Test: `likhit/tests/templates.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
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
```

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/moods.test.ts tests/templates.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the implementations**

```ts
// src/engine/moods.ts
import type { Mood } from "./types";

const FONTS = {
  neat:    { thai: "Itim",       latin: "Caveat",              math: "Caveat" },
  normal:  { thai: "Mali",       latin: "Shadows Into Light",  math: "Caveat" },
  loose:   { thai: "Sriracha",   latin: "Shadows Into Light",  math: "Caveat" },
  scrawl:  { thai: "Charmonman", latin: "Gloria Hallelujah",   math: "Caveat" },
};

export const STARTER_MOODS: Mood[] = [
  {
    id: "banchong", name: "ลายมือบรรจง", fonts: FONTS.neat, fontPx: 30,
    jitter: 0.12, slope: 0.6, spacing: 1.5, spacingJitter: 0.15,
    sizeVar: 0.06, baselineDrift: 0.8, inkDarkness: 0.95, inkColor: "#1b2a78",
  },
  {
    id: "pakati", name: "ลายมือปกติ", fonts: FONTS.normal, fontPx: 30,
    jitter: 0.3, slope: 1.2, spacing: 1.5, spacingJitter: 0.3,
    sizeVar: 0.12, baselineDrift: 1.6, inkDarkness: 0.92, inkColor: "#1b2a78",
  },
  {
    id: "kikiat", name: "ลายมือขี้เกียจ", fonts: FONTS.loose, fontPx: 31,
    jitter: 0.5, slope: 2.0, spacing: 1.0, spacingJitter: 0.45,
    sizeVar: 0.2, baselineDrift: 2.6, inkDarkness: 0.88, inkColor: "#1b2a78",
  },
  {
    id: "ripkhian", name: "ลายมือรีบเขียน", fonts: FONTS.scrawl, fontPx: 31,
    jitter: 0.75, slope: 3.2, spacing: 0.6, spacingJitter: 0.6,
    sizeVar: 0.28, baselineDrift: 3.4, inkDarkness: 0.82, inkColor: "#1b2a78",
  },
];
```

```ts
// src/engine/templates.ts
import type { Template } from "./types";

export const STARTER_TEMPLATES: Template[] = [
  { id: "a4-blank", name: "A4 เปล่า", widthMm: 210, heightMm: 297, kind: "blank", ruleSpacingMm: 9, marginMm: 20 },
  { id: "a4-lined", name: "A4 มีเส้นบรรทัด", widthMm: 210, heightMm: 297, kind: "lined", ruleSpacingMm: 9, marginMm: 20 },
  { id: "a4-grid",  name: "A4 มีเส้นตาราง", widthMm: 210, heightMm: 297, kind: "grid",  ruleSpacingMm: 7, marginMm: 20 },
  { id: "a5-lined", name: "A5 มีเส้นบรรทัด", widthMm: 148, heightMm: 210, kind: "lined", ruleSpacingMm: 8, marginMm: 15 },
  { id: "letter-lined", name: "Letter มีเส้นบรรทัด", widthMm: 216, heightMm: 279, kind: "lined", ruleSpacingMm: 9, marginMm: 20 },
];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/moods.test.ts tests/templates.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/moods.ts src/engine/templates.ts tests/moods.test.ts tests/templates.test.ts
git commit -m "feat(engine): starter moods and paper templates"
```

---

### Task 5: Canvas renderer + spike page (THE GO/NO-GO VISUAL GATE)

This is the moment of truth. Render real text with the engine and look at it.

**Files:**
- Create: `likhit/public/fonts.css`
- Create: `likhit/src/engine/render.ts`
- Modify: `likhit/index.html` (load fonts.css)
- Modify: `likhit/src/App.tsx` (temporary spike UI)

- [ ] **Step 1: Add bundled fonts**

Create `likhit/public/fonts.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Caveat&family=Charmonman&family=Gloria+Hallelujah&family=Itim&family=Mali&family=Shadows+Into+Light&family=Sriracha&display=swap');
```
Add to `likhit/index.html` inside `<head>`:
```html
<link rel="stylesheet" href="/fonts.css" />
```
> Note for v1 ship: these load from Google's CDN. Before release, self-host the `.woff2` files in `public/fonts/` and point `@font-face` at them so the app is truly offline/client-only. Tracked as a release task in Milestone 3.

- [ ] **Step 2: Write the renderer**

```ts
// src/engine/render.ts
import type { LaidOutCluster, Mood, Template } from "./types";

const mmToPx = (mm: number, dpi: number) => (mm / 25.4) * dpi;

/** Build a font shorthand string for ctx.font. */
export function fontString(fontPx: number, family: string): string {
  return `${Math.round(fontPx)}px "${family}", sans-serif`;
}

/** Draw the paper template (background + rules/grid). */
export function drawTemplate(ctx: CanvasRenderingContext2D, template: Template, dpi: number): void {
  const w = mmToPx(template.widthMm, dpi);
  const h = mmToPx(template.heightMm, dpi);
  ctx.fillStyle = "#fdfdf7";
  ctx.fillRect(0, 0, w, h);

  if (template.kind === "blank") return;

  const margin = mmToPx(template.marginMm, dpi);
  const gap = mmToPx(template.ruleSpacingMm, dpi);
  ctx.strokeStyle = template.kind === "grid" ? "#cfd8e8" : "#bcd0e8";
  ctx.lineWidth = 1;

  for (let y = margin + gap; y < h - margin; y += gap) {
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(w - margin, y);
    ctx.stroke();
  }
  if (template.kind === "grid") {
    for (let x = margin; x < w - margin; x += gap) {
      ctx.beginPath();
      ctx.moveTo(x, margin);
      ctx.lineTo(x, h - margin);
      ctx.stroke();
    }
  }
}

/** Draw all laid-out clusters with their per-cluster transforms. */
export function drawClusters(
  ctx: CanvasRenderingContext2D,
  clusters: LaidOutCluster[],
  mood: Mood,
): void {
  ctx.textBaseline = "alphabetic";
  for (const c of clusters) {
    const family =
      c.script === "thai" ? mood.fonts.thai
      : c.script === "math" ? mood.fonts.math
      : mood.fonts.latin;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rotation);
    ctx.font = fontString(c.fontPx, family);
    ctx.fillStyle = mood.inkColor;
    ctx.globalAlpha = c.alpha;
    ctx.fillText(c.text, 0, 0);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

/** Convenience: a canvas measure function bound to a context. */
export function makeMeasure(ctx: CanvasRenderingContext2D) {
  return (text: string, fontPx: number, family: string): number => {
    ctx.font = fontString(fontPx, family);
    return ctx.measureText(text).width;
  };
}
```

- [ ] **Step 3: Wire a throwaway spike into `App.tsx`**

Replace `likhit/src/App.tsx` with:
```tsx
import { useEffect, useRef, useState } from "react";
import { segmentClusters } from "./engine/segment";
import { layoutPage } from "./engine/layout";
import { drawTemplate, drawClusters, makeMeasure } from "./engine/render";
import { STARTER_MOODS } from "./engine/moods";
import { STARTER_TEMPLATES } from "./engine/templates";

const DPI = 96;
const SAMPLE =
  "การเขียนด้วยลายมือ\nThe quick brown fox 1234\nx = (a+b)/2 - √c";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [moodIdx, setMoodIdx] = useState(1);
  const [text, setText] = useState(SAMPLE);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const mood = STARTER_MOODS[moodIdx];
    const template = STARTER_TEMPLATES[1]; // a4-lined
    canvas.width = (template.widthMm / 25.4) * DPI;
    canvas.height = (template.heightMm / 25.4) * DPI;

    // fonts must be loaded before measuring/drawing
    (document as any).fonts.ready.then(() => {
      const clusters = segmentClusters(text);
      const laid = layoutPage(clusters, {
        mood, template, seed: 12345, lineOverrides: [],
        measure: makeMeasure(ctx), dpi: DPI,
      });
      drawTemplate(ctx, template, DPI);
      drawClusters(ctx, laid, mood);
    });
  }, [moodIdx, text]);

  return (
    <div style={{ display: "flex", gap: 16, padding: 16 }}>
      <div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} cols={40} />
        <div>
          {STARTER_MOODS.map((m, i) => (
            <button key={m.id} onClick={() => setMoodIdx(i)}
              style={{ fontWeight: i === moodIdx ? 700 : 400 }}>
              {m.name}
            </button>
          ))}
        </div>
      </div>
      <canvas ref={canvasRef} style={{ border: "1px solid #ccc", width: 420 }} />
    </div>
  );
}
```

- [ ] **Step 4: GO/NO-GO visual verification**

Run: `npm run dev`, open the localhost URL.
**Inspect by eye and confirm ALL of the following:**
1. Thai tone marks/vowels sit correctly ON their consonants (no detached/floating marks). e.g. `เขียน`, `ลายมือ` look right.
2. Switching moods visibly changes wobble/slant/size (บรรจง neat → รีบเขียน messy).
3. Text wraps within the page and respects the `\n` line breaks.
4. The same text + same seed renders identically on reload (stable).
5. It reads as *handwriting*, not as a tidy font on a straight line.

**DECISION GATE:**
- **GO** → proceed to Milestone 1.
- **NO-GO** (Thai marks break, or it looks robotic) → STOP. The cluster-rendering assumption needs rework before any more building. Re-evaluate: are marks detaching (segmentation bug) or just ugly (font choice / jitter tuning)?

- [ ] **Step 5: Commit**

```bash
git add public/fonts.css index.html src/engine/render.ts src/App.tsx
git commit -m "feat(engine): canvas renderer + M0 rendering spike (GO/NO-GO gate)"
```

---

## Milestone 1 — Core Editor

Turns the spike into a real, stateful editor: zustand store, live re-render, mood sliders with custom-mood save/load.

### Task 6: Project store with persistence (`store/useProject.ts`)

**Files:**
- Create: `likhit/src/store/useProject.ts`
- Test: `likhit/tests/store.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/store.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/store/useProject.ts
import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { Mood, Project, Template, LineOverride } from "../engine/types";
import { STARTER_MOODS } from "../engine/moods";
import { STARTER_TEMPLATES } from "../engine/templates";

export interface ProjectState {
  schemaVersion: 1;
  seed: number;
  text: string;
  moodId: string;
  moods: Mood[];
  templateId: string;
  templates: Template[];
  lineOverrides: LineOverride[];

  setText: (t: string) => void;
  setMoodId: (id: string) => void;
  setTemplateId: (id: string) => void;
  updateActiveMood: (patch: Partial<Mood>) => void;
  saveMood: (mood: Mood) => void;          // empty id => create new
  setLineOverride: (o: LineOverride) => void;
  clearLineOverride: (lineIndex: number) => void;
  toProjectJson: () => string;
  loadProjectJson: (json: string) => void;
}

const STORAGE_KEY = "likhit.project.v1";

function initial(): Project {
  return {
    schemaVersion: 1,
    seed: Math.floor(Math.random() * 1_000_000),
    text: "",
    moodId: STARTER_MOODS[1].id,
    moods: STARTER_MOODS.map((m) => ({ ...m })),
    templateId: STARTER_TEMPLATES[1].id,
    templates: STARTER_TEMPLATES.map((t) => ({ ...t })),
    lineOverrides: [],
  };
}

export function createProjectState(persist = false) {
  const start = initial();
  const store = createStore<ProjectState>((set, get) => ({
    ...start,
    setText: (text) => set({ text }),
    setMoodId: (moodId) => set({ moodId }),
    setTemplateId: (templateId) => set({ templateId }),
    updateActiveMood: (patch) =>
      set({ moods: get().moods.map((m) => (m.id === get().moodId ? { ...m, ...patch } : m)) }),
    saveMood: (mood) => {
      if (mood.id === "") {
        const id = `custom-${Date.now()}`;
        const created = { ...mood, id };
        set({ moods: [...get().moods, created], moodId: id });
      } else {
        set({ moods: get().moods.map((m) => (m.id === mood.id ? mood : m)) });
      }
    },
    setLineOverride: (o) =>
      set({ lineOverrides: [...get().lineOverrides.filter((x) => x.lineIndex !== o.lineIndex), o] }),
    clearLineOverride: (lineIndex) =>
      set({ lineOverrides: get().lineOverrides.filter((x) => x.lineIndex !== lineIndex) }),
    toProjectJson: () => {
      const s = get();
      const proj: Project = {
        schemaVersion: 1, seed: s.seed, text: s.text, moodId: s.moodId,
        moods: s.moods, templateId: s.templateId, templates: s.templates,
        lineOverrides: s.lineOverrides,
      };
      return JSON.stringify(proj, null, 2);
    },
    loadProjectJson: (json) => {
      const p = JSON.parse(json) as Project;
      if (p.schemaVersion !== 1) throw new Error("Unsupported project version");
      set({
        seed: p.seed, text: p.text, moodId: p.moodId, moods: p.moods,
        templateId: p.templateId, templates: p.templates, lineOverrides: p.lineOverrides,
      });
    },
  }));

  if (persist && typeof localStorage !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { store.getState().loadProjectJson(saved); } catch { /* ignore corrupt save */ }
    }
    store.subscribe((state) => localStorage.setItem(STORAGE_KEY, state.toProjectJson()));
  }

  return store;
}

// App-wide singleton (persisted in the browser).
export const projectStore = createProjectState(true);
// useShallow guards against zustand v5 re-render loops when a selector returns an object.
export const useProject = <T,>(selector: (s: ProjectState) => T): T =>
  useStore(projectStore, useShallow(selector));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/store.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/useProject.ts tests/store.test.ts
git commit -m "feat(store): zustand project state with localStorage + json round-trip"
```

---

### Task 7: HandwritingCanvas component (state-driven render)

**Files:**
- Create: `likhit/src/components/HandwritingCanvas.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/HandwritingCanvas.tsx
import { useEffect, useRef } from "react";
import { useProject } from "../store/useProject";
import { segmentClusters } from "../engine/segment";
import { layoutPage } from "../engine/layout";
import { drawTemplate, drawClusters, makeMeasure } from "../engine/render";

const DPI = 96;

export function HandwritingCanvas({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement> }) {
  const localRef = useRef<HTMLCanvasElement>(null);
  const ref = canvasRef ?? localRef;
  const { text, seed, moods, moodId, templates, templateId, lineOverrides } = useProject((s) => ({
    text: s.text, seed: s.seed, moods: s.moods, moodId: s.moodId,
    templates: s.templates, templateId: s.templateId, lineOverrides: s.lineOverrides,
  }));

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const mood = moods.find((m) => m.id === moodId)!;
    const template = templates.find((t) => t.id === templateId)!;
    canvas.width = (template.widthMm / 25.4) * DPI;
    canvas.height = (template.heightMm / 25.4) * DPI;

    let cancelled = false;
    (document as any).fonts.ready.then(() => {
      if (cancelled) return;
      const clusters = segmentClusters(text);
      const laid = layoutPage(clusters, {
        mood, template, seed, lineOverrides, measure: makeMeasure(ctx), dpi: DPI,
      });
      drawTemplate(ctx, template, DPI);
      drawClusters(ctx, laid, mood);
    });
    return () => { cancelled = true; };
  }, [text, seed, moods, moodId, templates, templateId, lineOverrides, ref]);

  return <canvas ref={ref} style={{ width: 480, border: "1px solid #ccc", boxShadow: "0 1px 6px rgba(0,0,0,.15)" }} />;
}
```

- [ ] **Step 2: Visual verification**

Used by `App.tsx` in Task 9. Verified there.

- [ ] **Step 3: Commit**

```bash
git add src/components/HandwritingCanvas.tsx
git commit -m "feat(ui): state-driven HandwritingCanvas component"
```

---

### Task 8: SourceEditor + MoodControls components

**Files:**
- Create: `likhit/src/components/SourceEditor.tsx`
- Create: `likhit/src/components/MoodControls.tsx`

- [ ] **Step 1: Write SourceEditor**

```tsx
// src/components/SourceEditor.tsx
import { useProject } from "../store/useProject";

export function SourceEditor() {
  const text = useProject((s) => s.text);
  const setText = useProject((s) => s.setText);
  return (
    <textarea
      value={text}
      onChange={(e) => setText(e.target.value)}
      placeholder="พิมพ์ข้อความที่นี่ / type here…"
      rows={14}
      style={{ width: "100%", fontFamily: "monospace", fontSize: 14, padding: 8 }}
    />
  );
}
```

- [ ] **Step 2: Write MoodControls (sliders + save-as-my-mood)**

```tsx
// src/components/MoodControls.tsx
import { useProject } from "../store/useProject";
import type { Mood } from "../engine/types";

const SLIDERS: { key: keyof Mood; label: string; min: number; max: number; step: number }[] = [
  { key: "fontPx", label: "ขนาด (size)", min: 16, max: 56, step: 1 },
  { key: "jitter", label: "ความสั่น (wobble)", min: 0, max: 1, step: 0.01 },
  { key: "slope", label: "ความเอียงบรรทัด (slope°)", min: 0, max: 6, step: 0.1 },
  { key: "spacing", label: "ระยะห่าง (spacing)", min: 0, max: 8, step: 0.1 },
  { key: "spacingJitter", label: "สุ่มระยะห่าง", min: 0, max: 1, step: 0.01 },
  { key: "sizeVar", label: "สุ่มขนาด", min: 0, max: 1, step: 0.01 },
  { key: "baselineDrift", label: "เลื่อนแนวบรรทัด", min: 0, max: 6, step: 0.1 },
  { key: "inkDarkness", label: "ความเข้มหมึก", min: 0.3, max: 1, step: 0.01 },
];

export function MoodControls() {
  const { moods, moodId, setMoodId, updateActiveMood, saveMood } = useProject((s) => ({
    moods: s.moods, moodId: s.moodId, setMoodId: s.setMoodId,
    updateActiveMood: s.updateActiveMood, saveMood: s.saveMood,
  }));
  const mood = moods.find((m) => m.id === moodId)!;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label>
        ลายมือ (mood):{" "}
        <select value={moodId} onChange={(e) => setMoodId(e.target.value)}>
          {moods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </label>

      <label>
        สีหมึก (ink):{" "}
        <input type="color" value={mood.inkColor}
          onChange={(e) => updateActiveMood({ inkColor: e.target.value })} />
      </label>

      {SLIDERS.map((s) => (
        <label key={String(s.key)} style={{ fontSize: 12 }}>
          {s.label}: {Number(mood[s.key]).toFixed(2)}
          <input type="range" min={s.min} max={s.max} step={s.step}
            value={Number(mood[s.key])}
            onChange={(e) => updateActiveMood({ [s.key]: Number(e.target.value) } as Partial<Mood>)}
            style={{ width: "100%" }} />
        </label>
      ))}

      <button onClick={() => {
        const name = prompt("ตั้งชื่อ mood ใหม่ / name this mood:");
        if (name) saveMood({ ...mood, id: "", name });
      }}>
        💾 บันทึกเป็น mood ของฉัน (save as my mood)
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/SourceEditor.tsx src/components/MoodControls.tsx
git commit -m "feat(ui): source editor and mood sliders with save-as-my-mood"
```

---

### Task 9: Assemble the editor in App.tsx + live-edit verification

**Files:**
- Modify: `likhit/src/App.tsx`

- [ ] **Step 1: Replace App.tsx with the real layout**

```tsx
// src/App.tsx
import { useRef } from "react";
import { HandwritingCanvas } from "./components/HandwritingCanvas";
import { SourceEditor } from "./components/SourceEditor";
import { MoodControls } from "./components/MoodControls";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, padding: 16, height: "100vh" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, overflow: "auto" }}>
        <h2 style={{ margin: 0 }}>ลิขิต · Likhit</h2>
        <SourceEditor />
        <MoodControls />
      </div>
      <div style={{ overflow: "auto", background: "#eef0f3", padding: 16, display: "flex", justifyContent: "center" }}>
        <HandwritingCanvas canvasRef={canvasRef} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Live-edit verification**

Run: `npm run dev`. Confirm:
1. Typing in the textarea updates the handwriting live.
2. Dragging any slider visibly changes the page.
3. Changing ink color recolors the handwriting.
4. "Save as my mood" adds an entry to the dropdown and selects it.
5. Reloading the page restores your text/mood (localStorage persistence).

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat(ui): assemble live handwriting editor"
```

---

## Milestone 2 — Page & Layout Controls

Templates already render (Task 5). This milestone adds the UI to pick them and to manually override per-line start/spacing (the "both" decision: auto-jitter default + manual control).

### Task 10: TemplatePicker component

**Files:**
- Create: `likhit/src/components/TemplatePicker.tsx`
- Modify: `likhit/src/App.tsx` (mount it)

- [ ] **Step 1: Write TemplatePicker**

```tsx
// src/components/TemplatePicker.tsx
import { useProject } from "../store/useProject";

export function TemplatePicker() {
  const { templates, templateId, setTemplateId } = useProject((s) => ({
    templates: s.templates, templateId: s.templateId, setTemplateId: s.setTemplateId,
  }));
  return (
    <label>
      กระดาษ (paper):{" "}
      <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
        {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
    </label>
  );
}
```

- [ ] **Step 2: Mount it in App.tsx** (above `<MoodControls />`)

```tsx
import { TemplatePicker } from "./components/TemplatePicker";
// …inside the left column, before <MoodControls />:
<TemplatePicker />
```

- [ ] **Step 3: Verify** — switching paper changes background to blank/lined/grid and resizes the page. Confirm baselines on lined paper sit *near but not perfectly on* the printed rules.

- [ ] **Step 4: Commit**

```bash
git add src/components/TemplatePicker.tsx src/App.tsx
git commit -m "feat(ui): template/paper picker"
```

---

### Task 11: Per-line manual overrides (LineOverrides component)

**Files:**
- Create: `likhit/src/components/LineOverrides.tsx`
- Modify: `likhit/src/App.tsx` (mount it)

- [ ] **Step 1: Write LineOverrides**

```tsx
// src/components/LineOverrides.tsx
import { useProject } from "../store/useProject";

export function LineOverrides() {
  const { text, lineOverrides, setLineOverride, clearLineOverride } = useProject((s) => ({
    text: s.text, lineOverrides: s.lineOverrides,
    setLineOverride: s.setLineOverride, clearLineOverride: s.clearLineOverride,
  }));
  const lineCount = Math.max(1, text.split("\n").length);

  return (
    <details>
      <summary>ปรับแต่งรายบรรทัด (per-line override)</summary>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
        {Array.from({ length: lineCount }).map((_, i) => {
          const ov = lineOverrides.find((o) => o.lineIndex === i);
          return (
            <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ width: 48 }}>บรรทัด {i + 1}</span>
              <label>start mm
                <input type="number" style={{ width: 56 }} value={ov?.startXMm ?? ""}
                  onChange={(e) => setLineOverride({
                    lineIndex: i, gapMm: ov?.gapMm,
                    startXMm: e.target.value === "" ? undefined : Number(e.target.value),
                  })} />
              </label>
              <label>gap mm
                <input type="number" style={{ width: 56 }} value={ov?.gapMm ?? ""}
                  onChange={(e) => setLineOverride({
                    lineIndex: i, startXMm: ov?.startXMm,
                    gapMm: e.target.value === "" ? undefined : Number(e.target.value),
                  })} />
              </label>
              {ov && <button onClick={() => clearLineOverride(i)}>↺</button>}
            </div>
          );
        })}
      </div>
    </details>
  );
}
```

- [ ] **Step 2: Mount it in App.tsx** (after `<MoodControls />`)

```tsx
import { LineOverrides } from "./components/LineOverrides";
// …after <MoodControls />:
<LineOverrides />
```

- [ ] **Step 3: Verify** — setting a `start mm` on line 2 visibly indents that line; setting `gap mm` changes the space above it; the `↺` button restores auto-jitter for that line.

- [ ] **Step 4: Commit**

```bash
git add src/components/LineOverrides.tsx src/App.tsx
git commit -m "feat(ui): per-line manual start/gap overrides"
```

---

## Milestone 3 — Export & Persistence

PNG + PDF export with Level 2 material realism + subtle Level 3 photo mode, print-friendly output, and project save/load files.

### Task 12: Realism post-processing (`export/realism.ts`)

Operates on an offscreen canvas: paper grain, then optional subtle photo simulation (lighting gradient + noise + tiny rotation). Kept deliberately restrained.

**Files:**
- Create: `likhit/src/export/realism.ts`

- [ ] **Step 1: Write realism helpers**

```ts
// src/export/realism.ts

/** Level 2: subtle paper grain via low-alpha noise speckle. */
export function applyPaperGrain(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 10; // ±5 brightness
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

/** Level 3 (subtle): soft diagonal lighting gradient overlay. */
export function applyLighting(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "rgba(255,255,255,0.10)");
  g.addColorStop(0.5, "rgba(255,255,255,0)");
  g.addColorStop(1, "rgba(0,0,0,0.06)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export interface PhotoOptions {
  grain: boolean;
  lighting: boolean;
}

/** Apply the chosen realism layers in place. */
export function applyRealism(ctx: CanvasRenderingContext2D, w: number, h: number, opts: PhotoOptions): void {
  if (opts.grain) applyPaperGrain(ctx, w, h);
  if (opts.lighting) applyLighting(ctx, w, h);
}
```

- [ ] **Step 2: Add realism toggles to the canvas pipeline**

First, declare realism on the persisted shape. In `src/engine/types.ts`, add to `interface Project` (so saved JSON round-trips it):
```ts
  realism: { grain: boolean; lighting: boolean };
```

Then add a `realism` slice to the store (`store/useProject.ts`). Add to `ProjectState`:
```ts
realism: { grain: boolean; lighting: boolean };
setRealism: (patch: Partial<{ grain: boolean; lighting: boolean }>) => void;
```
In `initial()` add `realism: { grain: true, lighting: false },` and in the store body add:
```ts
setRealism: (patch) => set({ realism: { ...get().realism, ...patch } }),
```
In `toProjectJson`, include realism in the constructed `Project`:
```ts
realism: s.realism,
```
In `loadProjectJson`, restore it (defaulting for older files):
```ts
realism: p.realism ?? { grain: true, lighting: false },
```

Then in `HandwritingCanvas.tsx`, after `drawClusters(...)`, apply realism:
```ts
import { applyRealism } from "../export/realism";
// …add `realism` to the useProject selector, then after drawClusters:
applyRealism(ctx, canvas.width, canvas.height, realism);
```

- [ ] **Step 3: Add toggle UI (RealismControls)**

Create `src/components/RealismControls.tsx`:
```tsx
import { useProject } from "../store/useProject";

export function RealismControls() {
  const grain = useProject((s) => s.realism.grain);
  const lighting = useProject((s) => s.realism.lighting);
  const setRealism = useProject((s) => s.setRealism);
  return (
    <fieldset style={{ fontSize: 12 }}>
      <legend>ความสมจริง (realism)</legend>
      <label><input type="checkbox" checked={grain}
        onChange={(e) => setRealism({ grain: e.target.checked })} /> เนื้อกระดาษ (paper grain)</label><br />
      <label><input type="checkbox" checked={lighting}
        onChange={(e) => setRealism({ lighting: e.target.checked })} /> แสงเงา (photo lighting)</label>
    </fieldset>
  );
}
```
Mount it in `App.tsx` after `<MoodControls />` (and before `<LineOverrides />`):
```tsx
import { RealismControls } from "./components/RealismControls";
// …
<RealismControls />
```

- [ ] **Step 4: Verify** — toggling grain adds a faint paper texture; lighting adds a gentle corner shadow. Both stay subtle (no harsh vignette).

- [ ] **Step 5: Commit**

```bash
git add src/export/realism.ts src/store/useProject.ts src/engine/types.ts src/components/HandwritingCanvas.tsx src/components/RealismControls.tsx src/App.tsx
git commit -m "feat(export): level-2 grain + subtle level-3 lighting realism with toggles"
```

---

### Task 13: PNG + PDF export (`export/png.ts`, `export/pdf.ts`)

**Files:**
- Create: `likhit/src/export/png.ts`
- Create: `likhit/src/export/pdf.ts`

- [ ] **Step 1: Write PNG export**

```ts
// src/export/png.ts
export function exportPng(canvas: HTMLCanvasElement, filename = "likhit.png"): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}
```

- [ ] **Step 2: Write PDF export (single page, sized to template)**

```ts
// src/export/pdf.ts
import { PDFDocument } from "pdf-lib";

const MM_PER_PT = 25.4 / 72;

/** Embed the canvas as a full-page image in a correctly-sized PDF. */
export async function exportPdf(
  canvas: HTMLCanvasElement,
  widthMm: number,
  heightMm: number,
  filename = "likhit.pdf",
): Promise<void> {
  const pngDataUrl = canvas.toDataURL("image/png");
  const pngBytes = await fetch(pngDataUrl).then((r) => r.arrayBuffer());

  const pdf = await PDFDocument.create();
  const pageW = widthMm / MM_PER_PT;
  const pageH = heightMm / MM_PER_PT;
  const page = pdf.addPage([pageW, pageH]);
  const img = await pdf.embedPng(pngBytes);
  page.drawImage(img, { x: 0, y: 0, width: pageW, height: pageH });

  const bytes = await pdf.save();
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/export/png.ts src/export/pdf.ts
git commit -m "feat(export): PNG and PDF download"
```

---

### Task 14: Toolbar — export, save/load project, print

**Files:**
- Create: `likhit/src/components/Toolbar.tsx`
- Modify: `likhit/src/App.tsx` (mount it, pass canvasRef)

- [ ] **Step 1: Write Toolbar**

```tsx
// src/components/Toolbar.tsx
import { useProject, projectStore } from "../store/useProject";
import { exportPng } from "../export/png";
import { exportPdf } from "../export/pdf";

export function Toolbar({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement> }) {
  const { templates, templateId } = useProject((s) => ({ templates: s.templates, templateId: s.templateId }));
  const template = templates.find((t) => t.id === templateId)!;

  const saveProject = () => {
    const json = projectStore.getState().toProjectJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "likhit-project.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const loadProject = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => projectStore.getState().loadProjectJson(String(reader.result));
    reader.readAsText(file);
  };

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button onClick={() => canvasRef.current && exportPng(canvasRef.current)}>⬇ PNG</button>
      <button onClick={() => canvasRef.current && exportPdf(canvasRef.current, template.widthMm, template.heightMm)}>⬇ PDF</button>
      <button onClick={() => window.print()}>🖨 Print</button>
      <button onClick={saveProject}>💾 Save project</button>
      <label style={{ cursor: "pointer", border: "1px solid #888", padding: "2px 8px", borderRadius: 4 }}>
        📂 Load project
        <input type="file" accept="application/json" style={{ display: "none" }}
          onChange={(e) => e.target.files?.[0] && loadProject(e.target.files[0])} />
      </label>
    </div>
  );
}
```

- [ ] **Step 2: Mount Toolbar in App.tsx** (top of the left column, after the `<h2>`):

```tsx
import { Toolbar } from "./components/Toolbar";
// …after <h2>…:
<Toolbar canvasRef={canvasRef} />
```

- [ ] **Step 3: Add a print stylesheet** so "Print" outputs just the page.

Create `likhit/src/print.css`:
```css
@media print {
  body * { visibility: hidden; }
  canvas, canvas * { visibility: visible; }
  canvas { position: absolute; left: 0; top: 0; width: auto !important; }
}
```
Import it in `src/main.tsx`: `import "./print.css";`

- [ ] **Step 4: End-to-end verification**

Run: `npm run dev`. Confirm:
1. **PNG** downloads and opens showing the handwriting page with realism applied.
2. **PDF** downloads, opens at the correct paper size (A4 = 210×297mm).
3. **Print** preview shows only the page (no UI), supporting the print-and-photograph realism path.
4. **Save project** downloads `likhit-project.json`; editing then **Load project** restores the exact text/mood/overrides/seed → proving "re-editable = reopen the project file".

- [ ] **Step 5: Commit**

```bash
git add src/components/Toolbar.tsx src/App.tsx src/print.css src/main.tsx
git commit -m "feat(ui): toolbar with PNG/PDF/print/save/load project"
```

---

### Task 15: Release hardening — self-host fonts (true offline/client-only)

**Files:**
- Create: `likhit/public/fonts/` (woff2 files)
- Modify: `likhit/public/fonts.css`

- [ ] **Step 1: Download the woff2 files** for Itim, Mali, Sriracha, Charmonman, Caveat, Shadows Into Light, Gloria Hallelujah into `likhit/public/fonts/`.

- [ ] **Step 2: Replace `public/fonts.css`** with self-hosted `@font-face` rules:

```css
@font-face { font-family: "Itim";  src: url("/fonts/Itim-Regular.woff2") format("woff2"); font-display: swap; }
@font-face { font-family: "Mali";  src: url("/fonts/Mali-Regular.woff2") format("woff2"); font-display: swap; }
@font-face { font-family: "Sriracha"; src: url("/fonts/Sriracha-Regular.woff2") format("woff2"); font-display: swap; }
@font-face { font-family: "Charmonman"; src: url("/fonts/Charmonman-Regular.woff2") format("woff2"); font-display: swap; }
@font-face { font-family: "Caveat"; src: url("/fonts/Caveat-Regular.woff2") format("woff2"); font-display: swap; }
@font-face { font-family: "Shadows Into Light"; src: url("/fonts/ShadowsIntoLight-Regular.woff2") format("woff2"); font-display: swap; }
@font-face { font-family: "Gloria Hallelujah"; src: url("/fonts/GloriaHallelujah-Regular.woff2") format("woff2"); font-display: swap; }
```
Remove the Google Fonts `<link>` and `@import`.

- [ ] **Step 3: Verify** — disconnect from the internet, reload: handwriting still renders in the correct fonts. Confirms the app is fully client-only with no network dependency (the privacy guarantee we promised).

- [ ] **Step 4: Build + deploy to Vercel (static)**

Run: `npm run build` — Expected: clean `dist/`.
Deploy `dist/` to Vercel (static site). Verify the deployed URL renders and exports.

- [ ] **Step 5: Commit**

```bash
git add public/fonts public/fonts.css index.html
git commit -m "chore: self-host fonts for offline client-only operation"
```

---

## v1 Definition of Done

- Type Thai + English + math → convincing handwriting on a chosen paper template (Milestone 0 GO confirmed).
- Fully custom moods: every parameter on a slider, save/load your own; 4 Thai starter presets.
- Auto-jittered baselines + per-line manual start/gap override.
- Export PNG + PDF (correct paper size) + Level-2 grain + subtle Level-3 lighting + print-friendly.
- Save/Load project `.json`; localStorage persistence; reopening a project restores everything (re-editable).
- All `engine/*` and `store/*` logic unit-tested (`npm run test` green).
- Fully client-only, no login, fonts self-hosted, deployed static to Vercel.

## Deferred from v1 (intentional, tracked here)

- **Per-selection mood override** ("start บรรจง, get ขี้เกียจ toward the bottom"). The engine already renders per-cluster, so this is cheap *later*, but it needs source-range tracking + UI that would bloat v1. Add as a v1.x enhancement: store `Array<{ start: number; end: number; moodId: string }>` and have `layoutPage` pick the mood per cluster index. v1 ships global-mood only.

## Future plans (separate documents)

- **v1.5 — Photo import (option C):** upload a real paper photo → mark 4 corners + line guide → perspective (homography) transform maps baselines onto the warped page → composite ink with multiply/overlay so lighting matches. This is the "write on real paper photo" realism path.
- **v2 — Capture your own handwriting (option A):** per-glyph SVG capture per mood, a Thai anchor/attachment system (consonant anchor points for vowels/tone marks), glyph mixing for non-repetition, plus optional OCR import (stretch A) and Supabase accounts/sync.
```