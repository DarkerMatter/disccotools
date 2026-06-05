import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { SaveFilter, SaveSummary } from '@disccotools/shared';
import { logout } from '../api/client.js';
import {
  cloneSave,
  deleteSave,
  listSaves,
  updateSave,
} from '../api/saves.js';
import { LoginButton } from '../auth/LoginButton.js';
import { UserPill } from '../auth/UserPill.js';
import { useUser } from '../auth/useUser.js';
import { ThemeToggle } from '../theme/ThemeToggle.js';
import { SaveCard } from '../saves/SaveCard.js';
import { TopTabs } from '../TopTabs.js';

const FILTERS: { value: SaveFilter; label: string }[] = [
  { value: 'designs', label: 'Designs' },
  { value: 'templates', label: 'Templates' },
  { value: 'all', label: 'All' },
];

export function IconsPage() {
  const userState = useUser();
  const [filter, setFilter] = useState<SaveFilter>('designs');
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

  const fetchSaves = useCallback(async (f: SaveFilter) => {
    setError(null);
    try {
      const list = await listSaves(f);
      setSaves(list);
    } catch (err) {
      console.error('listSaves failed', err);
      setError('Could not load your saves.');
      setSaves([]);
    }
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    void fetchSaves(filter);
  }, [filter, authenticated, fetchSaves]);

  async function handleClone(save: SaveSummary) {
    const cloned = await cloneSave(save.id);
    setSaves((prev) =>
      prev
        ? [{
            id: cloned.id,
            name: cloned.name,
            isTemplate: cloned.isTemplate,
            createdAt: cloned.createdAt,
            updatedAt: cloned.updatedAt,
            thumbnailUrl: cloned.thumbnailUrl,
            tags: cloned.tags,
          }, ...prev]
        : prev,
    );
  }

  async function handleDelete(save: SaveSummary) {
    setSaves((prev) => (prev ? prev.filter((s) => s.id !== save.id) : prev));
    try {
      await deleteSave(save.id);
    } catch (err) {
      console.error('deleteSave failed', err);
      void fetchSaves(filter);
    }
  }

  async function handleToggleTemplate(save: SaveSummary) {
    const next = !save.isTemplate;
    setSaves((prev) =>
      prev
        ? prev.map((s) => (s.id === save.id ? { ...s, isTemplate: next } : s))
        : prev,
    );
    try {
      await updateSave(save.id, { isTemplate: next });
    } catch (err) {
      console.error('updateSave failed', err);
      void fetchSaves(filter);
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
          <div
            role="radiogroup"
            aria-label="Save filter"
            style={{
              display: 'inline-flex',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 2,
              background: 'var(--color-surface)',
            }}
          >
            {FILTERS.map((f) => {
              const active = f.value === filter;
              return (
                <button
                  key={f.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setFilter(f.value)}
                  style={{
                    background: active ? 'var(--color-surface-elev)' : 'transparent',
                    color: 'var(--color-text)',
                    border: 'none',
                    padding: '6px 12px',
                    fontSize: 13,
                    fontWeight: 500,
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
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
                onToggleTemplate={() => void handleToggleTemplate(s)}
                onRename={(name) => handleRename(s, name)}
                onTagsChange={(tags) => handleTagsChange(s, tags)}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
