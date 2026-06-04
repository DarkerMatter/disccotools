import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { createEmptyRecipe } from '@disccotools/shared';
import { useUser } from '../auth/useUser.js';
import { LoginButton } from '../auth/LoginButton.js';
import { UserPill } from '../auth/UserPill.js';
import { ThemeToggle } from '../theme/ThemeToggle.js';
import { logout } from '../api/client.js';
import { getSave } from '../api/saves.js';
import { TopTabs } from '../TopTabs.js';
import { Canvas } from './Canvas.js';
import { Toolbox } from './Toolbox.js';
import { LayerPanel } from './LayerPanel.js';
import { PreviewChip } from './PreviewChip.js';
import { PropertiesPanel } from './PropertiesPanel.js';
import { DownloadButton } from './DownloadButton.js';
import { SaveButton } from './SaveButton.js';
import { TutorialModal } from './TutorialModal.js';
import { useRecipeStore } from './useRecipeStore.js';

export function Editor() {
  const userState = useUser();
  const params = useParams<{ id?: string }>();
  const id = params.id;
  const loadFromSave = useRecipeStore((s) => s.loadFromSave);
  const currentSave = useRecipeStore((s) => s.currentSave);
  const resetTo = useRecipeStore((s) => s.resetTo);
  const setCurrentSave = useRecipeStore((s) => s.setCurrentSave);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);

  function handleClear() {
    resetTo(createEmptyRecipe());
    setCurrentSave(null);
    setConfirmingClear(false);
  }

  useEffect(() => {
    if (!id) return;
    if (currentSave?.id === id) return; // already loaded
    setLoading(true);
    setLoadError(null);
    getSave(id)
      .then((save) => {
        loadFromSave({ id: save.id, name: save.name, recipe: save.recipe });
      })
      .catch(() => setLoadError('Could not load that save.'))
      .finally(() => setLoading(false));
  }, [id, currentSave?.id, loadFromSave]);

  async function handleLogout() {
    await logout();
    window.location.reload();
  }

  return (
    <main
      style={{
        minHeight: '100%',
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
          <SaveButton />
          <DownloadButton />
          <ThemeToggle />
          <div style={{ minWidth: 200, display: 'flex', justifyContent: 'flex-end' }}>
            {userState.status === 'anonymous' && <LoginButton />}
            {userState.status === 'authenticated' && (
              <UserPill user={userState.user} onLogout={handleLogout} />
            )}
          </div>
        </nav>
      </header>

      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '260px 1fr 280px',
          minHeight: 0,
        }}
      >
        <aside
          aria-label="Tools"
          style={{
            borderRight: '1px solid var(--color-border)',
            padding: 16,
            background: 'var(--color-surface)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <button
            type="button"
            onClick={() => setTutorialOpen(true)}
            style={{
              alignSelf: 'flex-start',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text)',
              padding: '8px 12px',
              fontSize: 13,
              cursor: 'pointer',
              marginBottom: 16,
            }}
          >
            Tutorial
          </button>
          <Toolbox />
          <p
            style={{
              marginTop: 'auto',
              paddingTop: 16,
              borderTop: '1px solid var(--color-border)',
              fontSize: 11,
              color: 'var(--color-text-muted)',
              lineHeight: 1.55,
              textAlign: 'center',
            }}
          >
            Made for the No Text To Speach Community by{' '}
            <a
              href="https://dimitri.one"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--color-text)', fontWeight: 600 }}
            >
              Dimitri
            </a>
          </p>
        </aside>

        <section
          aria-label="Canvas"
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
            background: 'var(--color-bg)',
          }}
        >
          {loading && (
            <p
              style={{
                position: 'absolute',
                top: 16,
                left: 16,
                color: 'var(--color-text-muted)',
                fontSize: 13,
              }}
            >
              Loading save…
            </p>
          )}
          {loadError && (
            <p
              role="alert"
              style={{
                position: 'absolute',
                top: 16,
                left: 16,
                color: 'var(--color-text-muted)',
                fontSize: 13,
              }}
            >
              {loadError}
            </p>
          )}
          <Canvas />
        </section>

        <aside
          aria-label="Layers"
          style={{
            borderLeft: '1px solid var(--color-border)',
            padding: 16,
            background: 'var(--color-surface)',
            overflowY: 'auto',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <PropertiesPanel />
            <LayerPanel />
            <PreviewChip />
          </div>
          <div
            style={{
              marginTop: 'auto',
              paddingTop: 16,
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              gap: 6,
            }}
          >
            {!confirmingClear && (
              <button
                type="button"
                onClick={() => setConfirmingClear(true)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  color: '#ef4444',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Clear canvas
              </button>
            )}
            {confirmingClear && (
              <>
                <button
                  type="button"
                  onClick={handleClear}
                  style={{
                    flex: 1,
                    background: '#ef4444',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid #ef4444',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Confirm clear
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingClear(false)}
                  style={{
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </aside>
      </div>

      <TutorialModal open={tutorialOpen} onClose={() => setTutorialOpen(false)} />
    </main>
  );
}
