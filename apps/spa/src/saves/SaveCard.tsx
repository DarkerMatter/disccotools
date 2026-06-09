import { Link } from 'react-router-dom';
import { useState } from 'react';
import type { SaveSummary } from '@disccotools/shared';
import { TagChips } from '../tags/TagChips.js';
import { Canvas } from '../editor/Canvas.js';
import { downloadBlob, renderToPng } from '../editor/render.js';

function timeAgo(ms: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function shareUrlFor(token: string): string {
  if (typeof window === 'undefined') return `/share/${token}`;
  return `${window.location.origin}/share/${token}`;
}

export function SaveCard({
  save,
  onClone,
  onDelete,
  onRename,
  onTagsChange,
  onShare,
  onRevokeShare,
}: {
  save: SaveSummary;
  onClone: () => void;
  onDelete: () => void;
  onRename: (name: string) => Promise<void> | void;
  onTagsChange: (tags: string[]) => Promise<void> | void;
  onShare?: () => Promise<void> | void;
  onRevokeShare?: () => Promise<void> | void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(save.name);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

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

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      const blob = await renderToPng(save.recipe);
      const slug = save.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'icon';
      downloadBlob(blob, `disccotools-${slug}-${save.recipe.size}.png`);
    } catch (err) {
      console.error('download failed', err);
    } finally {
      setDownloading(false);
    }
  }

  async function handleShareToggle() {
    if (save.shareToken) {
      setSharing(true);
    } else if (onShare) {
      await onShare();
      setSharing(true);
    }
  }

  async function handleCopyShare() {
    if (!save.shareToken) return;
    const url = shareUrlFor(save.shareToken);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard might be blocked; fallback to selecting input
    }
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
          display: 'flex',
          aspectRatio: '1 / 1',
          background: 'var(--color-surface-elev)',
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 8,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Canvas recipe={save.recipe} displaySize={200} interactive={false} />
        </div>
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
          {onShare && (
            <button
              type="button"
              onClick={() => void handleShareToggle()}
              style={ghostBtnStyle}
              aria-expanded={sharing}
            >
              {save.shareToken ? 'Share link' : 'Share'}
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={downloading}
            style={ghostBtnStyle}
          >
            {downloading ? 'Rendering…' : 'Download'}
          </button>
          <button type="button" onClick={onClone} style={ghostBtnStyle}>
            Clone
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

        {sharing && save.shareToken && (
          <div
            style={{
              marginTop: 4,
              padding: 8,
              border: '1px dashed var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-bg)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                type="text"
                readOnly
                value={shareUrlFor(save.shareToken)}
                aria-label="Share URL"
                onFocus={(e) => e.currentTarget.select()}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: '4px 6px',
                  fontSize: 11,
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                }}
              />
              <button type="button" onClick={() => void handleCopyShare()} style={ghostBtnStyle}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {onRevokeShare && (
                <button
                  type="button"
                  onClick={() => void onRevokeShare()}
                  style={{ ...ghostBtnStyle, color: '#ef4444' }}
                >
                  Stop sharing
                </button>
              )}
              <button type="button" onClick={() => setSharing(false)} style={ghostBtnStyle}>
                Close
              </button>
            </div>
          </div>
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
