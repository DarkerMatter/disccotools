import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyRecipe } from '@disccotools/shared';
import { CustomiseShapePanel } from './CustomiseShapePanel.js';
import { useRecipeStore } from './useRecipeStore.js';

const realMatchMedia = window.matchMedia;

beforeEach(() => {
  useRecipeStore.setState({
    recipe: createEmptyRecipe(),
    selectedId: null,
    history: [],
    future: [],
    currentSave: null,
  });
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: false,
    media: q,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  window.matchMedia = realMatchMedia;
});

describe('<CustomiseShapePanel />', () => {
  it('renders the shape grid and a resolution dropdown', () => {
    render(<CustomiseShapePanel />);
    expect(screen.getByRole('radiogroup', { name: /canvas shape/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /resolution/i })).toBeInTheDocument();
  });

  it('changes the shape when a shape tile is clicked', async () => {
    render(<CustomiseShapePanel />);
    await userEvent.click(screen.getByRole('radio', { name: /^hexagon$/i }));
    expect(useRecipeStore.getState().recipe.shape).toBe('hexagon');
  });

  it('changes the resolution when a different size is selected', async () => {
    render(<CustomiseShapePanel />);
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: /resolution/i }),
      '512',
    );
    expect(useRecipeStore.getState().recipe.size).toBe(512);
  });

  it('flips the background to transparent when the transparency toggle is on', async () => {
    render(<CustomiseShapePanel />);
    await userEvent.click(
      screen.getByRole('switch', { name: /use transparent background/i }),
    );
    expect(useRecipeStore.getState().recipe.background.kind).toBe('transparent');
  });

  it('flips the background to gradient when the gradient toggle is on', async () => {
    render(<CustomiseShapePanel />);
    await userEvent.click(
      screen.getByRole('switch', { name: /use gradient color/i }),
    );
    expect(useRecipeStore.getState().recipe.background.kind).toBe('gradient');
  });
});
