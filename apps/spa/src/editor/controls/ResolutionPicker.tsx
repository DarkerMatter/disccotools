import type { Size } from '@disccotools/shared';
import { useRecipeStore } from '../useRecipeStore.js';

const SIZES: Size[] = [32, 64, 128, 256, 512, 1024];

export function ResolutionPicker() {
  const size = useRecipeStore((s) => s.recipe.size);
  const updateRecipe = useRecipeStore((s) => s.updateRecipe);

  return (
    <label
      data-tour-id="resolution"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        color: 'var(--color-text-muted)',
      }}
    >
      <span>Size</span>
      <select
        aria-label="Resolution"
        value={size}
        onChange={(e) =>
          updateRecipe((r) => ({ ...r, size: Number(e.target.value) as Size }))
        }
        style={{
          padding: '6px 8px',
          fontSize: 12,
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--color-border)',
          background: 'var(--color-bg)',
          color: 'var(--color-text)',
          cursor: 'pointer',
        }}
      >
        {SIZES.map((s) => (
          <option key={s} value={s}>
            {s} × {s}
          </option>
        ))}
      </select>
    </label>
  );
}
