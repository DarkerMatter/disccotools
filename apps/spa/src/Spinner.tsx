export function Spinner({
  size = 18,
  label,
}: {
  size?: number;
  label?: string;
}) {
  return (
    <span
      className="spinner-row"
      role={label ? 'status' : undefined}
      aria-live={label ? 'polite' : undefined}
    >
      <span
        className="spinner"
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
      {label && <span className="spinner-row__label">{label}</span>}
    </span>
  );
}
