// src/engine/moods.ts
import type { Mood } from "./types";

const FONTS = {
  neat:    { thai: "Itim",       latin: "Caveat",              math: "Caveat" },
  normal:  { thai: "Mali",       latin: "Shadows Into Light",  math: "Caveat" },
  loose:   { thai: "Sriracha",   latin: "Shadows Into Light",  math: "Caveat" },
  scrawl:  { thai: "Charmonman", latin: "Gloria Hallelujah",   math: "Caveat" },
};

export const STARTER_MOODS: Mood[] = [
  {
    id: "banchong", name: "ลายมือบรรจง", fonts: FONTS.neat, fontPx: 30,
    jitter: 0.12, slope: 0.6, spacing: 1.5, spacingJitter: 0.15,
    sizeVar: 0.06, baselineDrift: 0.8, inkDarkness: 0.95, inkColor: "#1b2a78",
  },
  {
    id: "pakati", name: "ลายมือปกติ", fonts: FONTS.normal, fontPx: 30,
    jitter: 0.3, slope: 1.2, spacing: 1.5, spacingJitter: 0.3,
    sizeVar: 0.12, baselineDrift: 1.6, inkDarkness: 0.92, inkColor: "#1b2a78",
  },
  {
    id: "kikiat", name: "ลายมือขี้เกียจ", fonts: FONTS.loose, fontPx: 31,
    jitter: 0.5, slope: 2.0, spacing: 1.0, spacingJitter: 0.45,
    sizeVar: 0.2, baselineDrift: 2.6, inkDarkness: 0.88, inkColor: "#1b2a78",
  },
  {
    id: "ripkhian", name: "ลายมือรีบเขียน", fonts: FONTS.scrawl, fontPx: 31,
    jitter: 0.75, slope: 3.2, spacing: 0.6, spacingJitter: 0.6,
    sizeVar: 0.28, baselineDrift: 3.4, inkDarkness: 0.82, inkColor: "#1b2a78",
  },
];
