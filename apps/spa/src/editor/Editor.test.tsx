import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyRecipe } from '@disccotools/shared';
import { Editor } from './Editor.js';
import { ThemeProvider } from '../theme/ThemeContext.js';
import { useRecipeStore } from './useRecipeStore.js';

vi.mock('../auth/useUser.js', () => ({
  useUser: vi.fn(),
}));
vi.mock('../api/saves.js', () => ({
  getSave: vi.fn(),
}));

import { useUser } from '../auth/useUser.js';
import { getSave } from '../api/saves.js';
const mockedUseUser = vi.mocked(useUser);
const mockedGetSave = vi.mocked(getSave);

const realMatchMedia = window.matchMedia;

beforeEach(() => {
  mockedUseUser.mockReset();
  mockedUseUser.mockReturnValue({ status: 'anonymous' });
  mockedGetSave.mockReset();
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
  vi.clearAllMocks();
  window.matchMedia = realMatchMedia;
});

function renderEditor() {
  return render(
    <MemoryRouter initialEntries={['/editor']}>
      <ThemeProvider>
        <Editor />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('<Editor />', () => {
  it('renders the three editor tabs, a canvas, and the action row', () => {
    renderEditor();
    expect(screen.getByRole('tablist', { name: /editor sections/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /search icons/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /customise shape/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /customise icons/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download png/i })).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: /icon canvas/i }).length).toBeGreaterThan(0);
  });

  it('defaults to the Customise Icons tab', () => {
    renderEditor();
    expect(screen.getByRole('tab', { name: /customise icons/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('switches to the Customise Shape tab when its tab is clicked', async () => {
    renderEditor();
    await userEvent.click(screen.getByRole('tab', { name: /customise shape/i }));
    expect(screen.getByRole('tab', { name: /customise shape/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByText(/select your shape/i)).toBeInTheDocument();
  });

  it('renders a brand link back to /', () => {
    renderEditor();
    const link = screen.getByRole('link', { name: /^disccotools$/i });
    expect(link).toHaveAttribute('href', '/');
  });

  it('loads an existing save when /editor/:id is opened', async () => {
    const recipe = { ...createEmptyRecipe(), shape: 'square' as const };
    mockedGetSave.mockResolvedValue({
      id: 'sv1',
      name: 'a',
      recipe,
      isTemplate: false,
      renderedAt: null,
      createdAt: 0,
      updatedAt: 0,
      thumbnailUrl: null,
      downloadUrl: null,
    });
    render(
      <MemoryRouter initialEntries={['/editor/sv1']}>
        <ThemeProvider>
          <Routes>
            <Route path="/editor/:id" element={<Editor />} />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(mockedGetSave).toHaveBeenCalledWith('sv1'));
  });

  it('renders the top tab strip with Icons and Images links', async () => {
    renderEditor();
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /^icons$/i })).toHaveAttribute('href', '/icons'),
    );
    expect(screen.getByRole('link', { name: /^images$/i })).toHaveAttribute('href', '/images');
    expect(screen.getByRole('link', { name: /^editor$/i })).toHaveAttribute('href', '/editor');
  });

  it('opens the tutorial modal when the Tutorial button is clicked', async () => {
    renderEditor();
    await userEvent.click(screen.getByRole('button', { name: /^tutorial$/i }));
    expect(screen.getByRole('dialog', { name: /tutorial/i })).toBeInTheDocument();
  });

  it('shows the community footer in the editor card', () => {
    renderEditor();
    expect(screen.getByText(/Made for the No Text To Speach community/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /dimitri/i })).toHaveAttribute('href', 'https://dimitri.one');
  });
});
