// src/components/HandwritingCanvas.tsx
import { useEffect, useRef } from "react";
import { useProject } from "../store/useProject";
import { segmentClusters } from "../engine/segment";
import { layoutPage } from "../engine/layout";
import { drawTemplate, drawClusters, makeMeasure } from "../engine/render";

const DPI = 96;

export function HandwritingCanvas({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement | null> }) {
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
