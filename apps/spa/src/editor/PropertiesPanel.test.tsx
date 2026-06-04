import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyRecipe } from '@disccotools/shared';
import { useRecipeStore } from './useRecipeStore.js';
import { PropertiesPanel } from './PropertiesPanel.js';

beforeEach(() => {
  useRecipeStore.setState({
    recipe: createEmptyRecipe(),
    selectedId: null,
    history: [],
    future: [],
  });
});

describe('<PropertiesPanel />', () => {
  it('shows a hint when no layer is selected', () => {
    render(<PropertiesPanel />);
    expect(screen.getByText(/select a layer/i)).toBeInTheDocument();
  });

  it('shows icon-specific color input when an icon layer is selected', () => {
    useRecipeStore.getState().addIconLayer({ iconset: 'lucide', name: 'star' });
    render(<PropertiesPanel />);
    expect(screen.getByLabelText(/icon color/i)).toBeInTheDocument();
  });

  it('shows text-specific fields when a text layer is selected', () => {
    useRecipeStore.getState().addTextLayer({ text: 'hello' });
    render(<PropertiesPanel />);
    expect(screen.getByLabelText(/text content/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/font family/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/text color/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^size$/i)).toBeInTheDocument();
  });

  it('updates opacity on slider change', () => {
    useRecipeStore.getState().addIconLayer({ iconset: 'lucide', name: 'star' });
    render(<PropertiesPanel />);
    const slider = screen.getByLabelText(/^opacity$/i);
    fireEvent.change(slider, { target: { value: '50' } });
    const id = useRecipeStore.getState().selectedId!;
    const layer = useRecipeStore.getState().recipe.layers.find((l) => l.id === id)!;
    expect(layer.opacity).toBe(0.5);
  });

  it('updates rotation on slider change', () => {
    useRecipeStore.getState().addIconLayer({ iconset: 'lucide', name: 'star' });
    render(<PropertiesPanel />);
    const slider = screen.getByLabelText(/^rotation$/i);
    fireEvent.change(slider, { target: { value: '45' } });
    const id = useRecipeStore.getState().selectedId!;
    const layer = useRecipeStore.getState().recipe.layers.find((l) => l.id === id)!;
    expect(layer.rotation).toBe(45);
  });

  it('updates X position on slider change', () => {
    useRecipeStore.getState().addIconLayer({ iconset: 'lucide', name: 'star' });
    render(<PropertiesPanel />);
    const slider = screen.getByLabelText(/^x$/i);
    fireEvent.change(slider, { target: { value: '75' } });
    const id = useRecipeStore.getState().selectedId!;
    const layer = useRecipeStore.getState().recipe.layers.find((l) => l.id === id)!;
    expect(layer.x).toBe(0.75);
  });

  it('updates text content for a text layer', () => {
    useRecipeStore.getState().addTextLayer({ text: 'old' });
    render(<PropertiesPanel />);
    fireEvent.change(screen.getByLabelText(/text content/i), {
      target: { value: 'new' },
    });
    const id = useRecipeStore.getState().selectedId!;
    const layer = useRecipeStore.getState().recipe.layers.find((l) => l.id === id)!;
    expect(layer.kind === 'text' && layer.text).toBe('new');
  });

  it('switches an icon layer to gradient when the Gradient tab is clicked', async () => {
    useRecipeStore.getState().addIconLayer({ iconset: 'lucide', name: 'star' });
    render(<PropertiesPanel />);
    await userEvent.click(screen.getByRole('button', { name: /gradient/i }));
    const id = useRecipeStore.getState().selectedId!;
    const layer = useRecipeStore.getState().recipe.layers.find((l) => l.id === id)!;
    expect(layer.kind === 'icon' && layer.color.kind).toBe('gradient');
  });

  it('shows the image-layer hint when an image layer is selected', () => {
    // Manually inject an image layer into the store; the helpers don't expose addImageLayer yet (Task 3 adds it).
    useRecipeStore.setState((s) => {
      const layer = {
        id: 'im1', kind: 'image' as const, assetId: 'a1',
        x: 0.5, y: 0.5, rotation: 0, scale: 1, opacity: 1,
      };
      return {
        ...s,
        recipe: { ...s.recipe, layers: [layer] },
        selectedId: 'im1',
      };
    });
    render(<PropertiesPanel />);
    expect(screen.getByText(/image layer from your library/i)).toBeInTheDocument();
  });
});
