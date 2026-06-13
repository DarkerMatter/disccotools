import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { createEmptyRecipe, PERM_LEVEL } from '@disccotools/shared';
import { useUser } from '../auth/useUser.js';
import { LoginButton } from '../auth/LoginButton.js';
import { NoticesBanner } from '../auth/NoticesBanner.js';
import { UserPill } from '../auth/UserPill.js';
import { Spinner } from '../Spinner.js';
import { ThemeToggle } from '../theme/ThemeToggle.js';
import { ApiError, logout } from '../api/client.js';
import { uploadAssetWithProgress, validateAssetFile } from '../api/assets.js';
import { getSave } from '../api/saves.js';
import { TopTabs } from '../TopTabs.js';
import { ShareMenu } from '../saves/ShareMenu.js';
import { Canvas } from './Canvas.js';
import { CustomiseIconsPanel } from './CustomiseIconsPanel.js';
import { CustomiseShapePanel } from './CustomiseShapePanel.js';
import { DiscordPreview } from './DiscordPreview.js';
import { DownloadButton } from './DownloadButton.js';
import { EditorTabs, type EditorTabKey } from './EditorTabs.js';
import { ResolutionPicker } from './controls/ResolutionPicker.js';
import { SiteFooter } from '../SiteFooter.js';
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
  const addImageLayer = useRecipeStore((s) => s.addImageLayer);
  const setSelection = useRecipeStore((s) => s.setSelection);
  const undo = useRecipeStore((s) => s.undo);
  const redo = useRecipeStore((s) => s.redo);
  const canUndo = useRecipeStore((s) => s.history.length > 0);
  const canRedo = useRecipeStore((s) => s.future.length > 0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorTabKey>('icons');
  const [dragOverCanvas, setDragOverCanvas] = useState(false);
  const [dropUploading, setDropUploading] = useState<string | null>(null);
  const [dropError, setDropError] = useState<string | null>(null);

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

  const handleCanvasDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOverCanvas(false);
      if (userState.status !== 'authenticated') {
        setDropError('Sign in to drop images onto the canvas.');
        return;
      }
      const file = e.dataTransfer.files[0];
      if (!file) return;
      const guard = validateAssetFile(file);
      if (guard) {
        setDropError(guard);
        return;
      }
      setDropError(null);
      setDropUploading(file.name);
      try {
        const niceName = file.name.replace(/\.[^.]+$/, '') || file.name;
        const asset = await uploadAssetWithProgress(file, niceName, () => {});
        addImageLayer({ assetId: asset.id });
        setActiveTab('icons');
      } catch (err) {
        setDropError(err instanceof ApiError ? err.message : 'Upload failed.');
      } finally {
        setDropUploading(null);
      }
    },
    [userState.status, addImageLayer],
  );

  // global editor shortcuts: undo/redo, arrow-nudge selected layer, delete
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        const editable =
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          target.isContentEditable;
        if (editable) return;
      }
      const meta = e.metaKey || e.ctrlKey;
      if (meta && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (meta && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
        return;
      }
      const state = useRecipeStore.getState();
      const id = state.selectedId;
      if (!id) return;
      const layer = state.recipe.layers.find((l) => l.id === id);
      if (!layer) return;
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        state.removeLayer(id);
        return;
      }
      const step = e.shiftKey ? 0.05 : 0.005;
      let dx = 0;
      let dy = 0;
      if (e.key === 'ArrowLeft') dx = -step;
      else if (e.key === 'ArrowRight') dx = step;
      else if (e.key === 'ArrowUp') dy = -step;
      else if (e.key === 'ArrowDown') dy = step;
      else return;
      e.preventDefault();
      const nextX = Math.max(0, Math.min(1, layer.x + dx));
      const nextY = Math.max(0, Math.min(1, layer.y + dy));
      state.updateLayer(id, { x: nextX, y: nextY });
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  useEffect(() => {
    if (!id) return;
    if (currentSave?.id === id) return;
    setLoading(true);
    setLoadError(null);
    getSave(id)
      .then((save) => {
        loadFromSave({
          id: save.id,
          name: save.name,
          recipe: save.recipe,
          shareToken: save.shareToken,
        });
      })
      .catch(() => setLoadError('Could not load that save.'))
      .finally(() => setLoading(false));
  }, [id, currentSave?.id, loadFromSave]);

  async function handleLogout() {
    await logout();
    window.location.reload();
  }

  if (userState.status === 'banned') {
    return <Navigate to="/banned" replace />;
  }

  return (
    <main className="app-shell">
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
              style={{ margin: '0 auto' }}
            >
              Tutorial
            </button>
          </div>
        </div>

        <div className="editor-canvas-column">
          <div
            className={`editor-canvas-frame${dragOverCanvas ? ' editor-canvas-frame--dragging' : ''}`}
            onDragOver={(e) => {
              if (userState.status !== 'authenticated') return;
              if (dropUploading) return;
              if (!Array.from(e.dataTransfer.types).includes('Files')) return;
              e.preventDefault();
              setDragOverCanvas(true);
            }}
            onDragLeave={(e) => {
              // ignore dragLeave when the pointer just moved over a child
              if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
              setDragOverCanvas(false);
            }}
            onDrop={handleCanvasDrop}
          >
            {loading && (
              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                }}
              >
                <Spinner size={16} label="Loading save…" />
              </div>
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
            <div className="canvas-history-controls" aria-label="History">
              <button
                type="button"
                onClick={() => undo()}
                disabled={!canUndo}
                aria-label="Undo"
                title="Undo (⌘Z)"
              >
                ↶
              </button>
              <button
                type="button"
                onClick={() => redo()}
                disabled={!canRedo}
                aria-label="Redo"
                title="Redo (⌘⇧Z)"
              >
                ↷
              </button>
            </div>
            <Canvas />
            {dragOverCanvas && (
              <div className="canvas-drop-overlay" aria-hidden="true">
                <span>Drop image to add as a layer</span>
              </div>
            )}
            {dropUploading && (
              <div
                className="canvas-drop-status"
                role="status"
                aria-live="polite"
              >
                <Spinner size={14} />
                <span>Uploading {dropUploading}…</span>
              </div>
            )}
            {dropError && (
              <div className="canvas-drop-error" role="alert">
                <span>{dropError}</span>
                <button
                  type="button"
                  onClick={() => setDropError(null)}
                  aria-label="Dismiss"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          <DiscordPreview />
          <PreviewChip />

          <div className="editor-actions">
            <div className="editor-actions__primary">
              <ResolutionPicker />
              <div className="editor-actions__download">
                <DownloadButton />
              </div>
              <SaveButton />
              {currentSave && (
                <ShareMenu
                  saveId={currentSave.id}
                  initialToken={currentSave.shareToken}
                  onChange={(token) =>
                    setCurrentSave({
                      id: currentSave.id,
                      name: currentSave.name,
                      shareToken: token,
                    })
                  }
                  triggerClassName="cta-button cta-button--secondary"
                />
              )}
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
              <div className="editor-actions__primary">
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
            <SiteFooter />
          </div>
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
