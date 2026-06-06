import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../auth/useUser.js';
import { createSave, updateSave } from '../api/saves.js';
import { ApiError } from '../api/client.js';
import { useRecipeStore } from './useRecipeStore.js';
import { NameDialog } from './NameDialog.js';

export function SaveButton() {
  const userState = useUser();
  const recipe = useRecipeStore((s) => s.recipe);
  const currentSave = useRecipeStore((s) => s.currentSave);
  const setCurrentSave = useRecipeStore((s) => s.setCurrentSave);
  const navigate = useNavigate();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const isAuthed = userState.status === 'authenticated';
  const disabled = busy;

  async function doSave(name: string, existingId: string | null) {
    setBusy(true);
    setError(null);
    try {
      const save = existingId
        ? await updateSave(existingId, { name, recipe })
        : await createSave({ name, recipe });
      // v2: we only store the recipe and reconstruct the PNG on demand,
      // so no R2 render upload step anymore
      setCurrentSave({ id: save.id, name: save.name });
      if (!existingId) navigate(`/editor/${save.id}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Save failed. Try again.';
      console.error('save failed', err);
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  function handleClick() {
    if (busy) return;
    if (!isAuthed) {
      window.location.href = '/api/auth/login';
      return;
    }
    if (currentSave) {
      void doSave(currentSave.name, currentSave.id);
    } else {
      setDialogOpen(true);
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
        data-tour-id="save"
        onClick={handleClick}
        disabled={disabled}
        title={isAuthed ? undefined : 'Sign in to save your design'}
        style={{
          background: 'var(--color-surface-elev)',
          color: 'var(--color-text)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          fontWeight: 600,
          fontSize: 13,
          border: '1px solid var(--color-border)',
          cursor: busy ? 'wait' : 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {busy ? 'Saving…' : !isAuthed ? '🔒 Sign in to save' : currentSave ? 'Save' : 'Save…'}
      </button>
      {dialogOpen && (
        <NameDialog
          onCancel={() => setDialogOpen(false)}
          onSubmit={(name) => {
            setDialogOpen(false);
            void doSave(name, null);
          }}
        />
      )}
    </span>
  );
}
