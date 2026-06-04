import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from './ThemeContext.js';
import { ThemeToggle } from './ThemeToggle.js';

const realMatchMedia = window.matchMedia;

beforeEach(() => {
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
  window.matchMedia = realMatchMedia;
});

describe('<ThemeToggle />', () => {
  it('renders an accessible toggle button', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(
      screen.getByRole('button', { name: /switch to dark mode/i }),
    ).toBeInTheDocument();
  });

  it('flips its label after a click (light → dark)', async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    const btn = screen.getByRole('button', { name: /switch to dark mode/i });
    await userEvent.click(btn);
    expect(
      screen.getByRole('button', { name: /switch to light mode/i }),
    ).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
