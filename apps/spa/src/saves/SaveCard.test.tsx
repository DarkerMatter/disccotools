import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { SaveSummary } from '@disccotools/shared';
import { createEmptyRecipe } from '@disccotools/shared';
import { SaveCard } from './SaveCard.js';

vi.mock('../editor/render.js', () => ({
  renderToPng: vi.fn(),
  downloadBlob: vi.fn(),
}));

const baseSave: SaveSummary = {
  id: 'sv1',
  name: 'My icon',
  createdAt: Date.now() - 60000,
  updatedAt: Date.now() - 60000,
  recipe: createEmptyRecipe(),
  tags: [],
  shareToken: null,
};

function renderCard(
  over: Partial<SaveSummary> = {},
  handlers: Partial<{
    onClone: () => void;
    onDelete: () => void;
    onRename: (name: string) => Promise<void> | void;
    onTagsChange: (tags: string[]) => Promise<void> | void;
  }> = {},
) {
  return render(
    <MemoryRouter>
      <SaveCard
        save={{ ...baseSave, ...over }}
        onClone={handlers.onClone ?? (() => {})}
        onDelete={handlers.onDelete ?? (() => {})}
        onRename={handlers.onRename ?? (() => {})}
        onTagsChange={handlers.onTagsChange ?? (() => {})}
      />
    </MemoryRouter>,
  );
}

describe('<SaveCard />', () => {
  it('renders the name and an Edit link to /editor/:id', () => {
    renderCard();
    expect(screen.getByText('My icon')).toBeInTheDocument();
    const edit = screen.getByRole('link', { name: /^edit$/i });
    expect(edit).toHaveAttribute('href', '/editor/sv1');
  });

  it('renders a Canvas preview inside the edit link', () => {
    renderCard();
    const editLink = screen.getByRole('link', { name: /edit my icon/i });
    expect(editLink.querySelector('svg[aria-label="Icon canvas"]')).not.toBeNull();
  });

  it('renders a Download button that re-renders from the recipe', async () => {
    const { renderToPng, downloadBlob } = await import('../editor/render.js');
    vi.mocked(renderToPng).mockResolvedValue(new Blob(['x'], { type: 'image/png' }));
    renderCard();
    await userEvent.click(screen.getByRole('button', { name: /download/i }));
    expect(renderToPng).toHaveBeenCalled();
    expect(downloadBlob).toHaveBeenCalled();
  });

  it('two-step confirm before delete fires onDelete', async () => {
    const onDelete = vi.fn();
    renderCard({}, { onDelete });
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    expect(onDelete).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /confirm delete/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('fires onClone', async () => {
    const onClone = vi.fn();
    renderCard({}, { onClone });
    await userEvent.click(screen.getByRole('button', { name: /clone/i }));
    expect(onClone).toHaveBeenCalled();
  });

  it('rename flow: click name → input → save calls onRename', async () => {
    const onRename = vi.fn();
    renderCard({}, { onRename });
    await userEvent.click(screen.getByRole('button', { name: /rename my icon/i }));
    const input = screen.getByRole('textbox', { name: /save name/i });
    await userEvent.clear(input);
    await userEvent.type(input, 'Renamed');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(onRename).toHaveBeenCalledWith('Renamed');
  });

  it('renders existing tag chips', () => {
    renderCard({ tags: ['brand', 'icon'] });
    expect(screen.getByText('brand')).toBeInTheDocument();
    expect(screen.getByText('icon')).toBeInTheDocument();
  });

  it('adding a tag fires onTagsChange with the new array', async () => {
    const onTagsChange = vi.fn();
    renderCard({ tags: ['brand'] }, { onTagsChange });
    await userEvent.click(screen.getByRole('button', { name: /^\+ tag$/i }));
    const input = screen.getByRole('textbox', { name: /new tag/i });
    await userEvent.type(input, 'logo{Enter}');
    expect(onTagsChange).toHaveBeenCalledWith(['brand', 'logo']);
  });

  it('removing a tag fires onTagsChange without it', async () => {
    const onTagsChange = vi.fn();
    renderCard({ tags: ['brand', 'icon'] }, { onTagsChange });
    await userEvent.click(screen.getByRole('button', { name: /remove tag brand/i }));
    expect(onTagsChange).toHaveBeenCalledWith(['icon']);
  });
});
