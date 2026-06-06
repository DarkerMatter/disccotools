import type { IconColor, IconLayer, Layer } from '@disccotools/shared';
import { useRecipeStore } from './useRecipeStore.js';
import { SliderWithInput } from './controls/SliderWithInput.js';

const headingStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--color-text-muted)',
  margin: '0 0 8px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  color: 'var(--color-text-muted)',
  marginBottom: 4,
};

const textInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
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
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

export function PropertiesPanel() {
  const layer = useRecipeStore((s) => {
    if (!s.selectedId) return null;
    return s.recipe.layers.find((l) => l.id === s.selectedId) ?? null;
  });
  const updateLayer = useRecipeStore((s) => s.updateLayer);

  if (!layer) {
    return (
      <section aria-label="Properties" data-tour-id="properties">
        <h3 style={headingStyle}>Properties</h3>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          Select a layer to edit its properties.
        </p>
      </section>
    );
  }

  function patch<L extends Layer>(p: Partial<L>) {
    updateLayer(layer!.id, p);
  }

  return (
    <section aria-label="Properties" data-tour-id="properties">
      <h3 style={headingStyle}>Properties</h3>

      {layer.kind === 'image' && (
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>
          Image layer from your library. Use Position, Scale, Rotation, and Opacity to adjust.
        </p>
      )}

      {layer.kind === 'icon' && (
        <IconColorControl
          color={layer.color}
          onChange={(next) => patch<IconLayer>({ color: next })}
        />
      )}

      {layer.kind === 'text' && (
        <>
          <Field label="Text">
            <input
              type="text"
              aria-label="Text content"
              value={layer.text}
              onChange={(e) => patch({ text: e.target.value })}
              style={textInputStyle}
            />
          </Field>
          <Field label="Font">
            <input
              type="text"
              aria-label="Font family"
              value={layer.font}
              onChange={(e) => patch({ font: e.target.value })}
              style={textInputStyle}
            />
          </Field>
          <Field label="Color">
            <input
              type="color"
              aria-label="Text color"
              value={layer.color}
              onChange={(e) => patch({ color: e.target.value })}
              style={colorInputStyle}
            />
          </Field>
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

      <SliderWithInput
        label="Opacity"
        value={Math.round(layer.opacity * 100)}
        min={0}
        max={100}
        step={1}
        unit="%"
        onChange={(v) => patch({ opacity: v / 100 })}
      />

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
        label="Rotation"
        value={Math.round(layer.rotation)}
        min={-180}
        max={180}
        step={1}
        unit="°"
        onChange={(v) => patch({ rotation: v })}
      />

      <SliderWithInput
        label="X"
        value={Math.round(layer.x * 100)}
        min={0}
        max={100}
        step={1}
        unit="%"
        onChange={(v) => patch({ x: v / 100 })}
      />

      <SliderWithInput
        label="Y"
        value={Math.round(layer.y * 100)}
        min={0}
        max={100}
        step={1}
        unit="%"
        onChange={(v) => patch({ y: v / 100 })}
      />
    </section>
  );
}

function IconColorControl({
  color,
  onChange,
}: {
  color: IconColor;
  onChange: (next: IconColor) => void;
}) {
  function switchTo(kind: IconColor['kind']) {
    if (kind === color.kind) return;
    if (kind === 'solid') {
      onChange({
        kind: 'solid',
        color: color.kind === 'gradient' ? color.from : color.color,
      });
      return;
    }
    onChange({
      kind: 'gradient',
      from: color.kind === 'solid' ? color.color : color.from,
      to: color.kind === 'gradient' ? color.to : '#000000',
      angle: color.kind === 'gradient' ? color.angle : 45,
    });
  }

  const tabs: { value: IconColor['kind']; label: string }[] = [
    { value: 'solid', label: 'Solid' },
    { value: 'gradient', label: 'Gradient' },
  ];

  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>Color</label>
      <div
        aria-label="Icon fill mode"
        style={{
          display: 'inline-flex',
          gap: 0,
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 2,
          marginBottom: 8,
          background: 'var(--color-bg)',
        }}
      >
        {tabs.map((tab) => {
          const active = color.kind === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              aria-pressed={active}
              onClick={() => switchTo(tab.value)}
              style={{
                background: active ? 'var(--color-surface-elev)' : 'transparent',
                color: 'var(--color-text)',
                border: 'none',
                padding: '6px 10px',
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {color.kind === 'solid' && (
        <input
          type="color"
          aria-label="Icon color"
          value={color.color}
          onChange={(e) => onChange({ kind: 'solid', color: e.target.value })}
          style={colorInputStyle}
        />
      )}

      {color.kind === 'gradient' && (
        <div>
          <label
            style={{
              display: 'block',
              fontSize: 12,
              color: 'var(--color-text-muted)',
              marginBottom: 4,
            }}
          >
            From
          </label>
          <input
            type="color"
            aria-label="Icon gradient start color"
            value={color.from}
            onChange={(e) => onChange({ ...color, from: e.target.value })}
            style={colorInputStyle}
          />
          <label
            style={{
              display: 'block',
              fontSize: 12,
              color: 'var(--color-text-muted)',
              margin: '8px 0 4px',
            }}
          >
            To
          </label>
          <input
            type="color"
            aria-label="Icon gradient end color"
            value={color.to}
            onChange={(e) => onChange({ ...color, to: e.target.value })}
            style={colorInputStyle}
          />
          <div style={{ marginTop: 8 }}>
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
        </div>
      )}
    </div>
  );
}
