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
    <main className="app-shell">
      <header className="app-header">
        <Link to="/" className="app-header__brand">
          disccotools
        </Link>
        <TopTabs />
        <nav className="app-header__actions">
          <SaveButton />
          <DownloadButton />
          <ThemeToggle />
          <div className="auth-slot">
            {userState.status === 'anonymous' && <LoginButton />}
            {userState.status === 'authenticated' && (
              <UserPill user={userState.user} onLogout={handleLogout} />
            )}
          </div>
        </nav>
      </header>

      <div className="editor-layout">
        <aside aria-label="Tools" className="editor-aside-left">
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

        <section aria-label="Canvas" className="editor-canvas-section">
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

        <aside aria-label="Layers" className="editor-aside-right">
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
