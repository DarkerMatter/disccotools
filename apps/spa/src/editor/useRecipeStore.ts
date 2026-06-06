import { create } from 'zustand';
import {
  createEmptyRecipe,
  type Layer,
  type Recipe,
} from '@disccotools/shared';

const HISTORY_LIMIT = 50;

type EditorState = {
  recipe: Recipe;
  selectedId: string | null;
  currentSave: { id: string; name: string } | null;
  history: Recipe[];
  future: Recipe[];

  setRecipe: (r: Recipe) => void;
  resetTo: (r: Recipe) => void;
  updateRecipe: (mutator: (current: Recipe) => Recipe) => void;
  setSelection: (id: string | null) => void;
  setCurrentSave: (value: { id: string; name: string } | null) => void;
  loadFromSave: (save: { id: string; name: string; recipe: Recipe }) => void;
  addIconLayer: (args: { iconset: string; name: string; color?: string }) => void;
  addTextLayer: (args?: { text?: string }) => void;
  addImageLayer: (args: { assetId: string }) => void;
  updateLayer: <L extends Layer>(id: string, patch: Partial<L>) => void;
  removeLayer: (id: string) => void;
  moveLayer: (id: string, delta: number) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
};

export const useRecipeStore = create<EditorState>((set, get) => ({
  recipe: createEmptyRecipe(),
  selectedId: null,
  currentSave: null,
  history: [],
  future: [],

  setRecipe: (r) =>
    set((s) => ({
      recipe: r,
      history: [...s.history, s.recipe].slice(-HISTORY_LIMIT),
      future: [],
    })),

  resetTo: (r) =>
    set(() => ({
      recipe: r,
      history: [],
      future: [],
      selectedId: null,
    })),

  updateRecipe: (mutator) =>
    set((s) => ({
      recipe: mutator(s.recipe),
      history: [...s.history, s.recipe].slice(-HISTORY_LIMIT),
      future: [],
    })),

  setSelection: (id) => set(() => ({ selectedId: id })),

  setCurrentSave: (value) => set(() => ({ currentSave: value })),

  loadFromSave: (save) =>
    set(() => ({
      recipe: save.recipe,
      currentSave: { id: save.id, name: save.name },
      history: [],
      future: [],
      selectedId: null,
    })),

  addIconLayer: ({ iconset, name, color = '#ffffff' }) =>
    set((s) => {
      const id = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID()
        : `layer_${Math.random().toString(36).slice(2)}`;
      const layer = {
        id,
        kind: 'icon' as const,
        iconset,
        name,
        color: { kind: 'solid' as const, color },
        x: 0.5,
        y: 0.5,
        rotation: 0,
        scale: 1,
        opacity: 1,
      };
      return {
        recipe: {
          ...s.recipe,
          layers: [...s.recipe.layers, layer],
        },
        history: [...s.history, s.recipe].slice(-HISTORY_LIMIT),
        future: [],
        selectedId: id,
      };
    }),

  addTextLayer: ({ text = 'Text' } = {}) =>
    set((s) => {
      const id = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID()
        : `layer_${Math.random().toString(36).slice(2)}`;
      const layer = {
        id,
        kind: 'text' as const,
        text,
        font: 'system-ui',
        color: '#ffffff',
        size: 0.25,
        x: 0.5,
        y: 0.5,
        rotation: 0,
        scale: 1,
        opacity: 1,
      };
      return {
        recipe: {
          ...s.recipe,
          layers: [...s.recipe.layers, layer],
        },
        history: [...s.history, s.recipe].slice(-HISTORY_LIMIT),
        future: [],
        selectedId: id,
      };
    }),

  addImageLayer: ({ assetId }) =>
    set((s) => {
      const id = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID()
        : `layer_${Math.random().toString(36).slice(2)}`;
      const layer = {
        id,
        kind: 'image' as const,
        assetId,
        x: 0.5,
        y: 0.5,
        rotation: 0,
        scale: 1,
        opacity: 1,
      };
      return {
        recipe: {
          ...s.recipe,
          layers: [...s.recipe.layers, layer],
        },
        history: [...s.history, s.recipe].slice(-HISTORY_LIMIT),
        future: [],
        selectedId: id,
      };
    }),

  updateLayer: (id, patch) =>
    set((s) => ({
      recipe: {
        ...s.recipe,
        layers: s.recipe.layers.map((l) =>
          l.id === id ? ({ ...l, ...patch } as typeof l) : l,
        ),
      },
      history: [...s.history, s.recipe].slice(-HISTORY_LIMIT),
      future: [],
    })),

  removeLayer: (id) =>
    set((s) => ({
      recipe: {
        ...s.recipe,
        layers: s.recipe.layers.filter((l) => l.id !== id),
      },
      history: [...s.history, s.recipe].slice(-HISTORY_LIMIT),
      future: [],
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  moveLayer: (id, delta) =>
    set((s) => {
      const idx = s.recipe.layers.findIndex((l) => l.id === id);
      if (idx === -1) return s;
      const target = Math.max(0, Math.min(s.recipe.layers.length - 1, idx + delta));
      if (target === idx) return s;
      const next = [...s.recipe.layers];
      const [moved] = next.splice(idx, 1);
      next.splice(target, 0, moved!);
      return {
        recipe: { ...s.recipe, layers: next },
        history: [...s.history, s.recipe].slice(-HISTORY_LIMIT),
        future: [],
      };
    }),

  undo: () =>
    set((s) => {
      if (s.history.length === 0) return s;
      const prev = s.history[s.history.length - 1]!;
      return {
        recipe: prev,
        history: s.history.slice(0, -1),
        future: [s.recipe, ...s.future].slice(0, HISTORY_LIMIT),
      };
    }),

  redo: () =>
    set((s) => {
      if (s.future.length === 0) return s;
      const next = s.future[0]!;
      return {
        recipe: next,
        history: [...s.history, s.recipe].slice(-HISTORY_LIMIT),
        future: s.future.slice(1),
      };
    }),

  canUndo: () => get().history.length > 0,
  canRedo: () => get().future.length > 0,
}));
