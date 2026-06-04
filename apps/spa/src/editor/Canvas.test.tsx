import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createEmptyRecipe, type Recipe } from '@disccotools/shared';
import { Canvas } from './Canvas.js';

function withRecipe(partial: Partial<Recipe>): Recipe {
  return { ...createEmptyRecipe(), ...partial };
}

describe('<Canvas />', () => {
  it('renders an SVG with a labeled role and the canvas testid', () => {
    const { getByTestId, getByRole } = render(
      <Canvas recipe={createEmptyRecipe()} />,
    );
    expect(getByRole('img', { name: /icon canvas/i })).toBeInTheDocument();
    expect(getByTestId('canvas-svg').tagName.toLowerCase()).toBe('svg');
  });

  it('renders a solid fill for solid background', () => {
    const recipe = withRecipe({
      background: { kind: 'solid', color: '#123456', opacity: 1 },
    });
    const { container } = render(<Canvas recipe={recipe} />);
    const rect = container.querySelector('rect[fill="#123456"]');
    expect(rect).not.toBeNull();
  });

  it('renders a linearGradient for gradient background', () => {
    const recipe = withRecipe({
      background: { kind: 'gradient', from: '#fff', to: '#000', angle: 90, opacity: 1 },
    });
    const { container } = render(<Canvas recipe={recipe} />);
    const grad = container.querySelector('linearGradient');
    expect(grad).not.toBeNull();
  });

  it('renders a path clip for circle shape', () => {
    const recipe = withRecipe({ shape: 'circle' });
    const { container } = render(<Canvas recipe={recipe} />);
    expect(container.querySelector('clipPath > path')).not.toBeNull();
  });

  it('renders a path clip for rounded-square shape', () => {
    const recipe = withRecipe({ shape: 'rounded-square' });
    const { container } = render(<Canvas recipe={recipe} />);
    expect(container.querySelector('clipPath > path')).not.toBeNull();
  });

  it('renders at the displaySize when provided', () => {
    const { container } = render(
      <Canvas recipe={createEmptyRecipe()} displaySize={96} />,
    );
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('96');
    expect(svg.getAttribute('viewBox')).toBe('0 0 96 96');
  });
});
