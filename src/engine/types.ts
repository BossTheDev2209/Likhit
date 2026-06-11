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
