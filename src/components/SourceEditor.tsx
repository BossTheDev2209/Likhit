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
