// src/components/Toolbar.tsx
import { useProject, projectStore } from "../store/useProject";
import { exportPng } from "../export/png";
import { exportPdf } from "../export/pdf";

export function Toolbar({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement | null> }) {
  const { templates, templateId } = useProject((s) => ({ templates: s.templates, templateId: s.templateId }));
  const template = templates.find((t) => t.id === templateId)!;

  const saveProject = () => {
    const json = projectStore.getState().toProjectJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "likhit-project.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const loadProject = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => projectStore.getState().loadProjectJson(String(reader.result));
    reader.readAsText(file);
  };

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button onClick={() => canvasRef.current && exportPng(canvasRef.current)}>⬇ PNG</button>
      <button onClick={() => canvasRef.current && exportPdf(canvasRef.current, template.widthMm, template.heightMm)}>⬇ PDF</button>
      <button onClick={() => window.print()}>🖨 Print</button>
      <button onClick={saveProject}>💾 Save project</button>
      <label style={{ cursor: "pointer", border: "1px solid #888", padding: "2px 8px", borderRadius: 4 }}>
        📂 Load project
        <input type="file" accept="application/json" style={{ display: "none" }}
          onChange={(e) => e.target.files?.[0] && loadProject(e.target.files[0])} />
      </label>
    </div>
  );
}
