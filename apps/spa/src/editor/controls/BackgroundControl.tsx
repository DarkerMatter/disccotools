import type { Background } from '@disccotools/shared';
import { useRecipeStore } from '../useRecipeStore.js';
import { SliderWithInput } from './SliderWithInput.js';

type Kind = Background['kind'];

const KINDS: { value: Kind; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'gradient', label: 'Gradient' },
  { value: 'transparent', label: 'Transparent' },
];

function ensureSolid(bg: Background): Extract<Background, { kind: 'solid' }> {
  if (bg.kind === 'solid') return bg;
  if (bg.kind === 'gradient') return { kind: 'solid', color: bg.from, opacity: bg.opacity };
  return { kind: 'solid', color: '#5865F2', opacity: 1 };
}

function ensureGradient(bg: Background): Extract<Background, { kind: 'gradient' }> {
  if (bg.kind === 'gradient') return bg;
  if (bg.kind === 'solid') return { kind: 'gradient', from: bg.color, to: '#0b0f17', angle: 45, opacity: bg.opacity };
  return { kind: 'gradient', from: '#5865F2', to: '#0b0f17', angle: 45, opacity: 1 };
}

export function BackgroundControl() {
  const bg = useRecipeStore((s) => s.recipe.background);
  const updateRecipe = useRecipeStore((s) => s.updateRecipe);

  function setKind(kind: Kind) {
    updateRecipe((r) => ({
      ...r,
      background:
        kind === 'transparent'
          ? { kind: 'transparent' }
          : kind === 'solid'
          ? ensureSolid(r.background)
          : ensureGradient(r.background),
    }));
  }

  function patch<K extends Kind>(kind: K, patcher: (b: Extract<Background, { kind: K }>) => Background) {
    updateRecipe((r) => {
      if (r.background.kind !== kind) return r;
      return { ...r, background: patcher(r.background as Extract<Background, { kind: K }>) };
    });
  }

  return (
    <section aria-label="Background">
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
        Background
      </h3>

      <div
        role="radiogroup"
        aria-label="Background kind"
        style={{
          display: 'inline-flex',
          gap: 0,
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 2,
          marginBottom: 12,
          background: 'var(--color-bg)',
        }}
      >
        {KINDS.map((k) => {
          const active = bg.kind === k.value;
          return (
            <button
              key={k.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setKind(k.value)}
              style={{
                background: active ? 'var(--color-surface-elev)' : 'transparent',
                color: 'var(--color-text)',
                border: 'none',
                padding: '6px 10px',
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {k.label}
            </button>
          );
        })}
      </div>

      {bg.kind === 'solid' && (
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>
            Color
          </label>
          <input
            type="color"
            aria-label="Background color"
            value={bg.color}
            onChange={(e) =>
              patch('solid', (b) => ({ ...b, color: e.target.value }))
            }
            style={{ width: '100%', height: 32, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'transparent' }}
          />
          <OpacityRow
            value={bg.opacity}
            onChange={(o) => patch('solid', (b) => ({ ...b, opacity: o }))}
          />
        </div>
      )}

      {bg.kind === 'gradient' && (
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>
            From
          </label>
          <input
            type="color"
            aria-label="Gradient start color"
            value={bg.from}
            onChange={(e) => patch('gradient', (b) => ({ ...b, from: e.target.value }))}
            style={{ width: '100%', height: 32, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'transparent' }}
          />
          <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', margin: '8px 0 4px' }}>
            To
          </label>
          <input
            type="color"
            aria-label="Gradient end color"
            value={bg.to}
            onChange={(e) => patch('gradient', (b) => ({ ...b, to: e.target.value }))}
            style={{ width: '100%', height: 32, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'transparent' }}
          />
          <div style={{ marginTop: 8 }}>
            <SliderWithInput
              label="Angle"
              ariaLabel="Gradient angle"
              value={Math.round(bg.angle)}
              min={0}
              max={360}
              step={1}
              unit="°"
              onChange={(v) => patch('gradient', (b) => ({ ...b, angle: v }))}
            />
          </div>
          <OpacityRow
            value={bg.opacity}
            onChange={(o) => patch('gradient', (b) => ({ ...b, opacity: o }))}
          />
        </div>
      )}

      {bg.kind === 'transparent' && (
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
          Canvas exports with a transparent background.
        </p>
      )}
    </section>
  );
}

function OpacityRow({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ marginTop: 8 }}>
      <SliderWithInput
        label="Opacity"
        value={Math.round(value * 100)}
        min={0}
        max={100}
        step={1}
        unit="%"
        onChange={(v) => onChange(v / 100)}
      />
    </div>
  );
}
