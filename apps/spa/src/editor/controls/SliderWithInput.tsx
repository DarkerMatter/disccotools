import { useEffect, useState } from 'react';

export function SliderWithInput({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
  ariaLabel,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (next: number) => void;
  /** Optional accessible name for both inputs. Defaults to `label`. */
  ariaLabel?: string;
}) {
  const a11y = ariaLabel ?? label;
  // Track the input's text state separately so users can type intermediate
  // values (like an empty box or "-" while typing) without snapping mid-edit.
  const [text, setText] = useState(String(value));

  useEffect(() => {
    // External value changes (slider drag, another control) sync into the field.
    setText(String(value));
  }, [value]);

  function commit(raw: string) {
    const trimmed = raw.trim();
    const parsed = Number(trimmed);
    if (trimmed === '' || !Number.isFinite(parsed)) {
      setText(String(value));
      return;
    }
    const clamped = Math.min(Math.max(parsed, min), max);
    onChange(clamped);
    setText(String(clamped));
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <label
        style={{
          display: 'block',
          fontSize: 12,
          color: 'var(--color-text-muted)',
          marginBottom: 4,
        }}
      >
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="range"
          aria-label={a11y}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ flex: 1 }}
        />
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
            width: 72,
          }}
        >
          <input
            type="number"
            aria-label={`${a11y} value`}
            min={min}
            max={max}
            step={step}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const target = e.target as HTMLInputElement;
                commit(target.value);
                target.blur();
              }
            }}
            style={{
              flex: 1,
              minWidth: 0,
              padding: '4px 6px',
              fontSize: 12,
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
              ['MozAppearance' as never]: 'textfield',
            }}
          />
          {unit && (
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              {unit}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
