import { Link } from 'react-router-dom';
import { useState } from 'react';
import type { SaveSummary } from '@disccotools/shared';
import { TagChips } from '../tags/TagChips.js';

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
  onRename,
  onTagsChange,
}: {
  save: SaveSummary;
  onClone: () => void;
  onDelete: () => void;
  onToggleTemplate: () => void;
  onRename: (name: string) => Promise<void> | void;
  onTagsChange: (tags: string[]) => Promise<void> | void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(save.name);

  async function handleSaveName() {
    const next = draftName.trim();
    if (!next || next === save.name) {
      setEditingName(false);
      setDraftName(save.name);
      return;
    }
    await onRename(next);
    setEditingName(false);
  }

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
          {!editingName && (
            <button
              type="button"
              onClick={() => {
                setDraftName(save.name);
                setEditingName(true);
              }}
              aria-label={`Rename ${save.name}`}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--color-text)',
                textAlign: 'left',
                cursor: 'text',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
                minWidth: 0,
              }}
              title={save.name}
            >
              {save.name}
            </button>
          )}
          {editingName && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
              <input
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                aria-label="Save name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSaveName();
                  else if (e.key === 'Escape') {
                    setEditingName(false);
                    setDraftName(save.name);
                  }
                }}
                style={{
                  flex: 1,
                  minWidth: 80,
                  padding: '4px 6px',
                  fontSize: 12,
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                }}
              />
              <button type="button" onClick={() => void handleSaveName()} style={ghostBtnStyle}>
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingName(false);
                  setDraftName(save.name);
                }}
                style={ghostBtnStyle}
              >
                Cancel
              </button>
            </div>
          )}
          {save.isTemplate && !editingName && (
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

        <TagChips tags={save.tags ?? []} onChange={onTagsChange} />

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
