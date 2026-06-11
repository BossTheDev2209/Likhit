// src/engine/templates.ts
import type { Template } from "./types";

export const STARTER_TEMPLATES: Template[] = [
  { id: "a4-blank", name: "A4 เปล่า", widthMm: 210, heightMm: 297, kind: "blank", ruleSpacingMm: 9, marginMm: 20 },
  { id: "a4-lined", name: "A4 มีเส้นบรรทัด", widthMm: 210, heightMm: 297, kind: "lined", ruleSpacingMm: 9, marginMm: 20 },
  { id: "a4-grid",  name: "A4 มีเส้นตาราง", widthMm: 210, heightMm: 297, kind: "grid",  ruleSpacingMm: 7, marginMm: 20 },
  { id: "a5-lined", name: "A5 มีเส้นบรรทัด", widthMm: 148, heightMm: 210, kind: "lined", ruleSpacingMm: 8, marginMm: 15 },
  { id: "letter-lined", name: "Letter มีเส้นบรรทัด", widthMm: 216, heightMm: 279, kind: "lined", ruleSpacingMm: 9, marginMm: 20 },
];
