import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyRecipe } from '@disccotools/shared';
import { ResolutionPicker } from './ResolutionPicker.js';
import { useRecipeStore } from '../useRecipeStore.js';

beforeEach(() => {
  useRecipeStore.setState({
    recipe: createEmptyRecipe(),
    selectedId: null,
    history: [],
    future: [],
    currentSave: null,
  });
});

describe('<ResolutionPicker />', () => {
  it('renders a resolution dropdown wired to the recipe size', () => {
    render(<ResolutionPicker />);
    const select = screen.getByRole('combobox', { name: /resolution/i });
    expect(select).toBeInTheDocument();
    expect((select as HTMLSelectElement).value).toBe('256');
  });

  it('updates the recipe size when the user picks a different value', async () => {
    render(<ResolutionPicker />);
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: /resolution/i }),
      '512',
    );
    expect(useRecipeStore.getState().recipe.size).toBe(512);
  });
});
