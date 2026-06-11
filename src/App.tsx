// src/App.tsx
import { useRef } from "react";
import { HandwritingCanvas } from "./components/HandwritingCanvas";
import { SourceEditor } from "./components/SourceEditor";
import { MoodControls } from "./components/MoodControls";
import { TemplatePicker } from "./components/TemplatePicker";
import { LineOverrides } from "./components/LineOverrides";
import { RealismControls } from "./components/RealismControls";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, padding: 16, height: "100vh" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, overflow: "auto" }}>
        <h2 style={{ margin: 0 }}>ลิขิต · Likhit</h2>
        <SourceEditor />
        <TemplatePicker />
        <MoodControls />
        <RealismControls />
        <LineOverrides />
      </div>
      <div style={{ overflow: "auto", background: "#eef0f3", padding: 16, display: "flex", justifyContent: "center" }}>
        <HandwritingCanvas canvasRef={canvasRef} />
      </div>
    </div>
  );
}
