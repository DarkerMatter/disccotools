import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyRecipe, type Recipe } from '@disccotools/shared';
import { useRecipeStore } from './useRecipeStore.js';

beforeEach(() => {
  useRecipeStore.setState({
    recipe: createEmptyRecipe(),
    selectedId: null,
    history: [],
    future: [],
    currentSave: null,
  });
});

function variantRecipe(): Recipe {
  return { ...createEmptyRecipe(), shape: 'square' };
}

describe('useRecipeStore', () => {
  it('starts with an empty recipe, no selection, empty history', () => {
    const s = useRecipeStore.getState();
    expect(s.recipe.layers).toEqual([]);
    expect(s.selectedId).toBeNull();
    expect(s.history).toEqual([]);
    expect(s.future).toEqual([]);
    expect(s.canUndo()).toBe(false);
    expect(s.canRedo()).toBe(false);
  });

  it('setRecipe pushes previous recipe to history', () => {
    const initial = useRecipeStore.getState().recipe;
    useRecipeStore.getState().setRecipe(variantRecipe());
    const s = useRecipeStore.getState();
    expect(s.recipe.shape).toBe('square');
    expect(s.history).toHaveLength(1);
    expect(s.history[0]).toEqual(initial);
    expect(s.canUndo()).toBe(true);
  });

  it('resetTo clears history and selection', () => {
    useRecipeStore.getState().setRecipe(variantRecipe());
    useRecipeStore.getState().setSelection('l1');
    useRecipeStore.getState().resetTo(createEmptyRecipe());
    const s = useRecipeStore.getState();
    expect(s.history).toEqual([]);
    expect(s.future).toEqual([]);
    expect(s.selectedId).toBeNull();
  });

  it('undo restores the previous recipe and moves current to future', () => {
    const initial = useRecipeStore.getState().recipe;
    useRecipeStore.getState().setRecipe(variantRecipe());
    useRecipeStore.getState().undo();
    const s = useRecipeStore.getState();
    expect(s.recipe).toEqual(initial);
    expect(s.future).toHaveLength(1);
    expect(s.future[0]?.shape).toBe('square');
  });

  it('redo replays a previously undone change', () => {
    useRecipeStore.getState().setRecipe(variantRecipe());
    useRecipeStore.getState().undo();
    useRecipeStore.getState().redo();
    expect(useRecipeStore.getState().recipe.shape).toBe('square');
  });

  it('undo is a no-op when history is empty', () => {
    const before = useRecipeStore.getState();
    useRecipeStore.getState().undo();
    expect(useRecipeStore.getState().recipe).toEqual(before.recipe);
  });

  it('setRecipe after undo clears the future (redo no longer possible)', () => {
    useRecipeStore.getState().setRecipe(variantRecipe());
    useRecipeStore.getState().undo();
    useRecipeStore.getState().setRecipe({ ...createEmptyRecipe(), shape: 'rounded-square' });
    expect(useRecipeStore.getState().canRedo()).toBe(false);
  });

  it('setSelection updates without touching history', () => {
    useRecipeStore.getState().setSelection('layer-1');
    expect(useRecipeStore.getState().selectedId).toBe('layer-1');
    expect(useRecipeStore.getState().history).toEqual([]);
  });

  it('updateRecipe lets you produce a new recipe from the current one', () => {
    useRecipeStore.getState().updateRecipe((r) => ({ ...r, shape: 'square' }));
    expect(useRecipeStore.getState().recipe.shape).toBe('square');
    expect(useRecipeStore.getState().history).toHaveLength(1);
  });

  it('addIconLayer appends a layer and selects it', () => {
    useRecipeStore.getState().addIconLayer({ iconset: 'lucide', name: 'star' });
    const s = useRecipeStore.getState();
    expect(s.recipe.layers).toHaveLength(1);
    expect(s.recipe.layers[0]?.kind).toBe('icon');
    expect(s.selectedId).toBe(s.recipe.layers[0]!.id);
  });

  it('removeLayer removes and clears selection if it was selected', () => {
    useRecipeStore.getState().addIconLayer({ iconset: 'lucide', name: 'star' });
    const id = useRecipeStore.getState().recipe.layers[0]!.id;
    useRecipeStore.getState().removeLayer(id);
    expect(useRecipeStore.getState().recipe.layers).toHaveLength(0);
    expect(useRecipeStore.getState().selectedId).toBeNull();
  });

  it('addTextLayer appends a text layer and selects it', () => {
    useRecipeStore.getState().addTextLayer({ text: 'hi' });
    const s = useRecipeStore.getState();
    expect(s.recipe.layers).toHaveLength(1);
    const layer = s.recipe.layers[0]!;
    expect(layer.kind).toBe('text');
    if (layer.kind === 'text') expect(layer.text).toBe('hi');
    expect(s.selectedId).toBe(layer.id);
  });

  it('addImageLayer appends an image layer with default geometry and selects it', () => {
    useRecipeStore.getState().addImageLayer({ assetId: 'asset-1' });
    const s = useRecipeStore.getState();
    expect(s.recipe.layers).toHaveLength(1);
    const layer = s.recipe.layers[0]!;
    expect(layer.kind).toBe('image');
    if (layer.kind === 'image') expect(layer.assetId).toBe('asset-1');
    expect(layer.x).toBe(0.5);
    expect(layer.y).toBe(0.5);
    expect(layer.rotation).toBe(0);
    expect(layer.scale).toBe(1);
    expect(layer.opacity).toBe(1);
    expect(s.selectedId).toBe(layer.id);
  });

  it('addImageLayer pushes history (undo restores previous layer state)', () => {
    useRecipeStore.getState().addImageLayer({ assetId: 'asset-1' });
    expect(useRecipeStore.getState().history).toHaveLength(1);
    useRecipeStore.getState().undo();
    expect(useRecipeStore.getState().recipe.layers).toHaveLength(0);
  });

  it('updateLayer partially patches a layer in place', () => {
    useRecipeStore.getState().addIconLayer({ iconset: 'lucide', name: 'star' });
    const id = useRecipeStore.getState().recipe.layers[0]!.id;
    useRecipeStore.getState().updateLayer(id, { opacity: 0.3, rotation: 30 });
    const layer = useRecipeStore.getState().recipe.layers[0]!;
    expect(layer.opacity).toBe(0.3);
    expect(layer.rotation).toBe(30);
  });

  it('starts with currentSave null', () => {
    expect(useRecipeStore.getState().currentSave).toBeNull();
  });

  it('setCurrentSave updates without touching history', () => {
    useRecipeStore.getState().setCurrentSave({ id: 'sv1', name: 'a' });
    expect(useRecipeStore.getState().currentSave).toEqual({ id: 'sv1', name: 'a' });
    expect(useRecipeStore.getState().history).toEqual([]);
  });

  it('loadFromSave replaces recipe + currentSave and clears history/selection', () => {
    useRecipeStore.getState().setRecipe({ ...createEmptyRecipe(), shape: 'square' });
    useRecipeStore.getState().setSelection('layer-1');
    useRecipeStore.getState().loadFromSave({
      id: 'sv1',
      name: 'a',
      recipe: { ...createEmptyRecipe(), shape: 'rounded-square' },
    });
    const s = useRecipeStore.getState();
    expect(s.recipe.shape).toBe('rounded-square');
    expect(s.currentSave).toEqual({ id: 'sv1', name: 'a' });
    expect(s.history).toEqual([]);
    expect(s.selectedId).toBeNull();
  });
});
