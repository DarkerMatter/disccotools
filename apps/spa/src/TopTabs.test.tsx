import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { TopTabs } from './TopTabs.js';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TopTabs />
    </MemoryRouter>,
  );
}

describe('<TopTabs />', () => {
  it('renders three tabs labeled Editor, Icons, Images', () => {
    renderAt('/');
    expect(screen.getByRole('link', { name: /editor/i })).toHaveAttribute('href', '/editor');
    expect(screen.getByRole('link', { name: /icons/i })).toHaveAttribute('href', '/icons');
    expect(screen.getByRole('link', { name: /images/i })).toHaveAttribute('href', '/images');
  });

  it('marks Editor active at /', () => {
    renderAt('/');
    expect(screen.getByRole('link', { name: /editor/i })).toHaveAttribute('aria-current', 'page');
  });

  it('marks Editor active at /editor and /editor/:id', () => {
    renderAt('/editor');
    expect(screen.getByRole('link', { name: /editor/i })).toHaveAttribute('aria-current', 'page');
  });

  it('marks Icons active at /icons', () => {
    renderAt('/icons');
    expect(screen.getByRole('link', { name: /icons/i })).toHaveAttribute('aria-current', 'page');
  });

  it('marks Images active at /images', () => {
    renderAt('/images');
    expect(screen.getByRole('link', { name: /images/i })).toHaveAttribute('aria-current', 'page');
  });
});
