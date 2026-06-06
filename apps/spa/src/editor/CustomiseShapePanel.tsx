import { useState } from 'react';
import {
  SHAPES_FOR_UI,
  SHAPE_LABELS,
  shapePathD,
  type Background,
} from '@disccotools/shared';
import { useRecipeStore } from './useRecipeStore.js';
import { SliderWithInput } from './controls/SliderWithInput.js';
import { Toggle } from './controls/Toggle.js';

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

export function CustomiseShapePanel() {
  const shape = useRecipeStore((s) => s.recipe.shape);
  const bg = useRecipeStore((s) => s.recipe.background);
  const updateRecipe = useRecipeStore((s) => s.updateRecipe);

  const [stylePanelOpen, setStylePanelOpen] = useState(true);
  const isGradient = bg.kind === 'gradient';
  const isTransparent = bg.kind === 'transparent';

  function toggleGradient(next: boolean) {
    updateRecipe((r) => ({
      ...r,
      background: next ? ensureGradient(r.background) : ensureSolid(r.background),
    }));
  }

  function toggleTransparent(next: boolean) {
    updateRecipe((r) => ({
      ...r,
      background: next ? { kind: 'transparent' } : ensureSolid(r.background),
    }));
  }

  function patchBg<K extends Background['kind']>(
    kind: K,
    patcher: (b: Extract<Background, { kind: K }>) => Background,
  ) {
    updateRecipe((r) => {
      if (r.background.kind !== kind) return r;
      return { ...r, background: patcher(r.background as Extract<Background, { kind: K }>) };
    });
  }

  return (
    <section aria-label="Customise shape" id="editor-tabpanel-shape" role="tabpanel">
      <h3 className="section-heading" data-tour-id="shape">
        Select your shape
      </h3>
      <div role="radiogroup" aria-label="Canvas shape" className="shape-grid">
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
              className={`shape-tile ${active ? 'shape-tile--active' : ''}`}
            >
              <svg width="26" height="26" viewBox="0 0 26 26" fill="currentColor" aria-hidden="true">
                <path d={shapePathD(s, 26)} />
              </svg>
            </button>
          );
        })}
      </div>

      <div
        className={`layer-card ${stylePanelOpen ? 'layer-card--expanded' : ''}`}
        data-tour-id="background"
        style={{ marginTop: 16 }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            type="button"
            className="layer-card__header"
            onClick={() => setStylePanelOpen((s) => !s)}
            aria-expanded={stylePanelOpen}
            aria-controls="shape-style-body"
            aria-label={`${stylePanelOpen ? 'Collapse' : 'Expand'} shape style`}
          >
            <span className="layer-card__thumb" aria-hidden="true">
              ✎
            </span>
            <span className="layer-card__meta">
              <span className="layer-card__title">Update your shape style</span>
              <span className="layer-card__sub">Background, gradient, transparency</span>
            </span>
          </button>
          <button
            type="button"
            className="layer-card__chevron"
            onClick={() => setStylePanelOpen((s) => !s)}
            aria-label={stylePanelOpen ? 'Collapse style options' : 'Expand style options'}
            style={{ marginRight: 8 }}
          >
            ▾
          </button>
        </div>

        <div className="layer-card__body" id="shape-style-body">
          <div className="layer-card__body-inner">
            <div className="layer-card__body-content">
              {/* transparency toggle (off = uses color/gradient) */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>
                  Transparent background
                </span>
                <Toggle
                  on={isTransparent}
                  onChange={toggleTransparent}
                  label="Use transparent background"
                />
              </div>

              {!isTransparent && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h4 className="section-heading" style={{ margin: 0 }}>
                      Color <span style={{ opacity: 0.6 }}>(classic or gradient)</span>
                    </h4>
                    <Toggle
                      on={isGradient}
                      onChange={toggleGradient}
                      label="Use gradient color"
                    />
                  </div>

                  {!isGradient && bg.kind === 'solid' && (
                    <input
                      type="color"
                      aria-label="Background color"
                      value={bg.color}
                      onChange={(e) =>
                        patchBg('solid', (b) => ({ ...b, color: e.target.value }))
                      }
                      style={colorInput}
                    />
                  )}

                  {isGradient && bg.kind === 'gradient' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <label style={smallLabel}>From</label>
                          <input
                            type="color"
                            aria-label="Gradient start color"
                            value={bg.from}
                            onChange={(e) =>
                              patchBg('gradient', (b) => ({ ...b, from: e.target.value }))
                            }
                            style={colorInput}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={smallLabel}>To</label>
                          <input
                            type="color"
                            aria-label="Gradient end color"
                            value={bg.to}
                            onChange={(e) =>
                              patchBg('gradient', (b) => ({ ...b, to: e.target.value }))
                            }
                            style={colorInput}
                          />
                        </div>
                      </div>
                      <SliderWithInput
                        label="Angle"
                        ariaLabel="Gradient angle"
                        value={Math.round(bg.angle)}
                        min={0}
                        max={360}
                        step={1}
                        unit="°"
                        onChange={(v) =>
                          patchBg('gradient', (b) => ({ ...b, angle: v }))
                        }
                      />
                    </div>
                  )}

                  <SliderWithInput
                    label="Opacity"
                    value={Math.round(bg.opacity * 100)}
                    min={0}
                    max={100}
                    step={1}
                    unit="%"
                    onChange={(v) => {
                      if (bg.kind === 'solid')
                        patchBg('solid', (b) => ({ ...b, opacity: v / 100 }));
                      if (bg.kind === 'gradient')
                        patchBg('gradient', (b) => ({ ...b, opacity: v / 100 }));
                    }}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const colorInput: React.CSSProperties = {
  width: '100%',
  height: 32,
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'transparent',
  padding: 2,
};

const smallLabel: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--color-text-muted)',
  marginBottom: 4,
};
