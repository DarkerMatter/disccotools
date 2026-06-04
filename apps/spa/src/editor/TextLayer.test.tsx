import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { TextLayer as TextLayerType } from '@disccotools/shared';
import { TextLayer } from './TextLayer.js';

const baseLayer: TextLayerType = {
  id: 't1',
  kind: 'text',
  text: 'hi',
  font: 'system-ui',
  color: '#fff',
  size: 0.3,
  x: 0.5,
  y: 0.5,
  rotation: 0,
  scale: 1,
  opacity: 1,
};

function renderInSvg(node: React.ReactNode) {
  return render(<svg viewBox="0 0 480 480">{node}</svg>);
}

describe('<TextLayer />', () => {
  it('renders the text content', () => {
    const { container } = renderInSvg(
      <TextLayer layer={baseLayer} canvasSize={480} selected={false} />,
    );
    const text = container.querySelector('text');
    expect(text?.textContent).toBe('hi');
  });

  it('uses the provided font and color', () => {
    const { container } = renderInSvg(
      <TextLayer
        layer={{ ...baseLayer, font: 'Georgia', color: '#abcdef' }}
        canvasSize={480}
        selected={false}
      />,
    );
    const text = container.querySelector('text')!;
    expect(text.getAttribute('font-family')).toBe('Georgia');
    expect(text.getAttribute('fill')).toBe('#abcdef');
  });

  it('renders a dashed selection rect when selected', () => {
    const { container } = renderInSvg(
      <TextLayer layer={baseLayer} canvasSize={480} selected={true} />,
    );
    expect(container.querySelector('rect[stroke-dasharray]')).not.toBeNull();
  });
});
