import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyRecipe, SHAPES_FOR_UI } from '@disccotools/shared';
import { useRecipeStore } from '../useRecipeStore.js';
import { ShapeControl } from './ShapeControl.js';

beforeEach(() => {
  useRecipeStore.setState({
    recipe: createEmptyRecipe(),
    selectedId: null,
    history: [],
    future: [],
  });
});

describe('<ShapeControl />', () => {
  it('renders all shape options', () => {
    render(<ShapeControl />);
    const group = screen.getByRole('radiogroup', { name: /canvas shape/i });
    const radios = within(group).getAllByRole('radio');
    expect(radios).toHaveLength(SHAPES_FOR_UI.length);
  });

  it('marks circle as checked by default', () => {
    render(<ShapeControl />);
    expect(screen.getByRole('radio', { name: /^circle$/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('updates the recipe shape on click', async () => {
    render(<ShapeControl />);
    await userEvent.click(screen.getByRole('radio', { name: /^star$/i }));
    expect(useRecipeStore.getState().recipe.shape).toBe('star');
  });
});
