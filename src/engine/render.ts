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
