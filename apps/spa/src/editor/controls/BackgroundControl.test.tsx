import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyRecipe } from '@disccotools/shared';
import { useRecipeStore } from '../useRecipeStore.js';
import { BackgroundControl } from './BackgroundControl.js';

// Note: For <input type="color"> and <input type="range">, direct DOM .value mutation +
// dispatchEvent does NOT trigger React's synthetic onChange. We use fireEvent.change which
// goes through the React event system.

beforeEach(() => {
  useRecipeStore.setState({
    recipe: createEmptyRecipe(),
    selectedId: null,
    history: [],
    future: [],
  });
});

describe('<BackgroundControl />', () => {
  it('renders three radio options for kind', () => {
    render(<BackgroundControl />);
    expect(screen.getByRole('radio', { name: /solid/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /gradient/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /transparent/i })).toBeInTheDocument();
  });

  it('starts with solid selected (matches default recipe)', () => {
    render(<BackgroundControl />);
    expect(screen.getByRole('radio', { name: /solid/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('switches to transparent on click', async () => {
    render(<BackgroundControl />);
    await userEvent.click(screen.getByRole('radio', { name: /transparent/i }));
    expect(useRecipeStore.getState().recipe.background.kind).toBe('transparent');
  });

  it('switches to gradient and preserves the previous solid color as "from"', async () => {
    useRecipeStore.setState((s) => ({
      ...s,
      recipe: { ...s.recipe, background: { kind: 'solid', color: '#abcdef', opacity: 1 } },
    }));
    render(<BackgroundControl />);
    await userEvent.click(screen.getByRole('radio', { name: /gradient/i }));
    const bg = useRecipeStore.getState().recipe.background;
    expect(bg.kind).toBe('gradient');
    if (bg.kind === 'gradient') {
      expect(bg.from.toLowerCase()).toBe('#abcdef');
    }
  });

  it('updates solid color when the color input fires change', () => {
    render(<BackgroundControl />);
    const input = screen.getByLabelText(/background color/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '#112233' } });
    const bg = useRecipeStore.getState().recipe.background;
    expect(bg.kind).toBe('solid');
    if (bg.kind === 'solid') expect(bg.color.toLowerCase()).toBe('#112233');
  });

  it('updates opacity via the slider', () => {
    render(<BackgroundControl />);
    const slider = screen.getByLabelText(/^opacity$/i) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '50' } });
    const bg = useRecipeStore.getState().recipe.background;
    expect(bg.kind).toBe('solid');
    if (bg.kind === 'solid') expect(bg.opacity).toBe(0.5);
  });
});
