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
