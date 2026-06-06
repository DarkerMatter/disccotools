import type { ImageLayer as ImageLayerType } from '@disccotools/shared';

export function ImageLayer({
  layer,
  canvasSize,
  selected,
  onClick,
}: {
  layer: ImageLayerType;
  canvasSize: number;
  selected: boolean;
  onClick?: () => void;
}) {
  const naturalSize = canvasSize * 0.4 * layer.scale;
  const cx = layer.x * canvasSize;
  const cy = layer.y * canvasSize;
  const tx = cx - naturalSize / 2;
  const ty = cy - naturalSize / 2;

  return (
    <g
      data-testid={`image-layer-${layer.id}`}
      transform={`rotate(${layer.rotation} ${cx} ${cy})`}
      opacity={layer.opacity}
      onMouseDown={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      className="layer-mount-in"
    >
      <image
        href={`/api/assets/${layer.assetId}/file`}
        x={tx}
        y={ty}
        width={naturalSize}
        height={naturalSize}
        preserveAspectRatio="xMidYMid meet"
      />
      {selected && (
        <rect
          x={tx}
          y={ty}
          width={naturalSize}
          height={naturalSize}
          fill="none"
          stroke="#5865F2"
          strokeWidth={2}
          strokeDasharray="4 3"
          pointerEvents="none"
          className="layer-selection"
        />
      )}
    </g>
  );
}
