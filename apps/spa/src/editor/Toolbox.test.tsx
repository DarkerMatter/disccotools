import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyRecipe } from '@disccotools/shared';
import { useRecipeStore } from './useRecipeStore.js';
import { Toolbox } from './Toolbox.js';

beforeEach(() => {
  useRecipeStore.setState({
    recipe: createEmptyRecipe(),
    selectedId: null,
    history: [],
    future: [],
  });
});

describe('<Toolbox />', () => {
  it('renders Background, Shape, and Resolution sections', () => {
    render(<Toolbox />);
    expect(screen.getByRole('region', { name: /background/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /shape/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /resolution/i })).toBeInTheDocument();
  });
});
