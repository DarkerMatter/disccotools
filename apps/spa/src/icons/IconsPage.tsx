import { useCallback, useEffect, useState } from 'react';
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

  const authenticated = userState.status === 'authenticated';

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

  async function handleLogout() {
    await logout();
    window.location.reload();
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
          padding: '0 clamp(16px, 4vw, 32px)',
          minHeight: 56,
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          gap: 16,
        }}
      >
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            fontSize: 18,
            color: 'var(--color-text)',
          }}
        >
          disccotools
        </Link>
        <TopTabs />
        <nav
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            marginLeft: 'auto',
          }}
        >
          <ThemeToggle />
          <div style={{ minWidth: 200, display: 'flex', justifyContent: 'flex-end' }}>
            {userState.status === 'anonymous' && <LoginButton />}
            {userState.status === 'authenticated' && (
              <UserPill user={userState.user} onLogout={handleLogout} />
            )}
          </div>
        </nav>
      </header>

      <section
        style={{
          padding: 'clamp(24px, 4vw, 48px) clamp(16px, 4vw, 40px)',
          width: '100%',
          maxWidth: 1280,
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'flex-end',
            gap: 16,
            marginBottom: 24,
            flexWrap: 'wrap',
          }}
        >
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

        {authenticated && saves !== null && saves.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 16,
            }}
          >
            {saves.map((s) => (
              <SaveCard
                key={s.id}
                save={s}
                onClone={() => void handleClone(s)}
                onDelete={() => void handleDelete(s)}
                onToggleTemplate={() => void handleToggleTemplate(s)}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
