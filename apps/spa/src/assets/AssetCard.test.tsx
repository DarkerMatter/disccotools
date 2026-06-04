import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { Asset } from '@disccotools/shared';
import { AssetCard } from './AssetCard.js';

const baseAsset: Asset = {
  id: 'a1',
  name: 'My image',
  mimeType: 'image/png',
  sizeBytes: 2048,
  createdAt: Date.now() - 60000,
  updatedAt: Date.now() - 60000,
  url: '/api/assets/a1/file',
};

function renderCard(
  over: Partial<Asset> = {},
  handlers: Partial<{
    onRename: (name: string) => Promise<void> | void;
    onDelete: () => Promise<void> | void;
  }> = {},
) {
  return render(
    <MemoryRouter>
      <AssetCard
        asset={{ ...baseAsset, ...over }}
        onRename={handlers.onRename ?? (() => {})}
        onDelete={handlers.onDelete ?? (() => {})}
      />
    </MemoryRouter>,
  );
}

describe('<AssetCard />', () => {
  it('renders the name and an <img> with the asset URL', () => {
    renderCard();
    expect(screen.getByText('My image')).toBeInTheDocument();
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/api/assets/a1/file');
  });

  it('two-step delete fires onDelete on confirm', async () => {
    const onDelete = vi.fn();
    renderCard({}, { onDelete });
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    expect(onDelete).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /confirm delete/i }));
    expect(onDelete).toHaveBeenCalled();
  });

  it('rename flow: click name → input → save calls onRename', async () => {
    const onRename = vi.fn();
    renderCard({}, { onRename });
    await userEvent.click(screen.getByText('My image'));
    const input = screen.getByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, 'Renamed');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(onRename).toHaveBeenCalledWith('Renamed');
  });

  it('rename cancel reverts to display mode without firing onRename', async () => {
    const onRename = vi.fn();
    renderCard({}, { onRename });
    await userEvent.click(screen.getByText('My image'));
    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByText('My image')).toBeInTheDocument();
  });

  it('shows in-use message when onDelete throws AssetInUseError', async () => {
    const { AssetInUseError } = await import('../api/assets.js');
    const onDelete = vi.fn().mockRejectedValue(
      new AssetInUseError([
        { id: 'sv1', name: 'Save 1' },
        { id: 'sv2', name: 'Save 2' },
      ]),
    );
    renderCard({}, { onDelete });
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    await userEvent.click(screen.getByRole('button', { name: /confirm delete/i }));
    expect(await screen.findByText(/in use by 2 save/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /manage|saves/i })).toHaveAttribute('href', '/saves');
  });
});
