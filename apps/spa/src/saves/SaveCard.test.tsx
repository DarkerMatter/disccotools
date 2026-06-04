import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { SaveSummary } from '@disccotools/shared';
import { SaveCard } from './SaveCard.js';

const baseSave: SaveSummary = {
  id: 'sv1',
  name: 'My icon',
  isTemplate: false,
  createdAt: Date.now() - 60000,
  updatedAt: Date.now() - 60000,
  thumbnailUrl: '/api/saves/sv1/thumbnail',
};

function renderCard(over: Partial<SaveSummary> = {}, handlers: Partial<{ onClone: () => void; onDelete: () => void; onToggleTemplate: () => void }> = {}) {
  return render(
    <MemoryRouter>
      <SaveCard
        save={{ ...baseSave, ...over }}
        onClone={handlers.onClone ?? (() => {})}
        onDelete={handlers.onDelete ?? (() => {})}
        onToggleTemplate={handlers.onToggleTemplate ?? (() => {})}
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

  it('renders a TEMPLATE badge when isTemplate is true', () => {
    renderCard({ isTemplate: true });
    expect(screen.getByText('TEMPLATE')).toBeInTheDocument();
  });

  it('renders a fallback when there is no thumbnail', () => {
    renderCard({ thumbnailUrl: null });
    expect(screen.getByText(/no preview/i)).toBeInTheDocument();
  });

  it('two-step confirm before delete fires onDelete', async () => {
    const onDelete = vi.fn();
    renderCard({}, { onDelete });
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    expect(onDelete).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /confirm delete/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('fires onClone and onToggleTemplate', async () => {
    const onClone = vi.fn();
    const onToggleTemplate = vi.fn();
    renderCard({}, { onClone, onToggleTemplate });
    await userEvent.click(screen.getByRole('button', { name: /clone/i }));
    expect(onClone).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /make template/i }));
    expect(onToggleTemplate).toHaveBeenCalled();
  });
});
