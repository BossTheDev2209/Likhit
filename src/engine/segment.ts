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
