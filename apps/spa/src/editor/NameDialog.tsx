import { useEffect, useRef, useState } from 'react';

export function NameDialog({
  initial = '',
  title = 'Name this save',
  onSubmit,
  onCancel,
}: {
  initial?: string;
  title?: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const valid = value.trim().length > 0;

  return (
    <div
      role="dialog"
      aria-label={title}
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
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSubmit(value.trim());
        }}
        style={{
          background: 'var(--color-bg)',
          color: 'var(--color-text)',
          width: '100%',
          maxWidth: 380,
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{title}</h2>
        <input
          ref={inputRef}
          type="text"
          aria-label="Save name"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="My icon"
          style={{
            padding: '8px 10px',
            fontSize: 14,
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--color-bg)',
            color: 'var(--color-text)',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontSize: 13,
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!valid}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'var(--color-accent)',
              color: 'white',
              fontSize: 13,
              fontWeight: 600,
              opacity: valid ? 1 : 0.5,
              cursor: valid ? 'pointer' : 'not-allowed',
            }}
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
