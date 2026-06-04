import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { IconLayer as IconLayerType } from '@disccotools/shared';
import { IconLayer } from './IconLayer.js';

const baseLayer: IconLayerType = {
  id: 'l1',
  kind: 'icon',
  iconset: 'lucide',
  name: 'rocket',
  color: { kind: 'solid' as const, color: '#fff' },
  x: 0.5,
  y: 0.5,
  rotation: 0,
  scale: 1,
  opacity: 1,
};

function renderInSvg(node: React.ReactNode) {
  return render(<svg viewBox="0 0 480 480">{node}</svg>);
}

describe('<IconLayer />', () => {
  it('renders an <image> with the Iconify URL containing color', () => {
    const { container } = renderInSvg(
      <IconLayer layer={baseLayer} canvasSize={480} selected={false} />,
    );
    const img = container.querySelector('image');
    expect(img).not.toBeNull();
    const href = img!.getAttribute('href')!;
    expect(href).toContain('lucide/rocket.svg');
    expect(href).toContain('color=%23fff');
  });

  it('renders a dashed selection rect when selected', () => {
    const { container } = renderInSvg(
      <IconLayer layer={baseLayer} canvasSize={480} selected={true} />,
    );
    const rect = container.querySelector('rect[stroke-dasharray]');
    expect(rect).not.toBeNull();
  });

  it('does not render selection rect when not selected', () => {
    const { container } = renderInSvg(
      <IconLayer layer={baseLayer} canvasSize={480} selected={false} />,
    );
    expect(container.querySelector('rect[stroke-dasharray]')).toBeNull();
  });

  it('renders a mask + linearGradient when the color is a gradient', () => {
    const { container } = renderInSvg(
      <IconLayer
        layer={{
          ...baseLayer,
          color: { kind: 'gradient', from: '#fff', to: '#000', angle: 45 },
        }}
        canvasSize={480}
        selected={false}
      />,
    );
    expect(container.querySelector('mask')).not.toBeNull();
    expect(container.querySelector('linearGradient')).not.toBeNull();
  });
});
