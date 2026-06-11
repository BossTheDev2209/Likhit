import { useProject } from "../store/useProject";

export function RealismControls() {
  const grain = useProject((s) => s.realism.grain);
  const lighting = useProject((s) => s.realism.lighting);
  const setRealism = useProject((s) => s.setRealism);
  return (
    <fieldset style={{ fontSize: 12 }}>
      <legend>ความสมจริง (realism)</legend>
      <label><input type="checkbox" checked={grain}
        onChange={(e) => setRealism({ grain: e.target.checked })} /> เนื้อกระดาษ (paper grain)</label><br />
      <label><input type="checkbox" checked={lighting}
        onChange={(e) => setRealism({ lighting: e.target.checked })} /> แสงเงา (photo lighting)</label>
    </fieldset>
  );
}
