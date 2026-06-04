import { act, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider, getInitialTheme, useTheme } from './ThemeContext.js';

const realMatchMedia = window.matchMedia;

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

afterEach(() => {
  window.matchMedia = realMatchMedia;
});

function mockMatchMedia(matchesDark: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('dark') ? matchesDark : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

describe('getInitialTheme', () => {
  it('returns stored theme when present', () => {
    window.localStorage.setItem('disccotools.theme', 'dark');
    mockMatchMedia(false);
    expect(getInitialTheme()).toBe('dark');
  });

  it('falls back to OS preference when nothing stored', () => {
    mockMatchMedia(true);
    expect(getInitialTheme()).toBe('dark');
  });

  it('defaults to light when nothing stored and OS does not prefer dark', () => {
    mockMatchMedia(false);
    expect(getInitialTheme()).toBe('light');
  });
});

describe('ThemeProvider + useTheme', () => {
  it('sets data-theme attribute on documentElement on mount', () => {
    mockMatchMedia(false);
    render(
      <ThemeProvider>
        <div />
      </ThemeProvider>,
    );
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('toggle switches between light and dark and persists to localStorage', () => {
    mockMatchMedia(false);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe('light');
    act(() => result.current.toggle());
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(window.localStorage.getItem('disccotools.theme')).toBe('dark');

    act(() => result.current.toggle());
    expect(result.current.theme).toBe('light');
  });

  it('throws if useTheme is used outside provider', () => {
    expect(() => renderHook(() => useTheme())).toThrow(/inside <ThemeProvider>/);
  });
});
