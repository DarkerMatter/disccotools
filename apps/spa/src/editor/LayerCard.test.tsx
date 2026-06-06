import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IconLayer, TextLayer } from '@disccotools/shared';
import { createEmptyRecipe } from '@disccotools/shared';
import { ThemeProvider } from '../theme/ThemeContext.js';
import { LayerCard } from './LayerCard.js';
import { useRecipeStore } from './useRecipeStore.js';

function iconLayer(id: string, overrides: Partial<IconLayer> = {}): IconLayer {
  return {
    id,
    kind: 'icon',
    iconset: 'custom',
    name: 'discord/home',
    color: { kind: 'solid', color: '#5865F2' },
    x: 0.5,
    y: 0.5,
    rotation: 0,
    scale: 1,
    opacity: 1,
    ...overrides,
  };
}

function textLayer(id: string, overrides: Partial<TextLayer> = {}): TextLayer {
  return {
    id,
    kind: 'text',
    text: 'Hello',
    font: 'Inter',
    color: '#000000',
    size: 0.5,
    x: 0.5,
    y: 0.5,
    rotation: 0,
    scale: 1,
    opacity: 1,
    ...overrides,
  };
}

function renderCard(node: React.ReactElement) {
  return render(
    <MemoryRouter>
      <ThemeProvider>{node}</ThemeProvider>
    </MemoryRouter>,
  );
}

const realMatchMedia = window.matchMedia;

beforeEach(() => {
  useRecipeStore.setState({
    recipe: createEmptyRecipe(),
    selectedId: null,
    history: [],
    future: [],
    currentSave: null,
  });
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

describe('<LayerCard />', () => {
  it('renders the icon layer header with a human title and the iconset name', () => {
    renderCard(<LayerCard layer={iconLayer('a')} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText(/Custom icon/i)).toBeInTheDocument();
  });

  it('marks itself expanded when its id is the selected one in the store', () => {
    useRecipeStore.setState((s) => ({
      ...s,
      recipe: { ...s.recipe, layers: [iconLayer('a')] },
      selectedId: 'a',
    }));
    renderCard(<LayerCard layer={iconLayer('a')} />);
    expect(
      screen.getByRole('button', { name: /collapse home layer/i }),
    ).toHaveAttribute('aria-expanded', 'true');
  });

  it('toggles selection in the store when the header is clicked', async () => {
    useRecipeStore.setState((s) => ({
      ...s,
      recipe: { ...s.recipe, layers: [iconLayer('a')] },
      selectedId: null,
    }));
    renderCard(<LayerCard layer={iconLayer('a')} />);
    await userEvent.click(
      screen.getByRole('button', { name: /expand home layer/i }),
    );
    expect(useRecipeStore.getState().selectedId).toBe('a');
  });

  it('removes the layer from the store when the delete button is clicked', async () => {
    useRecipeStore.setState((s) => ({
      ...s,
      recipe: { ...s.recipe, layers: [iconLayer('a'), iconLayer('b')] },
      selectedId: 'a',
    }));
    renderCard(<LayerCard layer={iconLayer('a')} />);
    await userEvent.click(
      screen.getByRole('button', { name: /delete home layer/i }),
    );
    expect(useRecipeStore.getState().recipe.layers).toHaveLength(1);
    expect(useRecipeStore.getState().recipe.layers[0]!.id).toBe('b');
  });

  it('renders the text input and font input when a text layer is expanded', () => {
    const t = textLayer('t1');
    useRecipeStore.setState((s) => ({
      ...s,
      recipe: { ...s.recipe, layers: [t] },
      selectedId: 't1',
    }));
    renderCard(<LayerCard layer={t} />);
    expect(screen.getByLabelText(/^text content$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^font family$/i)).toBeInTheDocument();
  });
});
