import type { DragEvent } from 'react';
import type { IconColor, Layer } from '@disccotools/shared';
import { iconUrl } from './iconify.js';
import { useTheme } from '../theme/ThemeContext.js';
import { useRecipeStore } from './useRecipeStore.js';
import { SliderWithInput } from './controls/SliderWithInput.js';
import { Toggle } from './controls/Toggle.js';

export type LayerDragHandlers = {
  isDraggingThis: boolean;
  dropPosition: 'before' | 'after' | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOver: (id: string, position: 'before' | 'after') => void;
  onDrop: (id: string) => void;
};

function layerTitle(layer: Layer): string {
  if (layer.kind === 'icon') return prettyIconName(layer.name);
  if (layer.kind === 'text') return layer.text || 'Text';
  return 'Image';
}

function layerSubtitle(layer: Layer): string {
  if (layer.kind === 'icon') return `${prefixLabel(layer.iconset)} icon`;
  if (layer.kind === 'text') return `${layer.font}`;
  return 'From your asset library';
}

function prettyIconName(raw: string): string {
  const last = raw.split('/').pop() ?? raw;
  return last
    .split('-')
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

function prefixLabel(p: string): string {
  const map: Record<string, string> = {
    custom: 'Custom',
    lucide: 'Lucide',
    tabler: 'Tabler',
    ph: 'Phosphor',
    mdi: 'Material Design',
    'material-symbols': 'Material Symbols',
  };
  return map[p] ?? p;
}

export function LayerCard({
  layer,
  drag,
}: {
  layer: Layer;
  drag?: LayerDragHandlers;
}) {
  const { theme } = useTheme();
  const selectedId = useRecipeStore((s) => s.selectedId);
  const setSelection = useRecipeStore((s) => s.setSelection);
  const updateLayer = useRecipeStore((s) => s.updateLayer);
  const removeLayer = useRecipeStore((s) => s.removeLayer);

  const expanded = selectedId === layer.id;
  const previewColor = theme === 'dark' ? '#e5e7eb' : '#0f172a';

  function patch<L extends Layer>(p: Partial<L>) {
    updateLayer(layer.id, p);
  }

  // grip is the only drag source, so the body sliders and buttons never start a drag
  function handleGripDragStart(e: DragEvent<HTMLSpanElement>) {
    if (!drag) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', layer.id);
    // use the whole card as the ghost so users see what they're dragging
    const card = e.currentTarget.closest<HTMLElement>('.layer-card');
    if (card) {
      e.dataTransfer.setDragImage(card, 20, 20);
    }
    drag.onDragStart(layer.id);
  }

  function handleGripDragEnd() {
    drag?.onDragEnd();
  }

  // 40/60 split with a 20% deadzone in the middle so the indicator doesn't flap
  // when the cursor hovers near the boundary
  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    if (!drag) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.height <= 0) return;
    const ratio = (e.clientY - rect.top) / rect.height;
    let position: 'before' | 'after';
    if (ratio < 0.4) position = 'before';
    else if (ratio > 0.6) position = 'after';
    else if (drag.dropPosition) position = drag.dropPosition;
    else position = ratio < 0.5 ? 'before' : 'after';
    drag.onDragOver(layer.id, position);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    if (!drag) return;
    e.preventDefault();
    drag.onDrop(layer.id);
  }

  const isDraggingThis = drag?.isDraggingThis ?? false;
  const dropPos = drag?.dropPosition ?? null;
  const cardClasses = [
    'layer-card',
    expanded ? 'layer-card--expanded' : '',
    isDraggingThis ? 'layer-card--dragging' : '',
    !isDraggingThis && dropPos === 'before' ? 'layer-card--drop-before' : '',
    !isDraggingThis && dropPos === 'after' ? 'layer-card--drop-after' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={cardClasses}
      data-tour-id={expanded ? 'properties' : undefined}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {drag && (
          <span
            className="layer-card__grip"
            aria-hidden="true"
            title="Drag to reorder"
            draggable
            onDragStart={handleGripDragStart}
            onDragEnd={handleGripDragEnd}
          >
            ⋮⋮
          </span>
        )}
        <button
          type="button"
          className="layer-card__header"
          onClick={() => setSelection(expanded ? null : layer.id)}
          aria-expanded={expanded}
          aria-controls={`layer-body-${layer.id}`}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${layerTitle(layer)} layer`}
        >
          <span className="layer-card__thumb" aria-hidden="true">
            <LayerThumb layer={layer} previewColor={previewColor} />
          </span>
          <span className="layer-card__meta">
            <span className="layer-card__title">{layerTitle(layer)}</span>
            <span className="layer-card__sub">{layerSubtitle(layer)}</span>
          </span>
        </button>
        <button
          type="button"
          className="layer-card__delete"
          onClick={() => removeLayer(layer.id)}
          aria-label={`Delete ${layerTitle(layer)} layer`}
          style={{ marginRight: 4 }}
        >
          🗑
        </button>
        <button
          type="button"
          className="layer-card__chevron"
          onClick={() => setSelection(expanded ? null : layer.id)}
          aria-label={expanded ? 'Collapse layer' : 'Expand layer'}
          style={{ marginRight: 8 }}
        >
          ▾
        </button>
      </div>

      <div className="layer-card__body" id={`layer-body-${layer.id}`}>
        <div className="layer-card__body-inner">
          <div className="layer-card__body-content">
            {layer.kind === 'text' && (
              <div>
                <h4 className="section-heading">Text</h4>
                <input
                  type="text"
                  aria-label="Text content"
                  value={layer.text}
                  onChange={(e) => patch({ text: e.target.value })}
                  style={inputStyle}
                  placeholder="Your text"
                />
                <div style={{ height: 8 }} />
                <input
                  type="text"
                  aria-label="Font family"
                  value={layer.font}
                  onChange={(e) => patch({ font: e.target.value })}
                  style={inputStyle}
                  placeholder="Font family"
                />
              </div>
            )}

            <div>
              <h4 className="section-heading">Positions</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <SliderWithInput
                  label="X"
                  shortLabel="X"
                  value={Math.round(layer.x * 100)}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  onChange={(v) => patch({ x: v / 100 })}
                />
                <SliderWithInput
                  label="Y"
                  shortLabel="Y"
                  value={Math.round(layer.y * 100)}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  onChange={(v) => patch({ y: v / 100 })}
                />
                <SliderWithInput
                  label="Rotation"
                  shortLabel="Z"
                  value={Math.round(layer.rotation)}
                  min={-180}
                  max={180}
                  step={1}
                  unit="°"
                  onChange={(v) => patch({ rotation: v })}
                />
              </div>
            </div>

            <SliderWithInput
              label="Scale"
              value={Math.round(layer.scale * 100)}
              min={20}
              max={300}
              step={1}
              unit="%"
              onChange={(v) => patch({ scale: v / 100 })}
            />

            <SliderWithInput
              label="Opacity"
              value={Math.round(layer.opacity * 100)}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={(v) => patch({ opacity: v / 100 })}
            />

            {layer.kind === 'icon' && (
              <IconColorControl
                color={layer.color}
                onChange={(next) => patch({ color: next })}
              />
            )}

            {layer.kind === 'text' && (
              <>
                <div>
                  <h4 className="section-heading">Color</h4>
                  <input
                    type="color"
                    aria-label="Text color"
                    value={layer.color}
                    onChange={(e) => patch({ color: e.target.value })}
                    style={colorInputStyle}
                  />
                </div>
                <SliderWithInput
                  label="Size"
                  value={Math.round(layer.size * 100)}
                  min={5}
                  max={100}
                  step={1}
                  unit="%"
                  onChange={(v) => patch({ size: v / 100 })}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LayerThumb({ layer, previewColor }: { layer: Layer; previewColor: string }) {
  if (layer.kind === 'icon') {
    return (
      <img
        src={iconUrl(layer.iconset, layer.name, previewColor)}
        alt=""
        width={22}
        height={22}
      />
    );
  }
  if (layer.kind === 'text') {
    return (
      <span style={{ fontSize: 14, fontWeight: 700 }}>
        {(layer.text.trim() || 'T').slice(0, 1).toUpperCase()}
      </span>
    );
  }
  return <span style={{ fontSize: 14 }}>🖼</span>;
}

function IconColorControl({
  color,
  onChange,
}: {
  color: IconColor;
  onChange: (next: IconColor) => void;
}) {
  const isGradient = color.kind === 'gradient';

  function toggleGradient(next: boolean) {
    if (next === isGradient) return;
    if (next) {
      onChange({
        kind: 'gradient',
        from: color.kind === 'solid' ? color.color : color.from,
        to: color.kind === 'gradient' ? color.to : '#000000',
        angle: color.kind === 'gradient' ? color.angle : 45,
      });
    } else {
      onChange({
        kind: 'solid',
        color: color.kind === 'gradient' ? color.from : color.color,
      });
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h4 className="section-heading" style={{ margin: 0 }}>
          Color <span style={{ opacity: 0.6 }}>(classic or gradient)</span>
        </h4>
        <Toggle on={isGradient} onChange={toggleGradient} label="Use gradient color" />
      </div>

      {!isGradient && color.kind === 'solid' && (
        <input
          type="color"
          aria-label="Icon color"
          value={color.color}
          onChange={(e) => onChange({ kind: 'solid', color: e.target.value })}
          style={colorInputStyle}
        />
      )}

      {isGradient && color.kind === 'gradient' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={smallLabelStyle}>From</label>
              <input
                type="color"
                aria-label="Icon gradient start color"
                value={color.from}
                onChange={(e) => onChange({ ...color, from: e.target.value })}
                style={colorInputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={smallLabelStyle}>To</label>
              <input
                type="color"
                aria-label="Icon gradient end color"
                value={color.to}
                onChange={(e) => onChange({ ...color, to: e.target.value })}
                style={colorInputStyle}
              />
            </div>
          </div>
          <SliderWithInput
            label="Angle"
            ariaLabel="Icon gradient angle"
            value={Math.round(color.angle)}
            min={0}
            max={360}
            step={1}
            unit="°"
            onChange={(v) => onChange({ ...color, angle: v })}
          />
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  fontSize: 13,
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
};

const colorInputStyle: React.CSSProperties = {
  width: '100%',
  height: 32,
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'transparent',
  padding: 2,
};

const smallLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--color-text-muted)',
  marginBottom: 4,
};
