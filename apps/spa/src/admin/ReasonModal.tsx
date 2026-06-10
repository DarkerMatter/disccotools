import { useEffect, useRef, useState } from 'react';

export function ReasonModal({
  title,
  description,
  confirmLabel = 'Confirm',
  onCancel,
  onConfirm,
  destructive = true,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
  destructive?: boolean;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('Reason is required');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onConfirm(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed');
      setBusy(false);
    }
  }

  return (
    <div className="reason-modal__backdrop" onClick={onCancel}>
      <form
        className="reason-modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2 className="reason-modal__title">{title}</h2>
        <p className="reason-modal__desc">{description}</p>
        <label className="reason-modal__label">
          Reason (shown to the affected user)
          <textarea
            ref={textareaRef}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={4}
            disabled={busy}
            placeholder="e.g. uploaded image violates our content policy"
          />
        </label>
        {error && <p className="reason-modal__error">{error}</p>}
        <div className="reason-modal__actions">
          <button
            type="button"
            className="cta-button cta-button--secondary"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={destructive ? 'cta-button cta-button--danger' : 'cta-button'}
            disabled={busy}
          >
            {busy ? 'Working...' : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
