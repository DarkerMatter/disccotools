import { Link } from 'react-router-dom';
import { logout } from '../api/client.js';
import { LoginButton } from '../auth/LoginButton.js';
import { UserPill } from '../auth/UserPill.js';
import { useUser } from '../auth/useUser.js';
import { SiteFooter } from '../SiteFooter.js';
import { ThemeToggle } from '../theme/ThemeToggle.js';
import { TopTabs } from '../TopTabs.js';

const UPDATED = 'June 10, 2026';

export function PrivacyPage() {
  const userState = useUser();

  async function handleLogout() {
    await logout();
    window.location.reload();
  }

  return (
    <main className="app-shell" style={{ height: 'auto', overflow: 'visible' }}>
      <header className="app-header">
        <Link to="/" className="app-header__brand">
          <img src="/static/disccotools.png" alt="" className="app-header__logo" />
          disccotools
        </Link>
        <TopTabs />
        <nav className="app-header__actions">
          <ThemeToggle />
          <div className="auth-slot">
            {userState.status === 'anonymous' && <LoginButton />}
            {userState.status === 'authenticated' && (
              <UserPill user={userState.user} onLogout={handleLogout} />
            )}
          </div>
        </nav>
      </header>

      <article className="legal-page">
        <h1>Privacy Policy</h1>
        <p className="legal-page__updated">Last updated: {UPDATED}</p>

        <h2>1. Short version</h2>
        <p>
          We collect the minimum we need to let you save and download role icons. We don't sell
          your data, we don't run third-party analytics or trackers, and we don't share anything
          with anyone except where it's required to make the service work.
        </p>

        <h2>2. What we collect when you sign in</h2>
        <p>
          When you sign in with Discord, the OAuth scope <code>identify</code> lets us read:
        </p>
        <ul>
          <li>Your Discord user ID (e.g. 519939316898856967)</li>
          <li>Your username and global display name</li>
          <li>Your avatar hash (so we can show your real avatar in the Discord preview)</li>
        </ul>
        <p>
          We store the identity fields in our database alongside a session record so we can keep
          you signed in.
        </p>

        <h2>3. What we collect when you use the editor</h2>
        <ul>
          <li>Designs you save: stored as recipe JSON in Cloudflare D1, scoped to your user ID. As of v2.0.0 we no longer store the rendered PNG; we reconstruct it on the fly from the recipe.</li>
          <li>Custom images you upload: stored in Cloudflare R2, scoped to your user ID. We check the magic bytes to confirm they're real images before accepting them.</li>
          <li>Tags you attach to saves or images.</li>
        </ul>
        <p>That's it. We don't log IP addresses, browser fingerprints, or anything for analytics.</p>

        <h2>4. What we don't collect</h2>
        <ul>
          <li>No third-party analytics (no Google Analytics, no Plausible, nothing).</li>
          <li>No advertising trackers or cookies.</li>
          <li>We don't read your Discord messages, voice channels, or DMs.</li>
        </ul>

        <h2>5. How we use this data</h2>
        <ul>
          <li>To show your designs when you sign in.</li>
          <li>To rate-limit or revoke sessions if abuse happens.</li>
        </ul>

        <h2>6. Where data lives</h2>
        <ul>
          <li><strong>Cloudflare D1</strong> (SQLite at the edge) — user records, save metadata, asset metadata, session records.</li>
          <li><strong>Cloudflare R2</strong> — uploaded image files and the curated custom icon set.</li>
          <li><strong>Cloudflare Workers</strong> handles every request; nothing leaves Cloudflare's network from us.</li>
        </ul>

        <h2>7. Cookies</h2>
        <p>
          We set one cookie called <code>disccotools_session</code> that stores your signed JWT.
          It's HttpOnly, SameSite=Lax, and Secure in production. We don't use any other cookies.
        </p>

        <h2>8. Data retention and deletion</h2>
        <ul>
          <li>Saves and assets: you can delete them anytime from the Icons or Images tabs.</li>
          <li>Account / all data: email{' '}
            <a href="mailto:fwd@dimitri.one">fwd@dimitri.one</a>{' '}
            and the maintainer will wipe your account, sessions, saves, and assets.
          </li>
        </ul>

        <h2>9. Children</h2>
        <p>
          This service isn't directed at children under 13. Don't use it if you're under the age
          permitted by Discord's own Terms of Service in your country.
        </p>

        <h2>10. Changes</h2>
        <p>
          If this policy changes, the "Last updated" date above changes too. Significant changes
          will be mentioned in the No Text To Speech server.
        </p>

        <h2>11. Contact</h2>
        <p>
          For privacy questions or data deletion requests, email{' '}
          <a href="mailto:fwd@dimitri.one">fwd@dimitri.one</a>.
        </p>
      </article>

      <SiteFooter />
    </main>
  );
}
