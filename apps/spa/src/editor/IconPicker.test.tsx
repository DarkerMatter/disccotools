import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../theme/ThemeContext.js';
import { IconPicker } from './IconPicker.js';
import type { IconHit } from './iconify.js';

vi.mock('./iconify.js', async () => {
  const actual = await vi.importActual<typeof import('./iconify.js')>('./iconify.js');
  // Browse mode returns one hit per requested prefix so the All-prefixes loop
  // doesn't generate duplicate IDs across iterations.
  const browseFixtures: Record<string, Array<{ id: string; prefix: string; name: string }>> = {
    lucide: [{ id: 'lucide:rocket', prefix: 'lucide', name: 'rocket' }],
    tabler: [{ id: 'tabler:star', prefix: 'tabler', name: 'star' }],
    ph: [{ id: 'ph:heart', prefix: 'ph', name: 'heart' }],
  };
  return {
    ...actual,
    searchIcons: vi.fn().mockResolvedValue([
      { id: 'lucide:rocket', prefix: 'lucide', name: 'rocket' },
      { id: 'tabler:star', prefix: 'tabler', name: 'star' },
      { id: 'ph:heart', prefix: 'ph', name: 'heart' },
    ]),
    browseIcons: vi.fn().mockImplementation(async (prefix: string) => {
      return browseFixtures[prefix] ?? [];
    }),
  };
});

import * as iconify from './iconify.js';
const mockedSearch = vi.mocked(iconify.searchIcons);
const mockedBrowse = vi.mocked(iconify.browseIcons);

function renderPicker(props: React.ComponentProps<typeof IconPicker>) {
  return render(
    <ThemeProvider>
      <IconPicker {...props} />
    </ThemeProvider>,
  );
}

const realMatchMedia = window.matchMedia;

beforeEach(() => {
  mockedSearch.mockClear();
  mockedBrowse.mockClear();
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

describe('<IconPicker />', () => {
  it('renders nothing when closed', () => {
    renderPicker({ open: false, onClose: () => {}, onSelect: () => {} });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows results after debounce when open', async () => {
    renderPicker({ open: true, onClose: () => {}, onSelect: () => {} });
    expect(screen.getByRole('dialog', { name: /icon picker/i })).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: /insert lucide:rocket/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /insert tabler:star/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /insert ph:heart/i }),
    ).toBeInTheDocument();
  });

  it('calls onSelect when a result is clicked', async () => {
    const onSelect = vi.fn();
    renderPicker({ open: true, onClose: () => {}, onSelect });
    const btn = await screen.findByRole('button', { name: /insert lucide:rocket/i });
    await userEvent.click(btn);
    expect(onSelect).toHaveBeenCalledWith({
      id: 'lucide:rocket',
      prefix: 'lucide',
      name: 'rocket',
    });
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    renderPicker({ open: true, onClose, onSelect: () => {} });
    await userEvent.click(screen.getByRole('button', { name: /close icon picker/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders prefix section headings when filter is "All"', async () => {
    renderPicker({ open: true, onClose: () => {}, onSelect: () => {} });
    await screen.findByRole('button', { name: /insert lucide:rocket/i });
    expect(screen.getByRole('heading', { name: /lucide/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /tabler/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /phosphor/i })).toBeInTheDocument();
  });

  it('filters to a single prefix when its chip is clicked', async () => {
    renderPicker({ open: true, onClose: () => {}, onSelect: () => {} });
    await screen.findByRole('button', { name: /insert lucide:rocket/i });
    mockedBrowse.mockResolvedValueOnce([
      { id: 'tabler:star', prefix: 'tabler', name: 'star' },
    ]);
    await userEvent.click(screen.getByRole('button', { name: /^tabler$/i }));
    await screen.findByRole('button', { name: /insert tabler:star/i });
    expect(screen.queryByRole('button', { name: /insert lucide:rocket/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /insert ph:heart/i })).toBeNull();
    const lastCall = mockedBrowse.mock.calls.at(-1);
    expect(lastCall?.[0]).toBe('tabler');
  });

  it('clicking "All" restores the unfiltered call', async () => {
    renderPicker({ open: true, onClose: () => {}, onSelect: () => {} });
    await screen.findByRole('button', { name: /insert lucide:rocket/i });
    await userEvent.click(screen.getByRole('button', { name: /^tabler$/i }));
    const callsBeforeAll = mockedBrowse.mock.calls.length;
    await userEvent.click(screen.getByRole('button', { name: /^all$/i }));
    await screen.findByRole('button', { name: /insert lucide:rocket/i });
    expect(mockedBrowse.mock.calls.length).toBeGreaterThan(callsBeforeAll);
    // After clicking "All", browse is invoked once per DEFAULT_PREFIXES entry,
    // none of which receives a specific single-prefix filter via this code path.
    const lastCall = mockedBrowse.mock.calls.at(-1);
    expect(typeof lastCall?.[0]).toBe('string');
  });

  it('renders browse-mode icons immediately when opened (no search needed)', async () => {
    renderPicker({ open: true, onClose: () => {}, onSelect: () => {} });
    expect(
      await screen.findByRole('button', { name: /insert lucide:rocket/i }),
    ).toBeInTheDocument();
  });

  it('only mounts up to INITIAL_CHUNK icons even when more are returned', async () => {
    const many: IconHit[] = Array.from({ length: 500 }, (_, i) => ({
      id: `lucide:icon-${i}`,
      prefix: 'lucide',
      name: `icon-${i}`,
    }));
    vi.mocked(iconify.browseIcons).mockResolvedValueOnce(many);
    vi.mocked(iconify.browseIcons).mockResolvedValueOnce(many);
    vi.mocked(iconify.browseIcons).mockResolvedValueOnce(many);
    vi.mocked(iconify.browseIcons).mockResolvedValueOnce(many);
    vi.mocked(iconify.browseIcons).mockResolvedValueOnce(many);

    renderPicker({ open: true, onClose: () => {}, onSelect: () => {} });
    // wait for the first batch to render
    await screen.findByRole('button', { name: /insert lucide:icon-0/i });
    const buttons = screen.getAllByRole('button', { name: /^insert lucide:icon-/i });
    // INITIAL_CHUNK is 200; allow some slack for sectioned distribution
    expect(buttons.length).toBeLessThanOrEqual(200);
    expect(buttons.length).toBeGreaterThan(0);
  });
});
