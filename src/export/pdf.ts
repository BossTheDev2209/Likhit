// src/export/pdf.ts
import { PDFDocument } from "pdf-lib";

const MM_PER_PT = 25.4 / 72;

/** Embed the canvas as a full-page image in a correctly-sized PDF. */
export async function exportPdf(
  canvas: HTMLCanvasElement,
  widthMm: number,
  heightMm: number,
  filename = "likhit.pdf",
): Promise<void> {
  const pngDataUrl = canvas.toDataURL("image/png");
  const pngBytes = await fetch(pngDataUrl).then((r) => r.arrayBuffer());

  const pdf = await PDFDocument.create();
  const pageW = widthMm / MM_PER_PT;
  const pageH = heightMm / MM_PER_PT;
  const page = pdf.addPage([pageW, pageH]);
  const img = await pdf.embedPng(pngBytes);
  page.drawImage(img, { x: 0, y: 0, width: pageW, height: pageH });

  const bytes = await pdf.save();
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
