import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyRecipe } from '@disccotools/shared';
import { useRecipeStore } from './useRecipeStore.js';
import { SaveButton } from './SaveButton.js';

vi.mock('../auth/useUser.js', () => ({
  useUser: vi.fn(),
}));
vi.mock('../api/saves.js', () => ({
  createSave: vi.fn(),
  updateSave: vi.fn(),
  uploadRender: vi.fn(),
}));
vi.mock('./render.js', () => ({
  renderToPng: vi.fn(),
  renderRecipeAtSize: vi.fn(),
  downloadBlob: vi.fn(),
  recipeToSvgString: vi.fn(),
}));

import { useUser } from '../auth/useUser.js';
import { createSave, updateSave, uploadRender } from '../api/saves.js';
import { renderRecipeAtSize, renderToPng } from './render.js';

const mockedUseUser = vi.mocked(useUser);
const mockedCreate = vi.mocked(createSave);
const mockedUpdate = vi.mocked(updateSave);
const mockedUpload = vi.mocked(uploadRender);
const mockedRender = vi.mocked(renderToPng);
const mockedRenderAt = vi.mocked(renderRecipeAtSize);

function detail(over: Partial<{ id: string; name: string }> = {}) {
  return {
    id: 'sv1',
    name: 'a',
    recipe: createEmptyRecipe(),
    isTemplate: false,
    renderedAt: null,
    createdAt: 1,
    updatedAt: 1,
    thumbnailUrl: null,
    downloadUrl: null,
    ...over,
  };
}

function renderBtn() {
  return render(
    <MemoryRouter>
      <SaveButton />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useRecipeStore.setState({
    recipe: createEmptyRecipe(),
    selectedId: null,
    history: [],
    future: [],
    currentSave: null,
  });
  vi.clearAllMocks();
  mockedRender.mockResolvedValue(new Blob(['x'], { type: 'image/png' }));
  mockedRenderAt.mockResolvedValue(new Blob(['y'], { type: 'image/png' }));
  mockedUpload.mockResolvedValue(detail());
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('<SaveButton />', () => {
  it('shows a "Sign in to save" prompt and a sign-in tooltip when anonymous', () => {
    mockedUseUser.mockReturnValue({ status: 'anonymous' });
    renderBtn();
    const btn = screen.getByRole('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toMatch(/sign in to save/i);
    expect(btn.title).toMatch(/sign in/i);
  });

  it('opens the name dialog on first save and creates+uploads on submit', async () => {
    mockedUseUser.mockReturnValue({
      status: 'authenticated',
      user: {
        id: '1', username: 'mitri', globalName: null, avatarHash: null,
        isHomeMember: false, memberCheckedAt: 0,
      },
    });
    mockedCreate.mockResolvedValue(detail({ name: 'fresh' }));
    renderBtn();
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(screen.getByRole('dialog', { name: /name this save/i })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/save name/i), 'fresh');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(mockedCreate).toHaveBeenCalled());
    expect(mockedCreate.mock.calls[0]![0]!.name).toBe('fresh');
    await waitFor(() => expect(mockedUpload).toHaveBeenCalled());
    expect(mockedRender).toHaveBeenCalled();
    expect(mockedRenderAt).toHaveBeenCalledWith(expect.anything(), 128);
    expect(useRecipeStore.getState().currentSave?.id).toBe('sv1');
  });

  it('updates without prompting when currentSave is set', async () => {
    mockedUseUser.mockReturnValue({
      status: 'authenticated',
      user: {
        id: '1', username: 'mitri', globalName: null, avatarHash: null,
        isHomeMember: false, memberCheckedAt: 0,
      },
    });
    useRecipeStore.setState((s) => ({ ...s, currentSave: { id: 'sv1', name: 'a' } }));
    mockedUpdate.mockResolvedValue(detail());
    renderBtn();
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(mockedUpdate).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('surfaces an inline error message on failure', async () => {
    mockedUseUser.mockReturnValue({
      status: 'authenticated',
      user: {
        id: '1', username: 'mitri', globalName: null, avatarHash: null,
        isHomeMember: false, memberCheckedAt: 0,
      },
    });
    useRecipeStore.setState((s) => ({ ...s, currentSave: { id: 'sv1', name: 'a' } }));
    mockedUpdate.mockRejectedValue(new Error('boom'));
    renderBtn();
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/save failed/i),
    );
  });
});
