import type { TextLayer as TextLayerType } from '@disccotools/shared';

export function TextLayer({
  layer,
  canvasSize,
  onClick,
}: {
  layer: TextLayerType;
  canvasSize: number;
  onClick?: () => void;
}) {
  const fontSize = layer.size * canvasSize * layer.scale;
  const cx = layer.x * canvasSize;
  const cy = layer.y * canvasSize;

  return (
    <g className="layer-mount-in">
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
      </g>
    </g>
  );
}
