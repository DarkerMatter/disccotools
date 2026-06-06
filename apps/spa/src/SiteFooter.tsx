import { Link } from 'react-router-dom';

const GITHUB_URL = 'https://github.com/DarkerMatter/disccotools';

export function SiteFooter() {
  return (
    <footer className="site-footer" aria-label="Site footer">
      <p className="site-footer__credit">
        Made for the No Text To Speech community by{' '}
        <a href="https://dimitri.one" target="_blank" rel="noopener noreferrer">
          Dimitri
        </a>
      </p>
      <nav className="site-footer__links" aria-label="Site links">
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
        <span aria-hidden="true">·</span>
        <Link to="/terms">Terms</Link>
        <span aria-hidden="true">·</span>
        <Link to="/privacy">Privacy</Link>
      </nav>
    </footer>
  );
}
