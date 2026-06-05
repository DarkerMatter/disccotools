import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Asset } from '@disccotools/shared';
import { ThemeProvider } from '../theme/ThemeContext.js';
import { AssetPicker } from './AssetPicker.js';

vi.mock('../api/assets.js', () => ({
  listAssets: vi.fn(),
  uploadAsset: vi.fn(),
  uploadAssetWithProgress: vi.fn(),
  validateAssetFile: vi.fn(() => null),
  renameAsset: vi.fn(),
  deleteAsset: vi.fn(),
  AssetInUseError: class AssetInUseError extends Error {
    constructor(public references: { id: string; name: string }[]) {
      super('in use');
      this.name = 'AssetInUseError';
    }
  },
}));

import {
  listAssets,
  uploadAssetWithProgress,
  validateAssetFile,
} from '../api/assets.js';

const mockedList = vi.mocked(listAssets);
const mockedUpload = vi.mocked(uploadAssetWithProgress);
const mockedValidate = vi.mocked(validateAssetFile);

const realMatchMedia = window.matchMedia;

const sample: Asset = {
  id: 'a1',
  name: 'cat',
  mimeType: 'image/png',
  sizeBytes: 1,
  createdAt: 1,
  updatedAt: 1,
  url: '/api/assets/a1/file',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedValidate.mockReturnValue(null);
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: false, media: q, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  vi.clearAllMocks();
  window.matchMedia = realMatchMedia;
});

function renderPicker(props: Partial<React.ComponentProps<typeof AssetPicker>> = {}) {
  return render(
    <ThemeProvider>
      <AssetPicker
        open={props.open ?? true}
        onClose={props.onClose ?? (() => {})}
        onSelect={props.onSelect ?? (() => {})}
      />
    </ThemeProvider>,
  );
}

describe('<AssetPicker />', () => {
  it('renders nothing when closed', () => {
    mockedList.mockResolvedValue([sample]);
    renderPicker({ open: false });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('loads and displays the library on open', async () => {
    mockedList.mockResolvedValue([sample]);
    renderPicker();
    expect(await screen.findByRole('button', { name: /insert cat/i })).toBeInTheDocument();
  });

  it('calls onSelect when a library asset is clicked', async () => {
    const onSelect = vi.fn();
    mockedList.mockResolvedValue([sample]);
    renderPicker({ onSelect });
    const btn = await screen.findByRole('button', { name: /insert cat/i });
    await userEvent.click(btn);
    expect(onSelect).toHaveBeenCalledWith(sample);
  });

  it('shows empty hint in My library when no assets', async () => {
    mockedList.mockResolvedValue([]);
    renderPicker();
    await waitFor(() =>
      expect(screen.getByText(/no assets yet\. switch to upload/i)).toBeInTheDocument(),
    );
  });

  it('upload tab: uploads file and selects the new asset', async () => {
    mockedList.mockResolvedValue([]);
    mockedUpload.mockResolvedValue({ ...sample, name: 'kitten' });
    const onSelect = vi.fn();
    renderPicker({ onSelect });
    await waitFor(() => expect(mockedList).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('tab', { name: /upload new/i }));
    const fileInput = screen.getByLabelText(/pick image file/i) as HTMLInputElement;
    const file = new File(['x'], 'kitten.png', { type: 'image/png' });
    await userEvent.upload(fileInput, file);
    // name auto-filled
    expect((screen.getByLabelText(/asset name/i) as HTMLInputElement).value).toBe('kitten');
    await userEvent.click(screen.getByRole('button', { name: /^upload$/i }));
    await waitFor(() => expect(mockedUpload).toHaveBeenCalled());
    expect(mockedUpload.mock.calls[0]![1]).toBe('kitten');
    await waitFor(() => expect(onSelect).toHaveBeenCalled());
    expect(onSelect.mock.calls[0]![0]).toMatchObject({ name: 'kitten' });
  });

  it('upload tab: shows an inline error for unsupported MIME and skips upload', async () => {
    mockedList.mockResolvedValue([]);
    mockedValidate.mockImplementation((f) =>
      f.type === 'image/svg+xml'
        ? 'Unsupported file type. PNG, JPEG, or WebP only.'
        : null,
    );
    renderPicker();
    await waitFor(() => expect(mockedList).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('tab', { name: /upload new/i }));
    const fileInput = screen.getByLabelText(/pick image file/i) as HTMLInputElement;
    const bad = new File(['<svg/>'], 'bad.svg', { type: 'image/svg+xml' });
    // Bypass userEvent.upload — its accept-attribute check would block this
    // file before onChange fires. We want to verify the in-app guard.
    fireEvent.change(fileInput, { target: { files: [bad] } });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /unsupported file type/i,
    );
    await userEvent.click(screen.getByRole('button', { name: /^upload$/i }));
    expect(mockedUpload).not.toHaveBeenCalled();
  });
});
