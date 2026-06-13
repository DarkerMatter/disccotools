import { Link } from 'react-router-dom';
import { logout } from '../api/client.js';
import { LoginButton } from '../auth/LoginButton.js';
import { UserPill } from '../auth/UserPill.js';
import { useUser } from '../auth/useUser.js';
import { SiteFooter } from '../SiteFooter.js';
import { ThemeToggle } from '../theme/ThemeToggle.js';
import { TopTabs } from '../TopTabs.js';

const UPDATED = 'June 13, 2026';

export function TermsPage() {
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
        <h1>Terms of Service</h1>
        <p className="legal-page__updated">Last updated: {UPDATED}</p>

        <h2>1. About this service</h2>
        <p>
          Disccotools is a free, open-source Discord role-icon editor maintained for the No
          Text To Speech community. It runs in your browser at tools.dimitri.one and is operated
          by Dimitri (<a href="https://dimitri.one" target="_blank" rel="noopener noreferrer">https://dimitri.one</a>).
        </p>

        <h2>2. Acceptable use</h2>
        <ul>
          <li>Don't use the service to harass anyone, distribute malware, or violate Discord's Terms of Service.</li>
          <li>Don't brute-force the API, abuse the upload endpoints, or scrape the service.</li>
          <li>Don't impersonate other users.</li>
          <li>If you do any of the above, we reserve the right to delete your saves, revoke your session, and ban your Discord account from the service.</li>
        </ul>

        <h2>3. Your content</h2>
        <ul>
          <li>Designs you create belong to you. We store the recipe JSON in our database so you can come back to them.</li>
          <li>Custom images you upload belong to you. We store them so we can render your designs.</li>
          <li>We don't claim any rights over your content, and we don't share it with anyone.</li>
          <li>You can delete any save or asset at any time from the Icons or Images tabs.</li>
        </ul>

        <h2>4. Image scanning and mandatory reporting</h2>
        <p>
          Every image uploaded to disccotools is automatically scanned with{' '}
          <a
            href="https://developers.cloudflare.com/cache/reference/csam-scanning/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Cloudflare's CSAM Scanning Tool
          </a>{' '}
          against the hash list maintained by the National Center for Missing &amp; Exploited
          Children (NCMEC) and partner organisations. We have no way to turn this off for
          individual users nor do we want to.
        </p>
        <ul>
          <li>
            If an upload matches a known CSAM hash, Cloudflare blocks the request and notifies
            the maintainer.
          </li>
          <li>
            A CyberTipline report is filed with NCMEC, which forwards reports to U.S. federal
            law enforcement, as required by U.S. law (18 U.S.C. § 2258A).
          </li>
          <li>
            The offending upload, your account record, and any associated metadata (Discord
            user ID, upload timestamps, request data) are preserved and disclosed to law
            enforcement to the extent required to support the investigation.
          </li>
          <li>
            The associated account will be banned immediately and permanently.
          </li>
        </ul>
        <p>
          Uploading or attempting to upload child sexual abuse material is illegal. Do not use
          this service to do it.
        </p>

        <h2>5. Discord OAuth</h2>
        <p>
          To save designs or upload images, you need to sign in with Discord. We use the OAuth
          scope <code>identify</code> to confirm your identity. We don't read your messages,
          voice channels, DMs, or your server list. See Discord's privacy policy at{' '}
          <a href="https://discord.com/privacy" target="_blank" rel="noopener noreferrer">discord.com/privacy</a>{' '}
          for how Discord handles your data.
        </p>

        <h2>6. No warranty</h2>
        <p>
          This service is provided "as is" without any warranty of any kind, express or implied.
          The maintainer is not liable for any data loss, downtime, or other damages arising
          from your use of the service. Save your important designs locally too.
        </p>

        <h2>7. Open source</h2>
        <p>
          The source code lives at{' '}
          <a href="https://github.com/DarkerMatter/disccotools" target="_blank" rel="noopener noreferrer">
            github.com/DarkerMatter/disccotools
          </a>
          . You're welcome to read it, fork it, or open a pull request.
        </p>

        <h2>8. Changes</h2>
        <p>
          If these terms change, the "Last updated" date above changes too. Continued use after a
          change means you accept the new terms.
        </p>

        <h2>9. Contact</h2>
        <p>
          Reach the maintainer at{' '}
          <a href="mailto:fwd@dimitri.one">fwd@dimitri.one</a>.
        </p>
      </article>

      <SiteFooter />
    </main>
  );
}
