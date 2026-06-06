export function TutorialModal({
  open,
  onClose,
  onStartTour,
}: {
  open: boolean;
  onClose: () => void;
  onStartTour: () => void;
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Tutorial"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--color-bg)',
          color: 'var(--color-text)',
          width: '100%',
          maxWidth: 460,
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
          How to use Disccotools
        </h2>
        <ol
          style={{
            margin: 0,
            paddingLeft: 22,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            fontSize: 14,
            lineHeight: 1.55,
            color: 'var(--color-text)',
          }}
        >
          <li>Pick a background: solid color, gradient, or transparent.</li>
          <li>Choose a shape: circle, square, or rounded square.</li>
          <li>Add layers: icons, text, or your uploaded images.</li>
          <li>Adjust each layer: position, scale, rotation, opacity.</li>
          <li>Choose a resolution and click Download PNG.</li>
          <li>Sign in with Discord to save your work and come back later.</li>
        </ol>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            onClick={onStartTour}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Take the guided tour
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'var(--color-accent)',
              color: 'white',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
