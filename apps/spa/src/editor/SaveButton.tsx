import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../auth/useUser.js';
import { createSave, updateSave, uploadRender } from '../api/saves.js';
import { ApiError } from '../api/client.js';
import { useRecipeStore } from './useRecipeStore.js';
import { NameDialog } from './NameDialog.js';
import { renderRecipeAtSize, renderToPng } from './render.js';

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
  const disabled = !isAuthed || busy;

  async function doSave(name: string, existingId: string | null) {
    setBusy(true);
    setError(null);
    try {
      const save = existingId
        ? await updateSave(existingId, { name, recipe })
        : await createSave({ name, recipe });

      const full = await renderToPng(recipe);
      const thumb = await renderRecipeAtSize(recipe, 128);
      await uploadRender(save.id, full, thumb);

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
    if (disabled) return;
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
        onClick={handleClick}
        disabled={disabled}
        title={isAuthed ? undefined : 'Sign in to save'}
        style={{
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
          padding: '8px 14px',
          borderRadius: 'var(--radius-md)',
          fontWeight: 600,
          fontSize: 13,
          border: '1px solid var(--color-border)',
          cursor: disabled ? (busy ? 'wait' : 'not-allowed') : 'pointer',
          opacity: disabled && !busy ? 0.6 : 1,
        }}
      >
        {busy ? 'Saving…' : currentSave ? 'Save' : 'Save…'}
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
