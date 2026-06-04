import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyRecipe } from '@disccotools/shared';
import { useRecipeStore } from '../useRecipeStore.js';
import { ResolutionControl } from './ResolutionControl.js';

// Note: /resolution/i would also match the surrounding <section aria-label="Resolution">
// so we target the <select> uniquely via getByRole('combobox') instead.

beforeEach(() => {
  useRecipeStore.setState({
    recipe: createEmptyRecipe(),
    selectedId: null,
    history: [],
    future: [],
  });
});

describe('<ResolutionControl />', () => {
  it('renders a select with all six sizes', () => {
    render(<ResolutionControl />);
    const select = screen.getByRole('combobox', { name: /resolution/i }) as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toEqual(['32', '64', '128', '256', '512', '1024']);
  });

  it('shows the default 256 selected', () => {
    render(<ResolutionControl />);
    const select = screen.getByRole('combobox', { name: /resolution/i }) as HTMLSelectElement;
    expect(select.value).toBe('256');
  });

  it('updates recipe.size on change', async () => {
    render(<ResolutionControl />);
    const select = screen.getByRole('combobox', { name: /resolution/i });
    await userEvent.selectOptions(select, '512');
    expect(useRecipeStore.getState().recipe.size).toBe(512);
  });
});
