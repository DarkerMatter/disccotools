export function LoginButton() {
  return (
    <a
      href="/api/auth/login"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--color-accent)',
        color: 'white',
        padding: '8px 14px',
        borderRadius: 'var(--radius-md)',
        fontWeight: 600,
        fontSize: 14,
        transition: 'background-color 120ms ease',
      }}
    >
      Sign in with Discord
    </a>
  );
}
