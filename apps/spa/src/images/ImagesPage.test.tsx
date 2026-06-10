import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Asset } from '@disccotools/shared';
import { ThemeProvider } from '../theme/ThemeContext.js';
import { ImagesPage } from './ImagesPage.js';

vi.mock('../auth/useUser.js', () => ({ useUser: vi.fn() }));
vi.mock('../api/assets.js', () => ({
  listAssets: vi.fn(),
  uploadAsset: vi.fn(),
  uploadAssetWithProgress: vi.fn(),
  validateAssetFile: vi.fn(() => null),
  renameAsset: vi.fn(),
  updateAssetTags: vi.fn(),
  deleteAsset: vi.fn(),
  AssetInUseError: class AssetInUseError extends Error {
    constructor(public references: { id: string; name: string }[]) {
      super('in use');
      this.name = 'AssetInUseError';
    }
  },
}));

import { useUser } from '../auth/useUser.js';
import {
  listAssets,
  uploadAssetWithProgress,
  validateAssetFile,
} from '../api/assets.js';

const mockedUseUser = vi.mocked(useUser);
const mockedListAssets = vi.mocked(listAssets);
const mockedUpload = vi.mocked(uploadAssetWithProgress);
const mockedValidate = vi.mocked(validateAssetFile);

const realMatchMedia = window.matchMedia;

function authenticated() {
  mockedUseUser.mockReturnValue({
    status: 'authenticated',
    user: {
      id: '1', username: 'mitri', globalName: null, avatarHash: null,
    },
    permLevel: 1,
    pendingNotices: [],
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
  tags: [],
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

  it('filters assets by name when the search input is used', async () => {
    authenticated();
    mockedListAssets.mockResolvedValue([
      { ...sampleAsset, id: 'a1', name: 'cat' },
      { ...sampleAsset, id: 'a2', name: 'dog' },
    ]);
    renderPage();
    await waitFor(() => expect(screen.getByText('cat')).toBeInTheDocument());
    expect(screen.getByText('dog')).toBeInTheDocument();
    await userEvent.type(
      screen.getByRole('searchbox', { name: /search assets/i }),
      'do',
    );
    expect(screen.queryByText('cat')).not.toBeInTheDocument();
    expect(screen.getByText('dog')).toBeInTheDocument();
  });

  it('search also matches tags', async () => {
    authenticated();
    mockedListAssets.mockResolvedValue([
      { ...sampleAsset, id: 'a1', name: 'cat', tags: ['pet'] },
      { ...sampleAsset, id: 'a2', name: 'dog', tags: ['hound'] },
    ]);
    renderPage();
    await waitFor(() => expect(screen.getByText('cat')).toBeInTheDocument());
    await userEvent.type(
      screen.getByRole('searchbox', { name: /search assets/i }),
      'pet',
    );
    expect(screen.getByText('cat')).toBeInTheDocument();
    expect(screen.queryByText('dog')).not.toBeInTheDocument();
  });

  it('shows an inline error for unsupported file types and does not upload', async () => {
    authenticated();
    mockedListAssets.mockResolvedValue([]);
    mockedValidate.mockReturnValueOnce(
      'Unsupported file type. PNG, JPEG, or WebP only.',
    );
    renderPage();
    await waitFor(() => expect(mockedListAssets).toHaveBeenCalled());

    const file = new File(['<svg/>'], 'bad.svg', { type: 'image/svg+xml' });
    const dropzone = screen.getByRole('button', { name: /upload an asset/i });
    // dispatch a synthetic drop with dataTransfer
    const dt = { files: [file] } as unknown as DataTransfer;
    const ev = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'dataTransfer', { value: dt });
    dropzone.dispatchEvent(ev);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /unsupported file type/i,
    );
    expect(mockedUpload).not.toHaveBeenCalled();
  });

  it('shows a progress bar while uploading', async () => {
    authenticated();
    mockedListAssets.mockResolvedValue([]);
    mockedValidate.mockReturnValue(null);
    let resolveUpload: ((asset: Asset) => void) | undefined;
    let lastProgress:
      | ((p: { loaded: number; total: number; fraction: number }) => void)
      | undefined;
    mockedUpload.mockImplementation((_file, _name, onProgress) => {
      lastProgress = onProgress;
      return new Promise<Asset>((resolve) => {
        resolveUpload = resolve;
      });
    });
    renderPage();
    await waitFor(() => expect(mockedListAssets).toHaveBeenCalled());

    const file = new File(['hello'], 'cat.png', { type: 'image/png' });
    const dropzone = screen.getByRole('button', { name: /upload an asset/i });
    const dt = { files: [file] } as unknown as DataTransfer;
    const ev = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'dataTransfer', { value: dt });
    dropzone.dispatchEvent(ev);

    // Initial status row appears immediately at 0%.
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/uploading cat\.png/i),
    );
    expect(screen.getByRole('status')).toHaveTextContent(/0%/);

    // Drive progress to ~42%.
    lastProgress?.({ loaded: 42, total: 100, fraction: 0.42 });
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/42%/),
    );

    // Finish the upload.
    resolveUpload?.({ ...sampleAsset, name: 'cat' });
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  });

  it('surfaces server error messages from rejected uploads', async () => {
    authenticated();
    mockedListAssets.mockResolvedValue([]);
    mockedValidate.mockReturnValue(null);
    const { ApiError } = await import('../api/client.js');
    mockedUpload.mockRejectedValueOnce(
      new ApiError('VALIDATION', 400, 'unsupported mime'),
    );
    renderPage();
    await waitFor(() => expect(mockedListAssets).toHaveBeenCalled());

    const file = new File(['x'], 'cat.png', { type: 'image/png' });
    const dropzone = screen.getByRole('button', { name: /upload an asset/i });
    const dt = { files: [file] } as unknown as DataTransfer;
    const ev = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'dataTransfer', { value: dt });
    dropzone.dispatchEvent(ev);

    expect(await screen.findByRole('alert')).toHaveTextContent('unsupported mime');
    // Dismiss clears the error.
    await userEvent.click(
      screen.getByRole('button', { name: /dismiss upload error/i }),
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
