import type { User } from '@disccotools/shared';

const DEV_USER_IDS = new Set<string>(['519939316898856967']);

const CONFETTI_PARTICLES = [
  { dx: 28, dy: -32, c: '#ef4444' },
  { dx: -28, dy: -28, c: '#f59e0b' },
  { dx: 32, dy: -10, c: '#3b82f6' },
  { dx: -32, dy: -8, c: '#10b981' },
  { dx: 15, dy: -38, c: '#a855f7' },
  { dx: -15, dy: -38, c: '#ec4899' },
  { dx: 25, dy: 8, c: '#06b6d4' },
  { dx: -25, dy: 8, c: '#eab308' },
  { dx: 8, dy: -42, c: '#84cc16' },
  { dx: -8, dy: -42, c: '#fb923c' },
  { dx: 35, dy: -20, c: '#f43f5e' },
  { dx: -35, dy: -20, c: '#22d3ee' },
] as const;

function DevBadge() {
  return (
    <span className="dev-badge" title="Developer">
      {CONFETTI_PARTICLES.map((p, i) => (
        <span
          key={i}
          className="dev-confetti"
          style={{
            ['--dev-dx' as never]: `${p.dx}px`,
            ['--dev-dy' as never]: `${p.dy}px`,
            ['--dev-c' as never]: p.c,
            animationDelay: `${i * 18}ms`,
          }}
          aria-hidden="true"
        />
      ))}
      DEV
    </span>
  );
}

function avatarUrl(user: User): string {
  if (user.avatarHash) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatarHash}.png?size=64`;
  }
  const idx = Number(BigInt(user.id) % 5n);
  return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}

export function UserPill({
  user,
  onLogout,
}: {
  user: User;
  onLogout: () => void;
}) {
  const displayName = user.globalName ?? user.username;
  const isDev = DEV_USER_IDS.has(user.id);

  return (
    <div
      style={{
        display: 'inline-flex',
        gap: 10,
        alignItems: 'center',
        padding: '4px 4px 4px 4px',
        borderRadius: 'var(--radius-pill)',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        fontSize: 14,
      }}
    >
      <img
        src={avatarUrl(user)}
        alt=""
        width={28}
        height={28}
        style={{ borderRadius: '50%' }}
      />
      <span>{displayName}</span>
      {user.isHomeMember && (
        <span
          className="ntts-badge"
          title="Verified member of the No Text To Speach Discord community"
        >
          NTTS
        </span>
      )}
      {isDev && <DevBadge />}
      <button
        type="button"
        onClick={onLogout}
        style={{
          background: 'transparent',
          border: 'none',
          padding: '4px 10px',
          fontSize: 13,
          color: 'var(--color-text-muted)',
          borderRadius: 'var(--radius-pill)',
        }}
      >
        Log out
      </button>
    </div>
  );
}
