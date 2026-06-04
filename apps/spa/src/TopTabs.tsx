import { Link, useLocation } from 'react-router-dom';

type Tab = { to: string; label: string; matches: (pathname: string) => boolean };

const TABS: Tab[] = [
  {
    to: '/editor',
    label: 'Editor',
    matches: (p) => p === '/' || p === '/editor' || p.startsWith('/editor/'),
  },
  {
    to: '/icons',
    label: 'Icons',
    matches: (p) => p === '/icons' || p.startsWith('/icons/'),
  },
  {
    to: '/images',
    label: 'Images',
    matches: (p) => p === '/images' || p.startsWith('/images/'),
  },
];

export function TopTabs() {
  const { pathname } = useLocation();
  return (
    <nav className="inline-tabs" aria-label="Sections">
      {TABS.map((tab) => {
        const active = tab.matches(pathname);
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={active ? 'inline-tab inline-tab--active' : 'inline-tab'}
            aria-current={active ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
