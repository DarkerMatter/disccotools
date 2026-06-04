import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Asset } from '@disccotools/shared';
import { logout } from '../api/client.js';
import {
  AssetInUseError,
  deleteAsset,
  listAssets,
  renameAsset,
  uploadAsset,
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
        PNG, SVG, JPEG, WebP — up to 10 MB.
      </p>
      <input
        ref={ref}
        type="file"
        accept="image/png,image/svg+xml,image/jpeg,image/webp"
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

export function ImagesPage() {
  const userState = useUser();
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const authenticated = userState.status === 'authenticated';

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
    setUploadError(null);
    setUploading(true);
    try {
      const asset = await uploadAsset(file, defaultName(file));
      setAssets((prev) => (prev ? [asset, ...prev] : [asset]));
    } catch (err) {
      console.error('uploadAsset failed', err);
      setUploadError('Upload failed.');
    } finally {
      setUploading(false);
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

  async function handleDelete(asset: Asset) {
    // Non-optimistic: keep the card mounted until the delete confirms. That
    // way, if the API returns 409 (in-use), AssetCard still has its local
    // state to surface "in use by N saves" without remount churn.
    try {
      await deleteAsset(asset.id);
      setAssets((prev) => (prev ? prev.filter((a) => a.id !== asset.id) : prev));
    } catch (err) {
      // `instanceof AssetInUseError` is the canonical check; we also tolerate
      // duck-typed errors so that mocked test classes (which can drift in
      // identity across module boundaries) are still recognised.
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
            <Dropzone onFile={(f) => void handleUpload(f)} disabled={uploading} />
            {uploadError && (
              <p role="alert" style={{ color: 'var(--color-text-muted)', marginBottom: 12 }}>
                {uploadError}
              </p>
            )}

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

            {assets !== null && assets.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: 16,
                }}
              >
                {assets.map((a) => (
                  <AssetCard
                    key={a.id}
                    asset={a}
                    onRename={(name) => handleRename(a, name)}
                    onDelete={() => handleDelete(a)}
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
