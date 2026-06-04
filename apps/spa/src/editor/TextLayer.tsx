import type { TextLayer as TextLayerType } from '@disccotools/shared';

export function TextLayer({
  layer,
  canvasSize,
  selected,
  onClick,
}: {
  layer: TextLayerType;
  canvasSize: number;
  selected: boolean;
  onClick?: () => void;
}) {
  // Font size is normalized 0..~1 of canvas. Multiply by scale for live resizing.
  const fontSize = layer.size * canvasSize * layer.scale;
  const cx = layer.x * canvasSize;
  const cy = layer.y * canvasSize;

  // Approximate bbox for the dashed selection rect; we don't measure live.
  const approxWidth = Math.max(fontSize * 0.6 * layer.text.length, fontSize * 0.6);
  const approxHeight = fontSize * 1.2;
  const boxX = cx - approxWidth / 2;
  const boxY = cy - approxHeight / 2;

  return (
    <g
      data-testid={`text-layer-${layer.id}`}
      transform={`rotate(${layer.rotation} ${cx} ${cy})`}
      opacity={layer.opacity}
      onMouseDown={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <text
        x={cx}
        y={cy}
        fontFamily={layer.font}
        fontSize={fontSize}
        fill={layer.color}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {layer.text}
      </text>
      {selected && (
        <rect
          x={boxX}
          y={boxY}
          width={approxWidth}
          height={approxHeight}
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
