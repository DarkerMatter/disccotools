import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../theme/ThemeContext.js';
import { IconsPage } from './IconsPage.js';

vi.mock('../auth/useUser.js', () => ({ useUser: vi.fn() }));
vi.mock('../api/saves.js', () => ({
  listSaves: vi.fn(),
  cloneSave: vi.fn(),
  deleteSave: vi.fn(),
  updateSave: vi.fn(),
}));

import { useUser } from '../auth/useUser.js';
import { listSaves } from '../api/saves.js';

const mockedUseUser = vi.mocked(useUser);
const mockedListSaves = vi.mocked(listSaves);

const realMatchMedia = window.matchMedia;

function authenticated() {
  mockedUseUser.mockReturnValue({
    status: 'authenticated',
    user: {
      id: '1', username: 'mitri', globalName: null, avatarHash: null,
      isHomeMember: false, memberCheckedAt: 0,
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
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
  vi.clearAllMocks();
  window.matchMedia = realMatchMedia;
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/icons']}>
      <ThemeProvider>
        <Routes>
          <Route path="/icons" element={<IconsPage />} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('<IconsPage />', () => {
  it('prompts unauthenticated users to sign in', () => {
    mockedUseUser.mockReturnValue({ status: 'anonymous' });
    renderPage();
    expect(screen.getByText(/sign in to view your saved icons/i)).toBeInTheDocument();
  });

  it('renders the saves list for authenticated users', async () => {
    authenticated();
    mockedListSaves.mockResolvedValue([
      {
        id: 'sv1',
        name: 'first',
        isTemplate: false,
        createdAt: 1,
        updatedAt: 1,
        thumbnailUrl: null,
        tags: [],
      },
    ]);
    renderPage();
    await waitFor(() => expect(screen.getByText('first')).toBeInTheDocument());
    expect(mockedListSaves).toHaveBeenCalledWith('designs');
  });

  it('filters saves by name when the search input is used', async () => {
    authenticated();
    mockedListSaves.mockResolvedValue([
      {
        id: 'sv1',
        name: 'apple',
        isTemplate: false,
        createdAt: 1,
        updatedAt: 1,
        thumbnailUrl: null,
        tags: [],
      },
      {
        id: 'sv2',
        name: 'banana',
        isTemplate: false,
        createdAt: 1,
        updatedAt: 1,
        thumbnailUrl: null,
        tags: [],
      },
    ]);
    renderPage();
    await waitFor(() => expect(screen.getByText('apple')).toBeInTheDocument());
    expect(screen.getByText('banana')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('searchbox', { name: /search saves/i }), 'app');
    expect(screen.getByText('apple')).toBeInTheDocument();
    expect(screen.queryByText('banana')).not.toBeInTheDocument();
  });

  it('search also matches tags', async () => {
    authenticated();
    mockedListSaves.mockResolvedValue([
      {
        id: 'sv1',
        name: 'untitled',
        isTemplate: false,
        createdAt: 1,
        updatedAt: 1,
        thumbnailUrl: null,
        tags: ['brand'],
      },
      {
        id: 'sv2',
        name: 'untitled-2',
        isTemplate: false,
        createdAt: 1,
        updatedAt: 1,
        thumbnailUrl: null,
        tags: ['icon'],
      },
    ]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('untitled')).toBeInTheDocument(),
    );
    await userEvent.type(screen.getByRole('searchbox', { name: /search saves/i }), 'brand');
    expect(screen.getByText('untitled')).toBeInTheDocument();
    expect(screen.queryByText('untitled-2')).not.toBeInTheDocument();
  });

  it('refetches when the filter chip changes', async () => {
    authenticated();
    mockedListSaves.mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(mockedListSaves).toHaveBeenCalledWith('designs'));
    await userEvent.click(screen.getByRole('radio', { name: /templates/i }));
    await waitFor(() => expect(mockedListSaves).toHaveBeenLastCalledWith('templates'));
  });

  it('renders the top tab strip', async () => {
    authenticated();
    mockedListSaves.mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(mockedListSaves).toHaveBeenCalled());
    expect(screen.getByRole('link', { name: /^editor$/i })).toHaveAttribute('href', '/editor');
    expect(screen.getByRole('link', { name: /^images$/i })).toHaveAttribute('href', '/images');
  });
});
