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
  /** The persisted save being edited, if any. null = unsaved/new design. */
  currentSave: { id: string; name: string } | null;
  /** Past recipes for undo (newest at end). */
  history: Recipe[];
  /** Future recipes for redo (newest at start). */
  future: Recipe[];

  /** Replace the recipe and push the previous one onto the history stack. */
  setRecipe: (r: Recipe) => void;
  /** Replace the recipe WITHOUT pushing history (e.g., loading a saved doc). */
  resetTo: (r: Recipe) => void;
  /** Convenience: produce a new recipe from the current one. */
  updateRecipe: (mutator: (current: Recipe) => Recipe) => void;
  /** Selection is UI state, not undoable. */
  setSelection: (id: string | null) => void;
  /** Set the persisted save identity. Does not push history. */
  setCurrentSave: (value: { id: string; name: string } | null) => void;
  /** Convenience for /editor/:id load: swap recipe and identity together. */
  loadFromSave: (save: { id: string; name: string; recipe: Recipe }) => void;
  /** Append a new icon layer with default geometry and select it. */
  addIconLayer: (args: { iconset: string; name: string; color?: string }) => void;
  /** Append a default text layer and select it. */
  addTextLayer: (args?: { text?: string }) => void;
  /** Append a new image layer referencing the given asset and select it. */
  addImageLayer: (args: { assetId: string }) => void;
  /** Partial update of an existing layer. */
  updateLayer: <L extends Layer>(id: string, patch: Partial<L>) => void;
  /** Remove a layer by id. Clears selection if it was the selected one. */
  removeLayer: (id: string) => void;
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
