import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyRecipe } from '@disccotools/shared';
import { useRecipeStore } from './useRecipeStore.js';
import { PreviewChip } from './PreviewChip.js';

beforeEach(() => {
  useRecipeStore.setState({
    recipe: createEmptyRecipe(),
    selectedId: null,
    history: [],
    future: [],
    currentSave: null,
  });
});

describe('<PreviewChip />', () => {
  it('renders a Preview heading and two tiles', () => {
    render(<PreviewChip />);
    expect(screen.getByRole('region', { name: /theme preview/i })).toBeInTheDocument();
    expect(screen.getByTestId('preview-light')).toBeInTheDocument();
    expect(screen.getByTestId('preview-dark')).toBeInTheDocument();
  });

  it('shows Light and Dark labels', () => {
    render(<PreviewChip />);
    expect(screen.getByText(/^light$/i)).toBeInTheDocument();
    expect(screen.getByText(/^dark$/i)).toBeInTheDocument();
  });
});
