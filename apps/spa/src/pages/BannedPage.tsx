import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchMe } from '../api/client.js';
import { SiteFooter } from '../SiteFooter.js';

export function BannedPage() {
  const [reason, setReason] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetchMe()
      .then((res) => {
        if (res.kind === 'banned') setReason(res.reason);
        setChecked(true);
      })
      .catch(() => setChecked(true));
  }, []);

  return (
    <main className="app-shell" style={{ height: 'auto', overflow: 'visible' }}>
      <header className="app-header">
        <Link to="/" className="app-header__brand">
          <img src="/static/disccotools.png" alt="" className="app-header__logo" />
          disccotools
        </Link>
      </header>
      <article className="legal-page">
        <h1>Account suspended</h1>
        {!checked ? (
          <p>Checking…</p>
        ) : reason ? (
          <>
            <p>
              Your account has been suspended by an admin. The reason given:
            </p>
            <blockquote className="banned-reason">{reason}</blockquote>
            <p>
              If you think this is a mistake, email{' '}
              <a href="mailto:fwd@dimitri.one">fwd@dimitri.one</a>.
            </p>
          </>
        ) : (
          <>
            <p>
              No active suspension found for this session. If you got here by
              accident, you can <Link to="/">go back to the editor</Link>.
            </p>
          </>
        )}
      </article>
      <SiteFooter />
    </main>
  );
}
