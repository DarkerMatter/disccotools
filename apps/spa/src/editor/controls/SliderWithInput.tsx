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
  shortLabel,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (next: number) => void;
  ariaLabel?: string;
  /** one-letter prefix that lives in the left grid column (e.g. "X", "Y", "Z"). default is none. */
  shortLabel?: string;
}) {
  const a11y = ariaLabel ?? label;
  // keep typed text separate so half-typed values like "-" or "" don't snap mid-edit
  const [text, setText] = useState(String(value));

  useEffect(() => {
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
    <div>
      {!shortLabel && (
        <label
          style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
            marginBottom: 6,
          }}
        >
          {label}
        </label>
      )}
      <div className="slider-row">
        <span className="slider-row__label" aria-hidden="true">
          {shortLabel ?? ''}
        </span>
        <input
          type="range"
          aria-label={a11y}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="slider-input"
        />
        <div className="slider-value">
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
          />
          {unit && <span className="slider-value__unit">{unit}</span>}
        </div>
      </div>
    </div>
  );
}
