import { Link } from 'react-router-dom';
import { useState } from 'react';
import type { SaveSummary } from '@disccotools/shared';

function timeAgo(ms: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function SaveCard({
  save,
  onClone,
  onDelete,
  onToggleTemplate,
}: {
  save: SaveSummary;
  onClone: () => void;
  onDelete: () => void;
  onToggleTemplate: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <article
      data-testid={`save-card-${save.id}`}
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Link
        to={`/editor/${save.id}`}
        aria-label={`Edit ${save.name}`}
        style={{
          display: 'block',
          aspectRatio: '1 / 1',
          background: 'var(--color-surface-elev)',
          overflow: 'hidden',
        }}
      >
        {save.thumbnailUrl ? (
          <img
            src={save.thumbnailUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              fontSize: 12,
              color: 'var(--color-text-muted)',
            }}
          >
            No preview
          </span>
        )}
      </Link>

      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 600,
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={save.name}
          >
            {save.name}
          </h3>
          {save.isTemplate && (
            <span
              style={{
                background: 'var(--color-accent-bg)',
                color: 'var(--color-accent)',
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              TEMPLATE
            </span>
          )}
        </div>
        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>
          Updated {timeAgo(save.updatedAt)}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <Link
            to={`/editor/${save.id}`}
            style={ghostBtnStyle}
          >
            Edit
          </Link>
          <button type="button" onClick={onClone} style={ghostBtnStyle}>
            Clone
          </button>
          <button
            type="button"
            onClick={onToggleTemplate}
            style={ghostBtnStyle}
            aria-pressed={save.isTemplate}
          >
            {save.isTemplate ? 'Unmark template' : 'Make template'}
          </button>
          {!confirming && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              style={{ ...ghostBtnStyle, color: '#ef4444' }}
            >
              Delete
            </button>
          )}
          {confirming && (
            <>
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  onDelete();
                }}
                style={{ ...ghostBtnStyle, background: '#ef4444', color: 'white', borderColor: '#ef4444' }}
              >
                Confirm delete
              </button>
              <button type="button" onClick={() => setConfirming(false)} style={ghostBtnStyle}>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

const ghostBtnStyle: React.CSSProperties = {
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  padding: '4px 8px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  fontSize: 11,
  fontWeight: 500,
  cursor: 'pointer',
  textDecoration: 'none',
};
