import { useState } from 'react';
import { MAX_LAYERS } from '@disccotools/shared';
import type { Asset } from '@disccotools/shared';
import { useRecipeStore } from './useRecipeStore.js';
import { useUser } from '../auth/useUser.js';
import { LayerCard } from './LayerCard.js';
import { AssetPicker } from './AssetPicker.js';

type DropTarget = { id: string; position: 'before' | 'after' };

export function CustomiseIconsPanel({
  onAddIconClick,
}: {
  /** invoked when the user clicks the "Add a new icon" zone; parent decides whether to flip tabs or open a modal */
  onAddIconClick: () => void;
}) {
  const layers = useRecipeStore((s) => s.recipe.layers);
  const addTextLayer = useRecipeStore((s) => s.addTextLayer);
  const addImageLayer = useRecipeStore((s) => s.addImageLayer);
  const updateRecipe = useRecipeStore((s) => s.updateRecipe);
  const userState = useUser();
  const isAuthed = userState.status === 'authenticated';
  const atCap = layers.length >= MAX_LAYERS;
  const imageDisabled = atCap || !isAuthed;
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  function reorder(fromId: string, toId: string, position: 'before' | 'after') {
    if (fromId === toId) return;
    // the panel reverses storage to put the top layer first; flip the position back when we touch storage
    const storagePosition = position === 'before' ? 'after' : 'before';
    updateRecipe((r) => {
      const fromIdx = r.layers.findIndex((l) => l.id === fromId);
      const toIdx = r.layers.findIndex((l) => l.id === toId);
      if (fromIdx === -1 || toIdx === -1) return r;
      const next = [...r.layers];
      const [moved] = next.splice(fromIdx, 1);
      const newToIdx = next.findIndex((l) => l.id === toId);
      const insertAt = storagePosition === 'before' ? newToIdx : newToIdx + 1;
      next.splice(insertAt, 0, moved!);
      return { ...r, layers: next };
    });
  }

  function handleDrop(toId: string) {
    if (!draggingId || !dropTarget) {
      setDraggingId(null);
      setDropTarget(null);
      return;
    }
    reorder(draggingId, toId, dropTarget.position);
    setDraggingId(null);
    setDropTarget(null);
  }

  function handlePickAsset(asset: Asset) {
    addImageLayer({ assetId: asset.id });
    setAssetPickerOpen(false);
  }

  return (
    <section aria-label="Customise icons" id="editor-tabpanel-icons" role="tabpanel">
      <h3 className="section-heading">Icons selected</h3>

      <button
        type="button"
        className="add-zone"
        onClick={onAddIconClick}
        disabled={atCap}
        data-tour-id="add-icon"
        aria-label="Add a new icon to your collection"
        style={{ marginBottom: 12 }}
      >
        <span className="add-zone__icon" aria-hidden="true">
          +
        </span>
        <span>
          <div className="add-zone__title">Add a new icon to your collection</div>
          <div className="add-zone__sub">
            You can add more than one icon, try it now!
          </div>
        </span>
      </button>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => addTextLayer()}
          disabled={atCap}
          className="cta-button cta-button--secondary"
          style={{ flex: 1, padding: '8px 12px', fontSize: 12 }}
        >
          + Add text
        </button>
        <button
          type="button"
          onClick={() => setAssetPickerOpen(true)}
          disabled={imageDisabled}
          title={!isAuthed ? 'Sign in with Discord to use images' : undefined}
          className="cta-button cta-button--secondary"
          style={{ flex: 1, padding: '8px 12px', fontSize: 12 }}
        >
          {isAuthed ? '+ Add image' : '🔒 Sign in to add image'}
        </button>
      </div>

      {atCap && (
        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 12 }}>
          Maximum of {MAX_LAYERS} layers reached.
        </p>
      )}

      {layers.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          No layers yet. Add an icon, text, or image to get started.
        </p>
      ) : (
        <div role="list" aria-label="Layers" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...layers].reverse().map((layer) => (
            <div key={layer.id} role="listitem">
              <LayerCard
                layer={layer}
                drag={{
                  isDraggingThis: draggingId === layer.id,
                  dropPosition:
                    dropTarget?.id === layer.id && draggingId && draggingId !== layer.id
                      ? dropTarget.position
                      : null,
                  onDragStart: (id) => setDraggingId(id),
                  onDragEnd: () => {
                    setDraggingId(null);
                    setDropTarget(null);
                  },
                  onDragOver: (id, position) => {
                    if (!draggingId || draggingId === id) return;
                    setDropTarget((prev) =>
                      prev?.id === id && prev.position === position ? prev : { id, position },
                    );
                  },
                  onDrop: handleDrop,
                }}
              />
            </div>
          ))}
        </div>
      )}

      <AssetPicker
        open={assetPickerOpen}
        onClose={() => setAssetPickerOpen(false)}
        onSelect={handlePickAsset}
      />
    </section>
  );
}
