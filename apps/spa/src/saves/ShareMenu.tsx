import { useEffect, useRef, useState } from 'react';
import { revokeShare, shareSave } from '../api/saves.js';

export function ShareMenu({
  saveId,
  initialToken,
  onChange,
  triggerClassName,
  triggerStyle,
}: {
  saveId: string;
  initialToken: string | null;
  onChange?: (token: string | null) => void;
  triggerClassName?: string;
  triggerStyle?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState(initialToken);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // keep in sync if the parent's known token changes (rename, refetch, etc)
  useEffect(() => {
    setToken(initialToken);
  }, [initialToken]);

  async function handleToggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setError(null);
    if (token) return;
    // auto-create on first open. shareSave is idempotent server-side.
    setBusy(true);
    try {
      const updated = await shareSave(saveId);
      setToken(updated.shareToken);
      onChange?.(updated.shareToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create share link');
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke() {
    setBusy(true);
    setError(null);
    try {
      const updated = await revokeShare(saveId);
      setToken(updated.shareToken);
      onChange?.(updated.shareToken);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not revoke share');
    } finally {
      setBusy(false);
    }
  }

  function shareUrl(): string {
    if (!token) return '';
    if (typeof window === 'undefined') return `/share/${token}`;
    return `${window.location.origin}/share/${token}`;
  }

  async function handleCopy() {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(shareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard might be blocked; the input is selectable as a fallback
    }
  }

  const triggerLabel = token ? 'Share link' : 'Share';
  const triggerProps: { className?: string; style?: React.CSSProperties } = {};
  if (triggerClassName !== undefined) triggerProps.className = triggerClassName;
  if (triggerStyle !== undefined) triggerProps.style = triggerStyle;

  return (
    <div className="share-menu" ref={rootRef}>
      <button
        type="button"
        onClick={() => void handleToggle()}
        aria-expanded={open}
        aria-haspopup="dialog"
        {...triggerProps}
      >
        {triggerLabel}
      </button>
      {open && (
        <div
          className="share-menu__pop"
          role="dialog"
          aria-label="Share link"
        >
          <p className="share-menu__heading">Share this save</p>
          {busy && !token && (
            <p className="share-menu__status">Creating link…</p>
          )}
          {error && (
            <p className="share-menu__error" role="alert">{error}</p>
          )}
          {token && (
            <>
              <div className="share-menu__url">
                <input
                  type="text"
                  readOnly
                  value={shareUrl()}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label="Share URL"
                />
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className="share-menu__copy"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <div className="share-menu__actions">
                <button
                  type="button"
                  onClick={() => void handleRevoke()}
                  disabled={busy}
                  className="share-menu__revoke"
                >
                  Stop sharing
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="share-menu__close"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
