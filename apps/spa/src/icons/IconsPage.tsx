import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { PERM_LEVEL, type SaveSummary } from '@disccotools/shared';
import { logout } from '../api/client.js';
import {
  cloneSave,
  deleteSave,
  listSaves,
  revokeShare,
  shareSave,
  updateSave,
} from '../api/saves.js';
import { LoginButton } from '../auth/LoginButton.js';
import { NoticesBanner } from '../auth/NoticesBanner.js';
import { UserPill } from '../auth/UserPill.js';
import { useUser } from '../auth/useUser.js';
import { ThemeToggle } from '../theme/ThemeToggle.js';
import { SaveCard } from '../saves/SaveCard.js';
import { SiteFooter } from '../SiteFooter.js';
import { TopTabs } from '../TopTabs.js';

export function IconsPage() {
  const userState = useUser();
  const [saves, setSaves] = useState<SaveSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const authenticated = userState.status === 'authenticated';

  const filteredSaves = useMemo(() => {
    if (saves === null) return null;
    const q = query.trim().toLowerCase();
    if (!q) return saves;
    return saves.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.tags ?? []).some((t) => t.toLowerCase().includes(q)),
    );
  }, [saves, query]);

  const fetchSaves = useCallback(async () => {
    setError(null);
    try {
      const list = await listSaves();
      setSaves(list);
    } catch (err) {
      console.error('listSaves failed', err);
      setError('Could not load your saves.');
      setSaves([]);
    }
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    void fetchSaves();
  }, [authenticated, fetchSaves]);

  function detailToSummary(detail: {
    id: string;
    name: string;
    recipe: SaveSummary['recipe'];
    createdAt: number;
    updatedAt: number;
    tags: SaveSummary['tags'];
    shareToken: string | null;
  }): SaveSummary {
    return {
      id: detail.id,
      name: detail.name,
      createdAt: detail.createdAt,
      updatedAt: detail.updatedAt,
      recipe: detail.recipe,
      tags: detail.tags,
      shareToken: detail.shareToken,
    };
  }

  async function handleClone(save: SaveSummary) {
    const cloned = await cloneSave(save.id);
    setSaves((prev) => (prev ? [detailToSummary(cloned), ...prev] : prev));
  }

  async function handleShare(save: SaveSummary) {
    try {
      const updated = await shareSave(save.id);
      setSaves((prev) =>
        prev
          ? prev.map((s) => (s.id === save.id ? { ...s, shareToken: updated.shareToken } : s))
          : prev,
      );
    } catch (err) {
      console.error('shareSave failed', err);
    }
  }

  async function handleRevokeShare(save: SaveSummary) {
    try {
      const updated = await revokeShare(save.id);
      setSaves((prev) =>
        prev
          ? prev.map((s) => (s.id === save.id ? { ...s, shareToken: updated.shareToken } : s))
          : prev,
      );
    } catch (err) {
      console.error('revokeShare failed', err);
    }
  }

  async function handleDelete(save: SaveSummary) {
    setSaves((prev) => (prev ? prev.filter((s) => s.id !== save.id) : prev));
    try {
      await deleteSave(save.id);
    } catch (err) {
      console.error('deleteSave failed', err);
      void fetchSaves();
    }
  }

  async function handleRename(save: SaveSummary, name: string) {
    const previous = save.name;
    setSaves((prev) =>
      prev ? prev.map((s) => (s.id === save.id ? { ...s, name } : s)) : prev,
    );
    try {
      await updateSave(save.id, { name });
    } catch (err) {
      console.error('updateSave (rename) failed', err);
      setSaves((prev) =>
        prev ? prev.map((s) => (s.id === save.id ? { ...s, name: previous } : s)) : prev,
      );
    }
  }

  async function handleTagsChange(save: SaveSummary, tags: string[]) {
    const previous = save.tags;
    setSaves((prev) =>
      prev ? prev.map((s) => (s.id === save.id ? { ...s, tags } : s)) : prev,
    );
    try {
      const updated = await updateSave(save.id, { tags });
      setSaves((prev) =>
        prev
          ? prev.map((s) =>
              s.id === save.id ? { ...s, tags: updated.tags } : s,
            )
          : prev,
      );
    } catch (err) {
      console.error('updateSave (tags) failed', err);
      setSaves((prev) =>
        prev
          ? prev.map((s) => (s.id === save.id ? { ...s, tags: previous } : s))
          : prev,
      );
    }
  }

  async function handleLogout() {
    await logout();
    window.location.reload();
  }

  if (userState.status === 'banned') {
    return <Navigate to="/banned" replace />;
  }

  return (
    <main className="app-shell" style={{ minHeight: '100vh' }}>
      <header className="app-header">
        <Link to="/" className="app-header__brand">
          <img src="/static/disccotools.png" alt="" className="app-header__logo" />
          disccotools
        </Link>
        <TopTabs />
        <nav className="app-header__actions">
          {userState.status === 'authenticated' &&
            userState.permLevel >= PERM_LEVEL.ADMIN && (
              <Link to="/admin" className="admin-nav-link">
                Admin
              </Link>
            )}
          <ThemeToggle />
          <div className="auth-slot">
            {userState.status === 'anonymous' && <LoginButton />}
            {userState.status === 'authenticated' && (
              <UserPill user={userState.user} onLogout={handleLogout} />
            )}
          </div>
        </nav>
      </header>
      {userState.status === 'authenticated' &&
        userState.pendingNotices.length > 0 && (
          <NoticesBanner notices={userState.pendingNotices} />
        )}

      <section className="page-content">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 24,
            flexWrap: 'wrap',
          }}
        >
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or tag"
            aria-label="Search saves"
            style={{
              flex: '1 1 200px',
              minWidth: 160,
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
            Sign in to view your saved icons.
          </div>
        )}

        {authenticated && saves === null && !error && (
          <p style={{ color: 'var(--color-text-muted)' }}>Loading your saves…</p>
        )}

        {error && (
          <p role="alert" style={{ color: 'var(--color-text-muted)' }}>
            {error}
          </p>
        )}

        {authenticated && saves !== null && saves.length === 0 && !error && (
          <div
            style={{
              padding: 32,
              border: '1px dashed var(--color-border)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
              color: 'var(--color-text-muted)',
            }}
          >
            <p style={{ marginBottom: 12 }}>No saves yet.</p>
            <Link
              to="/editor"
              style={{
                display: 'inline-block',
                background: 'var(--color-accent)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              Open the editor
            </Link>
          </div>
        )}

        {authenticated &&
          saves !== null &&
          saves.length > 0 &&
          filteredSaves !== null &&
          filteredSaves.length === 0 && (
            <div
              style={{
                padding: 24,
                border: '1px dashed var(--color-border)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
                color: 'var(--color-text-muted)',
              }}
            >
              No saves match your search.
            </div>
          )}

        {authenticated && filteredSaves !== null && filteredSaves.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 16,
            }}
          >
            {filteredSaves.map((s) => (
              <SaveCard
                key={s.id}
                save={s}
                onClone={() => void handleClone(s)}
                onDelete={() => void handleDelete(s)}
                onRename={(name) => handleRename(s, name)}
                onTagsChange={(tags) => handleTagsChange(s, tags)}
                onShare={() => handleShare(s)}
                onRevokeShare={() => handleRevokeShare(s)}
              />
            ))}
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
