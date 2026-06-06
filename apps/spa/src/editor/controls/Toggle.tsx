export function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-pressed={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className="pill-toggle"
    >
      <span className="pill-toggle__thumb" aria-hidden="true">
        {on ? '✓' : '✕'}
      </span>
    </button>
  );
}
