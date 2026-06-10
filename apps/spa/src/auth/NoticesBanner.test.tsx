import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PendingNotice } from '@disccotools/shared';
import { NoticesBanner } from './NoticesBanner.js';

vi.mock('../api/client.js', () => ({
  ackNotice: vi.fn(),
}));

import { ackNotice } from '../api/client.js';
const mockedAck = vi.mocked(ackNotice);

beforeEach(() => {
  mockedAck.mockReset();
  mockedAck.mockResolvedValue();
});

afterEach(() => {
  vi.clearAllMocks();
});

const sampleNotice = (overrides: Partial<PendingNotice> = {}): PendingNotice => ({
  id: 'aa_1',
  kind: 'asset_deleted',
  reason: 'violates policy',
  targetLabel: 'bad.png',
  createdAt: 0,
  ...overrides,
});

describe('<NoticesBanner />', () => {
  it('renders nothing when there are no notices', () => {
    const { container } = render(<NoticesBanner notices={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the reason and target label', () => {
    render(<NoticesBanner notices={[sampleNotice()]} />);
    expect(screen.getByText(/bad\.png/)).toBeInTheDocument();
    expect(screen.getByText(/violates policy/)).toBeInTheDocument();
  });

  it('dismisses on click and calls ackNotice', async () => {
    render(<NoticesBanner notices={[sampleNotice()]} />);
    await userEvent.click(screen.getByRole('button', { name: /got it/i }));
    await waitFor(() =>
      expect(mockedAck).toHaveBeenCalledWith('aa_1'),
    );
    expect(screen.queryByText(/bad\.png/)).toBeNull();
  });

  it('shows distinct copy per kind', () => {
    render(
      <NoticesBanner
        notices={[
          sampleNotice({ id: 'a', kind: 'banned', targetLabel: null }),
          sampleNotice({ id: 'b', kind: 'save_deleted', targetLabel: 'mine' }),
        ]}
      />,
    );
    expect(screen.getByText(/your account was banned/i)).toBeInTheDocument();
    expect(screen.getByText(/"mine" was removed/i)).toBeInTheDocument();
  });

  it('shows friendly tier message for level changes without a reason line', () => {
    render(
      <NoticesBanner
        notices={[
          sampleNotice({
            id: 'lvl',
            kind: 'level_changed',
            targetLabel: '1|2',
            reason: '',
          }),
        ]}
      />,
    );
    expect(screen.getByText(/upgraded/i)).toBeInTheDocument();
    expect(screen.getByText(/up to 10 images/i)).toBeInTheDocument();
    expect(screen.queryByText(/Reason:/i)).toBeNull();
  });

  it('shows admin access message at level 10', () => {
    render(
      <NoticesBanner
        notices={[
          sampleNotice({
            id: 'adm',
            kind: 'level_changed',
            targetLabel: '3|10',
            reason: '',
          }),
        ]}
      />,
    );
    expect(screen.getByText(/admin access/i)).toBeInTheDocument();
  });
});
