import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { User } from '@disccotools/shared';
import { UserPill } from './UserPill.js';

const baseUser: User = {
  id: '714517219026927767',
  username: 'mitri',
  globalName: 'Dimitri',
  avatarHash: 'a_abc123',
  isHomeMember: true,
  memberCheckedAt: 1717000000000,
};

describe('<UserPill />', () => {
  it('shows display name (prefers globalName)', () => {
    render(<UserPill user={baseUser} onLogout={() => {}} />);
    expect(screen.getByText('Dimitri')).toBeInTheDocument();
  });

  it('falls back to username when globalName is null', () => {
    render(
      <UserPill user={{ ...baseUser, globalName: null }} onLogout={() => {}} />,
    );
    expect(screen.getByText('mitri')).toBeInTheDocument();
  });

  it('shows the NTTS badge when isHomeMember is true', () => {
    render(<UserPill user={baseUser} onLogout={() => {}} />);
    expect(screen.getByText(/ntts/i)).toBeInTheDocument();
  });

  it('omits the badge when isHomeMember is false', () => {
    render(
      <UserPill user={{ ...baseUser, isHomeMember: false }} onLogout={() => {}} />,
    );
    expect(screen.queryByText(/ntts/i)).toBeNull();
  });

  it('calls onLogout when the log-out button is clicked', async () => {
    const onLogout = vi.fn();
    render(<UserPill user={baseUser} onLogout={onLogout} />);
    await userEvent.click(screen.getByRole('button', { name: /log out/i }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('shows the DEV badge for the hardcoded developer id', () => {
    render(
      <UserPill
        user={{ ...baseUser, id: '519939316898856967' }}
        onLogout={() => {}}
      />,
    );
    expect(screen.getByText(/^dev$/i)).toBeInTheDocument();
  });

  it('omits the DEV badge for non-developer users', () => {
    render(<UserPill user={baseUser} onLogout={() => {}} />);
    expect(screen.queryByText(/^dev$/i)).toBeNull();
  });
});
