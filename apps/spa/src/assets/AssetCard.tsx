import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Asset } from '@disccotools/shared';
import { AssetInUseError } from '../api/assets.js';
import { TagChips } from '../tags/TagChips.js';

function timeAgo(ms: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function AssetCard({
  asset,
  onRename,
  onDelete,
  onTagsChange,
}: {
  asset: Asset;
  onRename: (name: string) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
  onTagsChange: (tags: string[]) => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(asset.name);
  const [confirming, setConfirming] = useState(false);
  const [inUseRefs, setInUseRefs] = useState<{ id: string; name: string }[] | null>(null);

  async function handleSaveName() {
    const next = draft.trim();
    if (!next || next === asset.name) {
      setEditing(false);
      return;
    }
    await onRename(next);
    setEditing(false);
  }

  async function handleConfirmDelete() {
    setConfirming(false);
    setInUseRefs(null);
    try {
      await onDelete();
    } catch (err) {
      // mocked tests can break instanceof across module boundaries, hence the name fallback
      if (err instanceof AssetInUseError) {
        setInUseRefs(err.references);
        return;
      }
      if (err instanceof Error && err.name === 'AssetInUseError') {
        const refs = (err as { references?: { id: string; name: string }[] }).references ?? [];
        setInUseRefs(refs);
        return;
      }
      throw err;
    }
  }

  return (
    <article
      data-testid={`asset-card-${asset.id}`}
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
      <div
        style={{
          aspectRatio: '1 / 1',
          background: 'var(--color-surface-elev)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <img
          src={asset.url}
          alt={asset.name}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>

      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setDraft(asset.name);
              setEditing(true);
            }}
            aria-label={`Rename ${asset.name}`}
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
            }}
            title={asset.name}
          >
            {asset.name}
          </button>
        )}
        {editing && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="Asset name"
              autoFocus
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
                setEditing(false);
                setDraft(asset.name);
              }}
              style={ghostBtnStyle}
            >
              Cancel
            </button>
          </div>
        )}

        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>
          Uploaded {timeAgo(asset.createdAt)}
        </p>

        <TagChips tags={asset.tags ?? []} onChange={onTagsChange} />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {!confirming && !inUseRefs && (
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
                onClick={() => void handleConfirmDelete()}
                style={{ ...ghostBtnStyle, background: '#ef4444', color: 'white', borderColor: '#ef4444' }}
              >
                Confirm delete
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                style={ghostBtnStyle}
              >
                Cancel
              </button>
            </>
          )}
        </div>

        {inUseRefs && inUseRefs.length > 0 && (
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>
            In use by {inUseRefs.length} save{inUseRefs.length === 1 ? '' : 's'}.{' '}
            <Link to="/saves" style={{ color: 'var(--color-accent)' }}>
              Manage saves
            </Link>
          </p>
        )}
        {inUseRefs && inUseRefs.length === 0 && (
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>
            Delete failed: asset is in use.
          </p>
        )}
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
