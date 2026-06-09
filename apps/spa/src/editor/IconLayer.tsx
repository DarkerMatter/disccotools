import type { IconLayer as IconLayerType } from '@disccotools/shared';
import { iconUrl } from './iconify.js';

export function IconLayer({
  layer,
  canvasSize,
  onClick,
}: {
  layer: IconLayerType;
  canvasSize: number;
  onClick?: () => void;
}) {
  const naturalSize = canvasSize * 0.4 * layer.scale;
  const cx = layer.x * canvasSize;
  const cy = layer.y * canvasSize;
  const tx = cx - naturalSize / 2;
  const ty = cy - naturalSize / 2;

  if (layer.color.kind === 'solid') {
    return (
      <g
        data-testid={`icon-layer-${layer.id}`}
        transform={`rotate(${layer.rotation} ${cx} ${cy})`}
        opacity={layer.opacity}
        onMouseDown={onClick}
        style={{ cursor: onClick ? 'pointer' : 'default' }}
      >
        <image
          href={iconUrl(layer.iconset, layer.name, layer.color.color)}
          x={tx}
          y={ty}
          width={naturalSize}
          height={naturalSize}
          preserveAspectRatio="xMidYMid meet"
        />
      </g>
    );
  }

  const maskId = `mask-${layer.id}`;
  const gradId = `grad-${layer.id}`;
  const eps = gradientEndpoints(layer.color.angle);
  return (
    <g
      data-testid={`icon-layer-${layer.id}`}
      transform={`rotate(${layer.rotation} ${cx} ${cy})`}
      opacity={layer.opacity}
      onMouseDown={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      className="layer-mount-in"
    >
      <defs>
        <mask id={maskId}>
          <image
            href={iconUrl(layer.iconset, layer.name, '#ffffff')}
            x={tx}
            y={ty}
            width={naturalSize}
            height={naturalSize}
            preserveAspectRatio="xMidYMid meet"
          />
        </mask>
        <linearGradient id={gradId} x1={eps.x1} y1={eps.y1} x2={eps.x2} y2={eps.y2}>
          <stop offset="0%" stopColor={layer.color.from} />
          <stop offset="100%" stopColor={layer.color.to} />
        </linearGradient>
      </defs>
      <rect
        x={tx}
        y={ty}
        width={naturalSize}
        height={naturalSize}
        fill={`url(#${gradId})`}
        mask={`url(#${maskId})`}
      />
    </g>
  );
}

function gradientEndpoints(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  return {
    x1: `${(0.5 - dx / 2) * 100}%`,
    y1: `${(0.5 - dy / 2) * 100}%`,
    x2: `${(0.5 + dx / 2) * 100}%`,
    y2: `${(0.5 + dy / 2) * 100}%`,
  };
}
