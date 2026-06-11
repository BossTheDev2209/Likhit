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
