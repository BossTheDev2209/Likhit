// src/store/useProject.ts
import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { Mood, Project, Template, LineOverride } from "../engine/types";
import { STARTER_MOODS } from "../engine/moods";
import { STARTER_TEMPLATES } from "../engine/templates";

export interface ProjectState {
  schemaVersion: 1;
  seed: number;
  text: string;
  moodId: string;
  moods: Mood[];
  templateId: string;
  templates: Template[];
  lineOverrides: LineOverride[];

  setText: (t: string) => void;
  setMoodId: (id: string) => void;
  setTemplateId: (id: string) => void;
  updateActiveMood: (patch: Partial<Mood>) => void;
  saveMood: (mood: Mood) => void;          // empty id => create new
  setLineOverride: (o: LineOverride) => void;
  clearLineOverride: (lineIndex: number) => void;
  toProjectJson: () => string;
  loadProjectJson: (json: string) => void;
}

const STORAGE_KEY = "likhit.project.v1";

function initial(): Project {
  return {
    schemaVersion: 1,
    seed: Math.floor(Math.random() * 1_000_000),
    text: "",
    moodId: STARTER_MOODS[1].id,
    moods: STARTER_MOODS.map((m) => ({ ...m })),
    templateId: STARTER_TEMPLATES[1].id,
    templates: STARTER_TEMPLATES.map((t) => ({ ...t })),
    lineOverrides: [],
  };
}

export function createProjectState(persist = false) {
  const start = initial();
  const store = createStore<ProjectState>((set, get) => ({
    ...start,
    setText: (text) => set({ text }),
    setMoodId: (moodId) => set({ moodId }),
    setTemplateId: (templateId) => set({ templateId }),
    updateActiveMood: (patch) =>
      set({ moods: get().moods.map((m) => (m.id === get().moodId ? { ...m, ...patch } : m)) }),
    saveMood: (mood) => {
      if (mood.id === "") {
        const id = `custom-${Date.now()}`;
        const created = { ...mood, id };
        set({ moods: [...get().moods, created], moodId: id });
      } else {
        set({ moods: get().moods.map((m) => (m.id === mood.id ? mood : m)) });
      }
    },
    setLineOverride: (o) =>
      set({ lineOverrides: [...get().lineOverrides.filter((x) => x.lineIndex !== o.lineIndex), o] }),
    clearLineOverride: (lineIndex) =>
      set({ lineOverrides: get().lineOverrides.filter((x) => x.lineIndex !== lineIndex) }),
    toProjectJson: () => {
      const s = get();
      const proj: Project = {
        schemaVersion: 1, seed: s.seed, text: s.text, moodId: s.moodId,
        moods: s.moods, templateId: s.templateId, templates: s.templates,
        lineOverrides: s.lineOverrides,
      };
      return JSON.stringify(proj, null, 2);
    },
    loadProjectJson: (json) => {
      const p = JSON.parse(json) as Project;
      if (p.schemaVersion !== 1) throw new Error("Unsupported project version");
      set({
        seed: p.seed, text: p.text, moodId: p.moodId, moods: p.moods,
        templateId: p.templateId, templates: p.templates, lineOverrides: p.lineOverrides,
      });
    },
  }));

  if (persist && typeof localStorage !== "undefined" && typeof localStorage.getItem === "function") {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { store.getState().loadProjectJson(saved); } catch { /* ignore corrupt save */ }
    }
    store.subscribe((state) => {
      if (typeof localStorage !== "undefined" && typeof localStorage.setItem === "function") {
        localStorage.setItem(STORAGE_KEY, state.toProjectJson());
      }
    });
  }

  return store;
}

// App-wide singleton (persisted in the browser).
export const projectStore = createProjectState(true);
// useShallow guards against zustand v5 re-render loops when a selector returns an object.
export const useProject = <T,>(selector: (s: ProjectState) => T): T =>
  useStore(projectStore, useShallow(selector));
