import { useState } from 'react';
import { useRecipeStore } from './useRecipeStore.js';
import { IconPicker } from './IconPicker.js';
import { AssetPicker } from './AssetPicker.js';
import type { IconHit } from './iconify.js';
import type { Asset } from '@disccotools/shared';
import { MAX_LAYERS } from '@disccotools/shared';

function layerLabel(layer: ReturnType<typeof useRecipeStore.getState>['recipe']['layers'][number]) {
  if (layer.kind === 'icon') return `${layer.iconset}:${layer.name}`;
  if (layer.kind === 'text') return `Text — "${layer.text || '(empty)'}"`;
  return `Image — ${layer.assetId}`;
}

export function LayerPanel() {
  const layers = useRecipeStore((s) => s.recipe.layers);
  const selectedId = useRecipeStore((s) => s.selectedId);
  const setSelection = useRecipeStore((s) => s.setSelection);
  const addIconLayer = useRecipeStore((s) => s.addIconLayer);
  const addTextLayer = useRecipeStore((s) => s.addTextLayer);
  const addImageLayer = useRecipeStore((s) => s.addImageLayer);
  const removeLayer = useRecipeStore((s) => s.removeLayer);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const atCap = layers.length >= MAX_LAYERS;

  function handlePick(hit: IconHit) {
    addIconLayer({ iconset: hit.prefix, name: hit.name });
    setPickerOpen(false);
  }

  function handlePickAsset(asset: Asset) {
    addImageLayer({ assetId: asset.id });
    setAssetPickerOpen(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          disabled={atCap}
          style={{
            background: 'var(--color-accent)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            fontWeight: 600,
            border: 'none',
            opacity: atCap ? 0.5 : 1,
            cursor: atCap ? 'not-allowed' : 'pointer',
          }}
        >
          + Add icon
        </button>
        <button
          type="button"
          onClick={() => addTextLayer()}
          disabled={atCap}
          style={{
            background: 'var(--color-surface-elev)',
            color: 'var(--color-text)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            fontWeight: 600,
            border: '1px solid var(--color-border)',
            opacity: atCap ? 0.5 : 1,
            cursor: atCap ? 'not-allowed' : 'pointer',
          }}
        >
          + Add text
        </button>
        <button
          type="button"
          onClick={() => setAssetPickerOpen(true)}
          disabled={atCap}
          style={{
            background: 'var(--color-surface-elev)',
            color: 'var(--color-text)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            fontWeight: 600,
            border: '1px solid var(--color-border)',
            opacity: atCap ? 0.5 : 1,
            cursor: atCap ? 'not-allowed' : 'pointer',
          }}
        >
          + Add image
        </button>
      </div>
      {atCap && (
        <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
          Maximum of {MAX_LAYERS} layers reached.
        </p>
      )}

      <div role="list" aria-label="Layers" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {layers.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            No layers yet. Click “Add icon” to insert one.
          </p>
        )}
        {layers.map((layer) => {
          const active = layer.id === selectedId;
          return (
            <div
              key={layer.id}
              role="listitem"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 8px',
                background: active ? 'var(--color-surface-elev)' : 'transparent',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
              }}
            >
              <button
                type="button"
                onClick={() => setSelection(layer.id)}
                aria-label={`Select ${layerLabel(layer)}`}
                aria-pressed={active}
                style={{
                  flex: 1,
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  fontSize: 12,
                  color: 'var(--color-text)',
                  padding: 0,
                  cursor: 'pointer',
                }}
              >
                {layerLabel(layer)}
              </button>
              <button
                type="button"
                onClick={() => removeLayer(layer.id)}
                aria-label={`Delete ${layerLabel(layer)}`}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 12,
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      <IconPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handlePick}
      />
      <AssetPicker
        open={assetPickerOpen}
        onClose={() => setAssetPickerOpen(false)}
        onSelect={handlePickAsset}
      />
    </div>
  );
}
