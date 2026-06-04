import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Asset } from '@disccotools/shared';
import { ThemeProvider } from '../theme/ThemeContext.js';
import { ImagesPage } from './ImagesPage.js';

vi.mock('../auth/useUser.js', () => ({ useUser: vi.fn() }));
vi.mock('../api/assets.js', () => ({
  listAssets: vi.fn(),
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

import { useUser } from '../auth/useUser.js';
import { listAssets } from '../api/assets.js';

const mockedUseUser = vi.mocked(useUser);
const mockedListAssets = vi.mocked(listAssets);

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

const sampleAsset: Asset = {
  id: 'a1',
  name: 'cat',
  mimeType: 'image/png',
  sizeBytes: 1234,
  createdAt: 1,
  updatedAt: 1,
  url: '/api/assets/a1/file',
};

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
    <MemoryRouter initialEntries={['/images']}>
      <ThemeProvider>
        <Routes>
          <Route path="/images" element={<ImagesPage />} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('<ImagesPage />', () => {
  it('prompts unauthenticated users to sign in', () => {
    mockedUseUser.mockReturnValue({ status: 'anonymous' });
    renderPage();
    expect(screen.getByText(/sign in to upload/i)).toBeInTheDocument();
  });

  it('renders the asset grid when authenticated', async () => {
    authenticated();
    mockedListAssets.mockResolvedValue([sampleAsset]);
    renderPage();
    await waitFor(() => expect(screen.getByText('cat')).toBeInTheDocument());
  });

  it('renders the upload dropzone when authenticated', async () => {
    authenticated();
    mockedListAssets.mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(mockedListAssets).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: /upload an asset/i })).toBeInTheDocument();
  });

  it('renders the top tab strip', async () => {
    authenticated();
    mockedListAssets.mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(mockedListAssets).toHaveBeenCalled());
    expect(screen.getByRole('link', { name: /^editor$/i })).toHaveAttribute('href', '/editor');
    expect(screen.getByRole('link', { name: /^icons$/i })).toHaveAttribute('href', '/icons');
  });
});
