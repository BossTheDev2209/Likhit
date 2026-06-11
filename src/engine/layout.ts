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
