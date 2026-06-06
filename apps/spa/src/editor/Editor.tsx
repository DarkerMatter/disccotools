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
import { CustomiseIconsPanel } from './CustomiseIconsPanel.js';
import { CustomiseShapePanel } from './CustomiseShapePanel.js';
import { DiscordPreview } from './DiscordPreview.js';
import { DownloadButton } from './DownloadButton.js';
import { EditorTabs, type EditorTabKey } from './EditorTabs.js';
import { IconGrid } from './IconGrid.js';
import { PreviewChip } from './PreviewChip.js';
import { SaveButton } from './SaveButton.js';
import { TutorialModal } from './TutorialModal.js';
import { TutorialTour, type TourStep } from './TutorialTour.js';
import type { IconHit } from './iconify.js';
import { useRecipeStore } from './useRecipeStore.js';

const TOUR_STEPS: TourStep[] = [
  {
    tab: 'shape',
    target: 'shape',
    title: 'Pick your shape',
    body: 'Circle, hexagon, shield, star. The shape clips your icon, so it sets the outline.',
  },
  {
    tab: 'shape',
    target: 'background',
    title: 'Style your background',
    body: 'Solid, gradient, or transparent. This is the canvas behind everything.',
  },
  {
    tab: 'shape',
    target: 'resolution',
    title: 'Choose a resolution',
    body: 'Discord likes round numbers. 256 is a safe default.',
  },
  {
    tab: 'search',
    target: 'editor-tab-search',
    title: 'Find an icon',
    body: 'Browse the icon library or search. Click any icon to drop it onto the canvas.',
  },
  {
    tab: 'icons',
    target: 'add-icon',
    title: 'Tweak your layers',
    body: 'Customise Icons is where each layer becomes a collapsible card. Click one to expand its sliders.',
  },
  {
    target: 'download',
    title: 'Download the PNG',
    body: 'Your icon is rendered right in the browser and saved straight to your downloads.',
  },
  {
    target: 'save',
    title: 'Save it for later',
    body: 'Sign in with Discord to keep the design in your library and come back to tweak it.',
  },
];

export function Editor() {
  const userState = useUser();
  const params = useParams<{ id?: string }>();
  const id = params.id;
  const loadFromSave = useRecipeStore((s) => s.loadFromSave);
  const currentSave = useRecipeStore((s) => s.currentSave);
  const resetTo = useRecipeStore((s) => s.resetTo);
  const setCurrentSave = useRecipeStore((s) => s.setCurrentSave);
  const addIconLayer = useRecipeStore((s) => s.addIconLayer);
  const setSelection = useRecipeStore((s) => s.setSelection);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorTabKey>('icons');

  function handleClear() {
    resetTo(createEmptyRecipe());
    setCurrentSave(null);
    setConfirmingClear(false);
  }

  function handleAddIcon(hit: IconHit) {
    addIconLayer({ iconset: hit.prefix, name: hit.name });
    // hop into Customise Icons so the user sees their new layer card expand
    setActiveTab('icons');
  }

  useEffect(() => {
    if (!id) return;
    if (currentSave?.id === id) return;
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
          <ThemeToggle />
          <div className="auth-slot">
            {userState.status === 'anonymous' && <LoginButton />}
            {userState.status === 'authenticated' && (
              <UserPill user={userState.user} onLogout={handleLogout} />
            )}
          </div>
        </nav>
      </header>

      <div className="editor-grid">
        <div className="editor-card">
          <EditorTabs active={activeTab} onChange={setActiveTab} />
          <div className="editor-card__body" role="tabpanel" aria-labelledby={`editor-tab-${activeTab}`}>
            {activeTab === 'search' && (
              <IconGrid onSelect={handleAddIcon} />
            )}
            {activeTab === 'shape' && <CustomiseShapePanel />}
            {activeTab === 'icons' && (
              <CustomiseIconsPanel
                onAddIconClick={() => {
                  setSelection(null);
                  setActiveTab('search');
                }}
              />
            )}
          </div>
          <div className="editor-card__footer">
            <button
              type="button"
              className="editor-card__footer-button"
              onClick={() => setTutorialOpen(true)}
            >
              Tutorial
            </button>
            <span>
              Made for the No Text To Speach community by{' '}
              <a href="https://dimitri.one" target="_blank" rel="noopener noreferrer">
                Dimitri
              </a>
            </span>
          </div>
        </div>

        <div className="editor-canvas-column">
          <div className="editor-canvas-frame">
            {loading && (
              <p
                style={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  color: 'var(--color-text-muted)',
                  fontSize: 12,
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
                  top: 12,
                  left: 12,
                  color: 'var(--color-text-muted)',
                  fontSize: 12,
                }}
              >
                {loadError}
              </p>
            )}
            <Canvas />
          </div>

          <DiscordPreview />
          <PreviewChip />

          <div className="editor-action-row">
            <DownloadButton />
            <SaveButton />
          </div>

          {!confirmingClear && (
            <button
              type="button"
              className="cta-button cta-button--danger"
              onClick={() => setConfirmingClear(true)}
            >
              Clear canvas
            </button>
          )}
          {confirmingClear && (
            <div className="editor-action-row">
              <button
                type="button"
                onClick={handleClear}
                style={{
                  flex: 1,
                  background: '#ef4444',
                  color: 'white',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Confirm clear
              </button>
              <button
                type="button"
                onClick={() => setConfirmingClear(false)}
                className="cta-button cta-button--secondary"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <TutorialModal
        open={tutorialOpen}
        onClose={() => setTutorialOpen(false)}
        onStartTour={() => {
          setTutorialOpen(false);
          setTourOpen(true);
        }}
      />
      <TutorialTour
        open={tourOpen}
        steps={TOUR_STEPS}
        onClose={() => setTourOpen(false)}
        onTabChange={(t) => setActiveTab(t as EditorTabKey)}
      />
    </main>
  );
}
