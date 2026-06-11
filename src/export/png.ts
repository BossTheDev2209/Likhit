// src/export/png.ts
export function exportPng(canvas: HTMLCanvasElement, filename = "likhit.png"): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}
