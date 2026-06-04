import type { Size } from '@disccotools/shared';
import { useRecipeStore } from '../useRecipeStore.js';

const SIZES: Size[] = [32, 64, 128, 256, 512, 1024];

export function ResolutionControl() {
  const size = useRecipeStore((s) => s.recipe.size);
  const updateRecipe = useRecipeStore((s) => s.updateRecipe);

  return (
    <section aria-label="Resolution">
      <h3
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
          margin: '0 0 8px',
        }}
      >
        Resolution
      </h3>
      <label
        style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}
        htmlFor="resolution-select"
      >
        Export size (px)
      </label>
      <select
        id="resolution-select"
        aria-label="Resolution"
        value={size}
        onChange={(e) =>
          updateRecipe((r) => ({ ...r, size: Number(e.target.value) as Size }))
        }
        style={{
          width: '100%',
          padding: '6px 8px',
          fontSize: 13,
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--color-border)',
          background: 'var(--color-bg)',
          color: 'var(--color-text)',
        }}
      >
        {SIZES.map((s) => (
          <option key={s} value={s}>
            {s} × {s}
          </option>
        ))}
      </select>
    </section>
  );
}
