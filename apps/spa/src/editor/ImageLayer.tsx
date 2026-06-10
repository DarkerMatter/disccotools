import type { ImageLayer as ImageLayerType } from '@disccotools/shared';

export function ImageLayer({
  layer,
  canvasSize,
  onClick,
}: {
  layer: ImageLayerType;
  canvasSize: number;
  onClick?: () => void;
}) {
  const naturalSize = canvasSize * 0.4 * layer.scale;
  const cx = layer.x * canvasSize;
  const cy = layer.y * canvasSize;
  const tx = cx - naturalSize / 2;
  const ty = cy - naturalSize / 2;

  return (
    <g className="layer-mount-in">
      <g
        data-testid={`image-layer-${layer.id}`}
        transform={`rotate(${layer.rotation} ${cx} ${cy})`}
        opacity={layer.opacity}
        onMouseDown={onClick}
        style={{ cursor: onClick ? 'pointer' : 'default' }}
      >
        <image
          href={`/api/assets/${layer.assetId}/file`}
          x={tx}
          y={ty}
          width={naturalSize}
          height={naturalSize}
          preserveAspectRatio="xMidYMid meet"
        />
      </g>
    </g>
  );
}
