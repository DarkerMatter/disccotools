import { SHAPES_FOR_UI, SHAPE_LABELS, shapePathD } from '@disccotools/shared';
import { useRecipeStore } from '../useRecipeStore.js';

const headingStyle = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: 'var(--color-text-muted)',
  margin: '0 0 8px',
};

export function ShapeControl() {
  const shape = useRecipeStore((s) => s.recipe.shape);
  const updateRecipe = useRecipeStore((s) => s.updateRecipe);

  return (
    <section aria-label="Shape">
      <h3 style={headingStyle}>Shape</h3>
      <div
        role="radiogroup"
        aria-label="Canvas shape"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 6,
        }}
      >
        {SHAPES_FOR_UI.map((s) => {
          const active = shape === s;
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={SHAPE_LABELS[s]}
              onClick={() => updateRecipe((r) => ({ ...r, shape: s }))}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: 6,
                background: active ? 'var(--color-surface-elev)' : 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 28 28"
                fill="var(--color-text)"
                aria-hidden="true"
              >
                <path d={shapePathD(s, 28)} />
              </svg>
              <span
                style={{
                  fontSize: 9,
                  color: 'var(--color-text-muted)',
                  lineHeight: 1.1,
                  textAlign: 'center',
                }}
              >
                {SHAPE_LABELS[s]}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
