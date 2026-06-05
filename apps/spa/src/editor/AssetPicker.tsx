import { useEffect, useState } from 'react';
import type { Asset } from '@disccotools/shared';
import { ApiError } from '../api/client.js';
import {
  listAssets,
  uploadAssetWithProgress,
  validateAssetFile,
} from '../api/assets.js';

type Tab = 'myLibrary' | 'upload';

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; fraction: number }
  | { status: 'error'; message: string };

function defaultName(file: File): string {
  const base = file.name.replace(/\.[^.]+$/, '');
  return base.length > 0 ? base : file.name;
}

export function AssetPicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: Asset) => void;
}) {
  const [tab, setTab] = useState<Tab>('myLibrary');
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // upload tab state
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [upload, setUpload] = useState<UploadState>({ status: 'idle' });

  useEffect(() => {
    if (!open) return;
    setTab('myLibrary');
    setError(null);
    setUpload({ status: 'idle' });
    setFile(null);
    setName('');

    let cancelled = false;
    listAssets()
      .then((list) => {
        if (cancelled) return;
        setAssets(list);
      })
      .catch((err) => {
        console.error('listAssets failed', err);
        if (cancelled) return;
        setError('Could not load your assets.');
        setAssets([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  function handleFile(f: File | null) {
    setFile(f);
    if (f) {
      setName(defaultName(f));
      const guard = validateAssetFile(f);
      if (guard) {
        setUpload({ status: 'error', message: guard });
      } else {
        setUpload({ status: 'idle' });
      }
    } else {
      setUpload({ status: 'idle' });
    }
  }

  async function handleUpload() {
    if (!file) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setUpload({ status: 'error', message: 'Name is required.' });
      return;
    }
    const guard = validateAssetFile(file);
    if (guard) {
      setUpload({ status: 'error', message: guard });
      return;
    }
    setUpload({ status: 'uploading', fraction: 0 });
    try {
      const asset = await uploadAssetWithProgress(file, trimmed, (p) =>
        setUpload({
          status: 'uploading',
          fraction: Number.isFinite(p.fraction) ? p.fraction : 0,
        }),
      );
      setAssets((prev) => (prev ? [asset, ...prev] : [asset]));
      setUpload({ status: 'idle' });
      onSelect(asset);
    } catch (err) {
      console.error('uploadAsset failed', err);
      const message = err instanceof ApiError ? err.message : 'Upload failed.';
      setUpload({ status: 'error', message });
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Asset picker"
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
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--color-bg)',
          color: 'var(--color-text)',
          width: '100%',
          maxWidth: 720,
          maxHeight: '80vh',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <header
          style={{
            display: 'flex',
            gap: 8,
            padding: 12,
            borderBottom: '1px solid var(--color-border)',
            alignItems: 'center',
          }}
        >
          <div role="tablist" aria-label="Asset picker tabs" style={{ display: 'inline-flex', gap: 4, flex: 1 }}>
            {(
              [
                { id: 'myLibrary' as const, label: 'My library' },
                { id: 'upload' as const, label: 'Upload new' },
              ]
            ).map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.id)}
                  style={{
                    padding: '6px 12px',
                    fontSize: 13,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    background: active ? 'var(--color-surface-elev)' : 'var(--color-surface)',
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close asset picker"
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontSize: 13,
            }}
          >
            Close
          </button>
        </header>

        <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
          {tab === 'myLibrary' && (
            <>
              {assets === null && !error && (
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Loading…</p>
              )}
              {error && (
                <p role="alert" style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                  {error}
                </p>
              )}
              {assets !== null && assets.length === 0 && !error && (
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                  No assets yet. Switch to Upload to add one.
                </p>
              )}
              {assets !== null && assets.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
                    gap: 8,
                  }}
                >
                  {assets.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      aria-label={`Insert ${a.name}`}
                      onClick={() => onSelect(a)}
                      style={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: 4,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                        cursor: 'pointer',
                      }}
                    >
                      <img
                        src={a.url}
                        alt={a.name}
                        style={{
                          width: '100%',
                          aspectRatio: '1 / 1',
                          objectFit: 'contain',
                        }}
                      />
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--color-text-muted)',
                          width: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          textAlign: 'center',
                        }}
                        title={a.name}
                      >
                        {a.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  fontSize: 12,
                  color: 'var(--color-text-muted)',
                }}
              >
                Pick an image
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                  aria-label="Pick image file"
                />
              </label>
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  fontSize: 12,
                  color: 'var(--color-text-muted)',
                }}
              >
                Name
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-label="Asset name"
                  style={{
                    padding: '6px 8px',
                    fontSize: 13,
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-bg)',
                    color: 'var(--color-text)',
                  }}
                />
              </label>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--color-text-muted)' }}>
                PNG, JPEG, WebP — up to 10 MB.
              </p>
              {upload.status === 'uploading' && (
                <div role="status" aria-live="polite">
                  <p
                    style={{
                      margin: '0 0 4px 0',
                      fontSize: 12,
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    Uploading… {Math.round(upload.fraction * 100)}%
                  </p>
                  <div
                    aria-hidden="true"
                    style={{
                      height: 6,
                      background: 'var(--color-border)',
                      borderRadius: 999,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.max(0, Math.min(1, upload.fraction)) * 100}%`,
                        height: '100%',
                        background: 'var(--color-accent)',
                        transition: 'width 80ms linear',
                      }}
                    />
                  </div>
                </div>
              )}
              {upload.status === 'error' && (
                <p role="alert" style={{ fontSize: 12, color: '#ef4444', margin: 0 }}>
                  {upload.message}
                </p>
              )}
              <button
                type="button"
                onClick={() => void handleUpload()}
                disabled={!file || upload.status === 'uploading'}
                style={{
                  alignSelf: 'flex-start',
                  background: 'var(--color-accent)',
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  opacity: !file || upload.status === 'uploading' ? 0.5 : 1,
                  cursor:
                    !file || upload.status === 'uploading' ? 'not-allowed' : 'pointer',
                }}
              >
                {upload.status === 'uploading' ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
