import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../theme/ThemeContext.js';
import { IconGrid } from './IconGrid.js';

vi.mock('./iconify.js', async () => {
  const actual = await vi.importActual<typeof import('./iconify.js')>('./iconify.js');
  const browseFixtures: Record<string, Array<{ id: string; prefix: string; name: string }>> = {
    lucide: [{ id: 'lucide:rocket', prefix: 'lucide', name: 'rocket' }],
    tabler: [{ id: 'tabler:star', prefix: 'tabler', name: 'star' }],
    ph: [{ id: 'ph:heart', prefix: 'ph', name: 'heart' }],
  };
  return {
    ...actual,
    searchIcons: vi.fn().mockResolvedValue([]),
    browseIcons: vi.fn().mockImplementation(async (prefix: string) => {
      return browseFixtures[prefix] ?? [];
    }),
  };
});

const realMatchMedia = window.matchMedia;

beforeEach(() => {
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

function renderGrid(props: React.ComponentProps<typeof IconGrid>) {
  return render(
    <ThemeProvider>
      <IconGrid {...props} />
    </ThemeProvider>,
  );
}

describe('<IconGrid />', () => {
  it('renders the search input and all chip filters', () => {
    renderGrid({ onSelect: () => {} });
    expect(screen.getByRole('textbox', { name: /search icons/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^lucide$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^custom$/i })).toBeInTheDocument();
  });

  it('renders the mocked browse hits and fires onSelect when one is clicked', async () => {
    const onSelect = vi.fn();
    renderGrid({ onSelect });
    const btn = await screen.findByRole('button', { name: /insert lucide:rocket/i });
    await userEvent.click(btn);
    expect(onSelect).toHaveBeenCalledWith({
      id: 'lucide:rocket',
      prefix: 'lucide',
      name: 'rocket',
    });
  });

  it('renders nothing when active is false', () => {
    renderGrid({ active: false, onSelect: () => {} });
    expect(screen.queryByRole('textbox', { name: /search icons/i })).toBeNull();
  });
});
