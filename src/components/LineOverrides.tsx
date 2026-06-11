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
