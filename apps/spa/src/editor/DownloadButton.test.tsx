import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyRecipe } from '@disccotools/shared';
import { useRecipeStore } from './useRecipeStore.js';
import { DownloadButton } from './DownloadButton.js';

vi.mock('./render.js', () => ({
  renderToPng: vi.fn(),
  downloadBlob: vi.fn(),
}));

import { downloadBlob, renderToPng } from './render.js';
const mockedRender = vi.mocked(renderToPng);
const mockedDownload = vi.mocked(downloadBlob);

beforeEach(() => {
  useRecipeStore.setState({
    recipe: createEmptyRecipe(),
    selectedId: null,
    history: [],
    future: [],
  });
  mockedRender.mockReset();
  mockedDownload.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('<DownloadButton />', () => {
  it('renders a clickable Download PNG button', () => {
    render(<DownloadButton />);
    expect(
      screen.getByRole('button', { name: /download png/i }),
    ).toBeInTheDocument();
  });

  it('calls renderToPng with the current recipe and downloadBlob with the expected filename', async () => {
    const fakeBlob = new Blob(['png'], { type: 'image/png' });
    mockedRender.mockResolvedValue(fakeBlob);

    render(<DownloadButton />);
    await userEvent.click(
      screen.getByRole('button', { name: /download png/i }),
    );

    await waitFor(() => expect(mockedRender).toHaveBeenCalledTimes(1));
    expect(mockedRender).toHaveBeenCalledWith(
      expect.objectContaining({ size: 256 }),
    );
    expect(mockedDownload).toHaveBeenCalledWith(
      fakeBlob,
      'disccotools-256.png',
    );
  });

  it('shows an error message when render fails', async () => {
    mockedRender.mockRejectedValue(new Error('boom'));
    render(<DownloadButton />);
    await userEvent.click(
      screen.getByRole('button', { name: /download png/i }),
    );
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/render failed/i),
    );
    expect(mockedDownload).not.toHaveBeenCalled();
  });
});
