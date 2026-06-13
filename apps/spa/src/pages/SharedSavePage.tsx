import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSharedSave } from '../api/saves.js';
import { Editor } from '../editor/Editor.js';
import { useRecipeStore } from '../editor/useRecipeStore.js';

// Opening /share/:token loads the shared design straight into the editor.
// Saving from there creates a fresh save under the current user - the original
// stays with its creator.
export function SharedSavePage() {
  const { token } = useParams<{ token: string }>();
  const resetTo = useRecipeStore((s) => s.resetTo);
  const setCurrentSave = useRecipeStore((s) => s.setCurrentSave);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setStatus('loading');
    getSharedSave(token)
      .then((shared) => {
        if (cancelled) return;
        resetTo(shared.recipe);
        // null currentSave so the SaveButton creates a fresh row in this user's account
        setCurrentSave(null);
        setOwnerName(shared.ownerName);
        setStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [token, resetTo, setCurrentSave]);

  return (
    <>
      <Editor />
      {status === 'loading' && <ImportBanner kind="loading" />}
      {status === 'error' && <ImportBanner kind="error" />}
      {status === 'ready' && ownerName && !dismissed && (
        <ImportBanner kind="ready" ownerName={ownerName} onDismiss={() => setDismissed(true)} />
      )}
    </>
  );
}

function ImportBanner({
  kind,
  ownerName,
  onDismiss,
}: {
  kind: 'loading' | 'error' | 'ready';
  ownerName?: string;
  onDismiss?: () => void;
}) {
  const styleBase: React.CSSProperties = {
    position: 'fixed',
    top: 64,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
    borderRadius: 'var(--radius-md)',
    padding: '8px 14px',
    fontSize: 12,
    color: 'var(--color-text)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    zIndex: 50,
    maxWidth: 'calc(100% - 32px)',
  };

  if (kind === 'loading') {
    return (
      <div style={styleBase} role="status">
        <span>Loading shared design…</span>
      </div>
    );
  }
  if (kind === 'error') {
    return (
      <div
        style={{ ...styleBase, borderColor: '#ef4444', color: '#ef4444' }}
        role="alert"
      >
        <span>This share link is invalid or has been revoked.</span>
      </div>
    );
  }
  return (
    <div style={styleBase} role="status">
      <span>
        ✨ Editing a shared design from <strong>{ownerName}</strong>. Save to keep your own copy.
      </span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notice"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-muted)',
            fontSize: 14,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
