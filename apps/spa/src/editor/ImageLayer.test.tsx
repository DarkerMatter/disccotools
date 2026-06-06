import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ImageLayer as ImageLayerType } from '@disccotools/shared';
import { ImageLayer } from './ImageLayer.js';

const baseLayer: ImageLayerType = {
  id: 'im1',
  kind: 'image',
  assetId: 'asset_abc',
  x: 0.5,
  y: 0.5,
  rotation: 0,
  scale: 1,
  opacity: 1,
};

function renderInSvg(node: React.ReactNode) {
  return render(<svg viewBox="0 0 480 480">{node}</svg>);
}

describe('<ImageLayer />', () => {
  it('renders an <image> with the asset URL', () => {
    const { container } = renderInSvg(
      <ImageLayer layer={baseLayer} canvasSize={480} selected={false} />,
    );
    const img = container.querySelector('image');
    expect(img).not.toBeNull();
    const href = img!.getAttribute('href')!;
    expect(href).toBe('/api/assets/asset_abc/file');
  });

  it('renders a static dashed selection rect when selected', () => {
    const { container } = renderInSvg(
      <ImageLayer layer={baseLayer} canvasSize={480} selected={true} />,
    );
    const rect = container.querySelector('rect[stroke-dasharray]');
    expect(rect).not.toBeNull();
    expect(rect!.getAttribute('class')).toBeNull();
  });

  it('does not render selection rect when not selected', () => {
    const { container } = renderInSvg(
      <ImageLayer layer={baseLayer} canvasSize={480} selected={false} />,
    );
    expect(container.querySelector('rect[stroke-dasharray]')).toBeNull();
  });
});
