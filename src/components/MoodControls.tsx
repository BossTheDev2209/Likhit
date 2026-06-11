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
