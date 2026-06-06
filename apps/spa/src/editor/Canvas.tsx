import { useId } from 'react';
import type { Background, Recipe, Shape } from '@disccotools/shared';
import { shapePathD } from '@disccotools/shared';
import { useRecipeStore } from './useRecipeStore.js';
import { IconLayer } from './IconLayer.js';
import { ImageLayer } from './ImageLayer.js';
import { TextLayer } from './TextLayer.js';

const DISPLAY_SIZE = 480;

function ShapeGeometry({ shape, size }: { shape: Shape; size: number }) {
  return <path d={shapePathD(shape, size)} />;
}

function BackgroundFill({
  background,
  gradientId,
  size,
}: {
  background: Background;
  gradientId: string;
  size: number;
}) {
  if (background.kind === 'transparent') {
    // checker so users see that transparent is, you know, transparent
    return (
      <g aria-hidden="true">
        <rect width={size} height={size} fill="#f3f4f6" />
        <pattern
          id={`${gradientId}-checker`}
          x="0"
          y="0"
          width="16"
          height="16"
          patternUnits="userSpaceOnUse"
        >
          <rect width="8" height="8" fill="#e5e7eb" />
          <rect x="8" y="8" width="8" height="8" fill="#e5e7eb" />
        </pattern>
        <rect width={size} height={size} fill={`url(#${gradientId}-checker)`} />
      </g>
    );
  }
  if (background.kind === 'solid') {
    return (
      <rect
        width={size}
        height={size}
        fill={background.color}
        opacity={background.opacity}
      />
    );
  }
  return (
    <rect
      width={size}
      height={size}
      fill={`url(#${gradientId})`}
      opacity={background.opacity}
    />
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

export function Canvas({
  recipe: recipeProp,
  displaySize = DISPLAY_SIZE,
}: { recipe?: Recipe; displaySize?: number } = {}) {
  const fromStore = useRecipeStore((s) => s.recipe);
  const recipe = recipeProp ?? fromStore;
  const selectedId = useRecipeStore((s) => s.selectedId);
  const setSelection = useRecipeStore((s) => s.setSelection);

  const uid = useId();
  const clipId = `canvas-clip-${uid}`;
  const gradientId = `canvas-bg-${uid}`;
  const size = displaySize;

  const isGradient = recipe.background.kind === 'gradient';

  return (
    <svg
      role="img"
      aria-label="Icon canvas"
      data-testid="canvas-svg"
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      style={{
        display: 'block',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-card)',
        background: 'transparent',
      }}
    >
      <defs>
        <clipPath id={clipId}>
          <g transform={`rotate(${recipe.shapeRotation ?? 0} ${size / 2} ${size / 2})`}>
            <ShapeGeometry shape={recipe.shape} size={size} />
          </g>
        </clipPath>
        {isGradient && recipe.background.kind === 'gradient' && (
          <linearGradient id={gradientId} {...gradientEndpoints(recipe.background.angle)}>
            <stop offset="0%" stopColor={recipe.background.from} />
            <stop offset="100%" stopColor={recipe.background.to} />
          </linearGradient>
        )}
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <BackgroundFill
          background={recipe.background}
          gradientId={gradientId}
          size={size}
        />
        {recipe.layers.map((layer) => {
          if (layer.kind === 'icon') {
            return (
              <IconLayer
                key={layer.id}
                layer={layer}
                canvasSize={size}
                selected={selectedId === layer.id}
                onClick={() => setSelection(layer.id)}
              />
            );
          }
          if (layer.kind === 'text') {
            return (
              <TextLayer
                key={layer.id}
                layer={layer}
                canvasSize={size}
                selected={selectedId === layer.id}
                onClick={() => setSelection(layer.id)}
              />
            );
          }
          if (layer.kind === 'image') {
            return (
              <ImageLayer
                key={layer.id}
                layer={layer}
                canvasSize={size}
                selected={selectedId === layer.id}
                onClick={() => setSelection(layer.id)}
              />
            );
          }
          return null;
        })}
      </g>
    </svg>
  );
}
