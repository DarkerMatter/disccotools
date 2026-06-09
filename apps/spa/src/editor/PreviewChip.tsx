import { Canvas } from './Canvas.js';
import { useRecipeStore } from './useRecipeStore.js';

const TILE_SIZE = 96;

const LIGHT_BG = '#f2f3f5';
const DARK_BG = '#1e1f22';

const tileLabelStyle: React.CSSProperties = {
  fontSize: 10,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  textAlign: 'center',
  marginTop: 4,
};

export function PreviewChip() {
  const recipe = useRecipeStore((s) => s.recipe);

  return (
    <section
      aria-label="Theme preview"
      style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
    >
      <h3
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
          margin: 0,
        }}
      >
        Preview
      </h3>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-start' }}>
        <div style={{ width: TILE_SIZE }}>
          <div
            data-testid="preview-light"
            style={{
              width: TILE_SIZE,
              height: TILE_SIZE,
              background: LIGHT_BG,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              padding: 6,
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <Canvas recipe={recipe} displaySize={TILE_SIZE - 12} interactive={false} />
          </div>
          <p style={tileLabelStyle}>Light</p>
        </div>
        <div style={{ width: TILE_SIZE }}>
          <div
            data-testid="preview-dark"
            style={{
              width: TILE_SIZE,
              height: TILE_SIZE,
              background: DARK_BG,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              padding: 6,
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <Canvas recipe={recipe} displaySize={TILE_SIZE - 12} interactive={false} />
          </div>
          <p style={tileLabelStyle}>Dark</p>
        </div>
      </div>
    </section>
  );
}
