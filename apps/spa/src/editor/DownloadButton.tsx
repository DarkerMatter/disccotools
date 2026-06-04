import { useState } from 'react';
import { useRecipeStore } from './useRecipeStore.js';
import { downloadBlob, renderToPng } from './render.js';

export function DownloadButton() {
  const recipe = useRecipeStore((s) => s.recipe);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await renderToPng(recipe);
      downloadBlob(blob, `disccotools-${recipe.size}.png`);
    } catch (err) {
      console.error('render failed', err);
      setError('Render failed. Try again or change resolution.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {error && (
        <span
          role="alert"
          style={{
            fontSize: 11,
            color: 'var(--color-text-muted)',
            maxWidth: 200,
            textAlign: 'right',
          }}
        >
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        aria-label="Download PNG"
        style={{
          background: 'var(--color-accent)',
          color: 'white',
          padding: '8px 14px',
          borderRadius: 'var(--radius-md)',
          fontWeight: 600,
          fontSize: 13,
          border: 'none',
          cursor: busy ? 'wait' : 'pointer',
          opacity: busy ? 0.7 : 1,
        }}
      >
        {busy ? 'Rendering…' : 'Download PNG'}
      </button>
    </span>
  );
}
