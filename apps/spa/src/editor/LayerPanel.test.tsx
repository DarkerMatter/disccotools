import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyRecipe } from '@disccotools/shared';
import { ThemeProvider } from '../theme/ThemeContext.js';
import { useRecipeStore } from './useRecipeStore.js';
import { LayerPanel } from './LayerPanel.js';

vi.mock('./iconify.js', async () => {
  const actual = await vi.importActual<typeof import('./iconify.js')>('./iconify.js');
  // Only the lucide prefix returns the rocket fixture; the other DEFAULT_PREFIXES
  // resolve to empty so the All-prefixes browse loop doesn't yield duplicates.
  return {
    ...actual,
    searchIcons: vi.fn().mockResolvedValue([
      { id: 'lucide:rocket', prefix: 'lucide', name: 'rocket' },
    ]),
    browseIcons: vi.fn().mockImplementation(async (prefix: string) => {
      if (prefix === 'lucide') {
        return [{ id: 'lucide:rocket', prefix: 'lucide', name: 'rocket' }];
      }
      return [];
    }),
  };
});

vi.mock('../api/assets.js', () => ({
  listAssets: vi.fn().mockResolvedValue([
    {
      id: 'a1', name: 'cat', mimeType: 'image/png', sizeBytes: 1,
      createdAt: 1, updatedAt: 1, url: '/api/assets/a1/file',
    },
  ]),
  uploadAsset: vi.fn(),
  renameAsset: vi.fn(),
  deleteAsset: vi.fn(),
  AssetInUseError: class AssetInUseError extends Error {
    constructor(public references: { id: string; name: string }[]) {
      super('in use');
      this.name = 'AssetInUseError';
    }
  },
}));

function renderPanel() {
  return render(
    <ThemeProvider>
      <LayerPanel />
    </ThemeProvider>,
  );
}

const realMatchMedia = window.matchMedia;

beforeEach(() => {
  useRecipeStore.setState({
    recipe: createEmptyRecipe(),
    selectedId: null,
    history: [],
    future: [],
  });
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: false,
    media: q,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  window.matchMedia = realMatchMedia;
});

describe('<LayerPanel />', () => {
  it('shows the empty hint when there are no layers', () => {
    renderPanel();
    expect(screen.getByText(/no layers yet/i)).toBeInTheDocument();
  });

  it('opens the picker on Add icon click and inserts a layer on selection', async () => {
    renderPanel();
    await userEvent.click(screen.getByRole('button', { name: /add icon/i }));
    const btn = await screen.findByRole('button', { name: /insert lucide:rocket/i });
    await userEvent.click(btn);

    const layers = useRecipeStore.getState().recipe.layers;
    expect(layers).toHaveLength(1);
    expect(layers[0]?.kind).toBe('icon');
    expect(useRecipeStore.getState().selectedId).toBe(layers[0]!.id);
  });

  it('deletes a layer on ✕ click', async () => {
    renderPanel();
    useRecipeStore.getState().addIconLayer({ iconset: 'lucide', name: 'star' });
    const del = await screen.findByRole('button', { name: /delete lucide:star/i });
    await userEvent.click(del);
    expect(useRecipeStore.getState().recipe.layers).toHaveLength(0);
  });

  it('opens the asset picker on Add image click and inserts an image layer on selection', async () => {
    renderPanel();
    await userEvent.click(screen.getByRole('button', { name: /add image/i }));
    const btn = await screen.findByRole('button', { name: /insert cat/i });
    await userEvent.click(btn);

    const layers = useRecipeStore.getState().recipe.layers;
    expect(layers).toHaveLength(1);
    expect(layers[0]?.kind).toBe('image');
    if (layers[0]?.kind === 'image') expect(layers[0].assetId).toBe('a1');
    expect(useRecipeStore.getState().selectedId).toBe(layers[0]!.id);
  });

  it('moves a layer down (toward bottom of panel and bottom of canvas)', async () => {
    renderPanel();
    // "one" added first => array[0] => bottom of panel.
    // "two" added second => array[1] => top of panel.
    useRecipeStore.getState().addIconLayer({ iconset: 'lucide', name: 'one' });
    useRecipeStore.getState().addIconLayer({ iconset: 'lucide', name: 'two' });
    const idsBefore = useRecipeStore.getState().recipe.layers.map((l) => l.id);
    // Click "down" on "two" (the top-of-panel row); it should swap with "one".
    const downTwo = await screen.findByRole('button', { name: /move lucide:two down/i });
    await userEvent.click(downTwo);
    const idsAfter = useRecipeStore.getState().recipe.layers.map((l) => l.id);
    expect(idsAfter).toEqual([idsBefore[1], idsBefore[0]]);
  });

  it('disables the up button on the top row (highest array index)', async () => {
    renderPanel();
    useRecipeStore.getState().addIconLayer({ iconset: 'lucide', name: 'one' });
    useRecipeStore.getState().addIconLayer({ iconset: 'lucide', name: 'two' });
    // "two" is array[1] = top of panel; its up button should be disabled.
    const upTwo = await screen.findByRole('button', { name: /move lucide:two up/i }) as HTMLButtonElement;
    expect(upTwo.disabled).toBe(true);
  });
});
