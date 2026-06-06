import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Asset } from '@disccotools/shared';
import { ApiError, logout } from '../api/client.js';
import {
  AssetInUseError,
  deleteAsset,
  listAssets,
  renameAsset,
  updateAssetTags,
  uploadAssetWithProgress,
  validateAssetFile,
} from '../api/assets.js';
import { LoginButton } from '../auth/LoginButton.js';
import { UserPill } from '../auth/UserPill.js';
import { useUser } from '../auth/useUser.js';
import { ThemeToggle } from '../theme/ThemeToggle.js';
import { AssetCard } from '../assets/AssetCard.js';
import { TopTabs } from '../TopTabs.js';

function defaultName(file: File): string {
  const base = file.name.replace(/\.[^.]+$/, '');
  return base.length > 0 ? base : file.name;
}

function Dropzone({
  onFile,
  disabled,
}: {
  onFile: (f: File) => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        if (disabled) return;
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
      }}
      onClick={() => {
        if (disabled) return;
        ref.current?.click();
      }}
      role="button"
      aria-label="Upload an asset"
      tabIndex={disabled ? -1 : 0}
      style={{
        padding: 24,
        border: `2px dashed ${dragging ? 'var(--color-accent)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)',
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: 'var(--color-text-muted)',
        marginBottom: 16,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <p style={{ margin: 0, fontSize: 14 }}>
        {disabled ? 'Uploading…' : 'Drop an image here, or click to pick.'}
      </p>
      <p style={{ margin: '6px 0 0 0', fontSize: 11 }}>
        PNG, JPEG, WebP, up to 10 MB.
      </p>
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
        style={{ display: 'none' }}
      />
    </div>
  );
}

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; fileName: string; fraction: number }
  | { status: 'error'; message: string };

export function ImagesPage() {
  const userState = useUser();
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [upload, setUpload] = useState<UploadState>({ status: 'idle' });
  const [query, setQuery] = useState('');

  const authenticated = userState.status === 'authenticated';

  const filteredAssets = useMemo(() => {
    if (assets === null) return null;
    const q = query.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.tags ?? []).some((t) => t.toLowerCase().includes(q)),
    );
  }, [assets, query]);

  const fetchAssets = useCallback(async () => {
    setError(null);
    try {
      const list = await listAssets();
      setAssets(list);
    } catch (err) {
      console.error('listAssets failed', err);
      setError('Could not load your assets.');
      setAssets([]);
    }
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    void fetchAssets();
  }, [authenticated, fetchAssets]);

  async function handleUpload(file: File) {
    const guard = validateAssetFile(file);
    if (guard) {
      setUpload({ status: 'error', message: guard });
      return;
    }
    setUpload({ status: 'uploading', fileName: file.name, fraction: 0 });
    try {
      const asset = await uploadAssetWithProgress(
        file,
        defaultName(file),
        (p) =>
          setUpload({
            status: 'uploading',
            fileName: file.name,
            fraction: Number.isFinite(p.fraction) ? p.fraction : 0,
          }),
      );
      setAssets((prev) => (prev ? [asset, ...prev] : [asset]));
      setUpload({ status: 'idle' });
    } catch (err) {
      console.error('uploadAsset failed', err);
      const message = err instanceof ApiError ? err.message : 'Upload failed.';
      setUpload({ status: 'error', message });
    }
  }

  async function handleRename(asset: Asset, name: string) {
    const previous = asset.name;
    setAssets((prev) =>
      prev ? prev.map((a) => (a.id === asset.id ? { ...a, name } : a)) : prev,
    );
    try {
      const updated = await renameAsset(asset.id, name);
      setAssets((prev) =>
        prev ? prev.map((a) => (a.id === updated.id ? updated : a)) : prev,
      );
    } catch (err) {
      console.error('renameAsset failed', err);
      setAssets((prev) =>
        prev ? prev.map((a) => (a.id === asset.id ? { ...a, name: previous } : a)) : prev,
      );
    }
  }

  async function handleTagsChange(asset: Asset, tags: string[]) {
    const previous = asset.tags;
    setAssets((prev) =>
      prev ? prev.map((a) => (a.id === asset.id ? { ...a, tags } : a)) : prev,
    );
    try {
      const updated = await updateAssetTags(asset.id, tags);
      setAssets((prev) =>
        prev ? prev.map((a) => (a.id === updated.id ? updated : a)) : prev,
      );
    } catch (err) {
      console.error('updateAssetTags failed', err);
      setAssets((prev) =>
        prev ? prev.map((a) => (a.id === asset.id ? { ...a, tags: previous } : a)) : prev,
      );
    }
  }

  async function handleDelete(asset: Asset) {
    // not optimistic on purpose: a 409 surfaces "in use by N saves" without the card remounting
    try {
      await deleteAsset(asset.id);
      setAssets((prev) => (prev ? prev.filter((a) => a.id !== asset.id) : prev));
    } catch (err) {
      // mocked tests can break instanceof across module boundaries, hence the name fallback
      if (
        err instanceof AssetInUseError ||
        (err instanceof Error && err.name === 'AssetInUseError')
      ) {
        throw err;
      }
      console.error('deleteAsset failed', err);
    }
  }

  async function handleLogout() {
    await logout();
    window.location.reload();
  }

  return (
    <main className="app-shell" style={{ minHeight: '100vh' }}>
      <header className="app-header">
        <Link to="/" className="app-header__brand">
          disccotools
        </Link>
        <TopTabs />
        <nav className="app-header__actions">
          <ThemeToggle />
          <div className="auth-slot">
            {userState.status === 'anonymous' && <LoginButton />}
            {userState.status === 'authenticated' && (
              <UserPill user={userState.user} onLogout={handleLogout} />
            )}
          </div>
        </nav>
      </header>

      <section className="page-content">
        {userState.status === 'loading' && (
          <p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>
        )}

        {userState.status === 'anonymous' && (
          <div
            style={{
              padding: 24,
              border: '1px dashed var(--color-border)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
              color: 'var(--color-text-muted)',
            }}
          >
            Sign in to upload and reuse your own images.
          </div>
        )}

        {authenticated && (
          <>
            <Dropzone
              onFile={(f) => void handleUpload(f)}
              disabled={upload.status === 'uploading'}
            />
            {upload.status === 'uploading' && (
              <div role="status" aria-live="polite" style={{ marginBottom: 12 }}>
                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--color-text-muted)',
                    margin: '0 0 4px 0',
                  }}
                >
                  Uploading {upload.fileName}… {Math.round(upload.fraction * 100)}%
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
              <div
                role="alert"
                style={{
                  marginBottom: 12,
                  padding: '8px 12px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#ef4444',
                  fontSize: 13,
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <span>{upload.message}</span>
                <button
                  type="button"
                  onClick={() => setUpload({ status: 'idle' })}
                  aria-label="Dismiss upload error"
                  style={{
                    background: 'transparent',
                    color: 'inherit',
                    border: '1px solid currentColor',
                    borderRadius: 'var(--radius-sm)',
                    padding: '2px 8px',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Dismiss
                </button>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or tag"
                aria-label="Search assets"
                style={{
                  width: '100%',
                  maxWidth: 360,
                  padding: '6px 10px',
                  fontSize: 13,
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                }}
              />
            </div>

            {assets === null && !error && (
              <p style={{ color: 'var(--color-text-muted)' }}>Loading your assets…</p>
            )}

            {error && (
              <p role="alert" style={{ color: 'var(--color-text-muted)' }}>
                {error}
              </p>
            )}

            {assets !== null && assets.length === 0 && !error && (
              <div
                style={{
                  padding: 32,
                  border: '1px dashed var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                }}
              >
                <p style={{ marginBottom: 8 }}>No assets yet.</p>
                <p style={{ margin: 0, fontSize: 12 }}>Drop an image above to get started.</p>
              </div>
            )}

            {assets !== null &&
              assets.length > 0 &&
              filteredAssets !== null &&
              filteredAssets.length === 0 && (
                <div
                  style={{
                    padding: 24,
                    border: '1px dashed var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  No assets match your search.
                </div>
              )}

            {filteredAssets !== null && filteredAssets.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: 16,
                }}
              >
                {filteredAssets.map((a) => (
                  <AssetCard
                    key={a.id}
                    asset={a}
                    onRename={(name) => handleRename(a, name)}
                    onDelete={() => handleDelete(a)}
                    onTagsChange={(tags) => handleTagsChange(a, tags)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
