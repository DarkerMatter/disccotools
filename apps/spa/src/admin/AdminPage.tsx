import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  PERM_LEVEL,
  type AdminAssetRow,
  type AdminCustomIcon,
  type AdminSaveRow,
  type AdminUserDetailResponse,
  type AdminUserSummary,
} from '@disccotools/shared';
import { logout } from '../api/client.js';
import {
  deleteAdminAsset,
  deleteAdminCustomIcon,
  deleteAdminSave,
  deleteAdminUser,
  getAdminUser,
  listAdminAssets,
  listAdminCustomIcons,
  listAdminSaves,
  listAdminUsers,
  setAdminUserPerm,
} from '../api/admin.js';
import { UserPill } from '../auth/UserPill.js';
import { useUser } from '../auth/useUser.js';
import { Canvas } from '../editor/Canvas.js';
import { SiteFooter } from '../SiteFooter.js';
import { ThemeToggle } from '../theme/ThemeToggle.js';
import { ReasonModal } from './ReasonModal.js';

type Tab = 'users' | 'images' | 'saves' | 'pack';

const LEVEL_LABELS: Record<number, string> = {
  0: 'Banned',
  1: 'Basic (5 image cap)',
  2: 'Plus (10 image cap)',
  3: 'Unlimited',
  10: 'Admin',
};

function levelLabel(n: number): string {
  return LEVEL_LABELS[n] ?? `Level ${n}`;
}

export function AdminPage() {
  const userState = useUser();
  const [tab, setTab] = useState<Tab>('users');

  async function handleLogout() {
    await logout();
    window.location.reload();
  }

  if (userState.status === 'loading') {
    return <div className="admin-page__loading">Loading...</div>;
  }
  if (userState.status === 'anonymous' || userState.status === 'banned') {
    return <Navigate to="/" replace />;
  }
  if (userState.permLevel < PERM_LEVEL.ADMIN) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="app-shell" style={{ height: 'auto', overflow: 'visible' }}>
      <header className="app-header">
        <Link to="/" className="app-header__brand">
          <img src="/static/disccotools.png" alt="" className="app-header__logo" />
          disccotools
        </Link>
        <nav className="inline-tabs" aria-label="Admin sections">
          {(['users', 'images', 'saves', 'pack'] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={
                tab === t ? 'inline-tab inline-tab--active' : 'inline-tab'
              }
              onClick={() => setTab(t)}
            >
              {t === 'users' && 'Users'}
              {t === 'images' && 'Images'}
              {t === 'saves' && 'Saves'}
              {t === 'pack' && 'Custom pack'}
            </button>
          ))}
        </nav>
        <nav className="app-header__actions">
          <ThemeToggle />
          <div className="auth-slot">
            <UserPill user={userState.user} onLogout={handleLogout} />
          </div>
        </nav>
      </header>

      <section className="admin-page">
        <h1 className="admin-page__title">Admin panel</h1>
        {tab === 'users' && <UsersTab adminId={userState.user.id} />}
        {tab === 'images' && <ImagesTab />}
        {tab === 'saves' && <SavesTab />}
        {tab === 'pack' && <PackTab />}
      </section>

      <SiteFooter />
    </main>
  );
}

function UsersTab({ adminId }: { adminId: string }) {
  const [users, setUsers] = useState<AdminUserSummary[] | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminUserDetailResponse | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  async function refresh(searchTerm?: string) {
    setError(null);
    try {
      const res = await listAdminUsers(searchTerm);
      setUsers(res.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed');
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function openDetail(id: string) {
    setDetailError(null);
    try {
      const res = await getAdminUser(id);
      setDetail(res);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'failed');
    }
  }

  return (
    <div className="admin-grid">
      <div className="admin-panel">
        <form
          className="admin-search"
          onSubmit={(e) => {
            e.preventDefault();
            refresh(search.trim() || undefined);
          }}
        >
          <input
            type="text"
            placeholder="search by id or username"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="cta-button cta-button--secondary">
            Search
          </button>
        </form>

        {error && <p className="admin-error">{error}</p>}
        {users === null && !error && <p>Loading...</p>}
        {users && users.length === 0 && <p>No users match.</p>}
        {users && users.length > 0 && (
          <ul className="admin-list">
            {users.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  className="admin-list__row"
                  onClick={() => openDetail(u.id)}
                >
                  <span className="admin-list__name">
                    {u.globalName ?? u.username}
                  </span>
                  <span className="admin-list__meta">
                    {levelLabel(u.permLevel)} · {u.assetsCount} img · {u.savesCount} saves
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="admin-panel">
        {detailError && <p className="admin-error">{detailError}</p>}
        {detail ? (
          <UserDetail
            detail={detail}
            adminId={adminId}
            onChanged={(refreshedDetail) => {
              setDetail(refreshedDetail);
              refresh(search.trim() || undefined);
            }}
            onDeleted={() => {
              setDetail(null);
              refresh(search.trim() || undefined);
            }}
          />
        ) : (
          <p className="admin-empty">Pick a user to view their content and history.</p>
        )}
      </div>
    </div>
  );
}

function UserDetail({
  detail,
  adminId,
  onChanged,
  onDeleted,
}: {
  detail: AdminUserDetailResponse;
  adminId: string;
  onChanged: (next: AdminUserDetailResponse) => void;
  onDeleted: () => void;
}) {
  const [pending, setPending] = useState<
    | null
    | { kind: 'level'; level: number }
    | { kind: 'deleteAsset'; id: string; name: string }
    | { kind: 'deleteSave'; id: string; name: string }
    | { kind: 'deleteUser' }
  >(null);

  async function refreshDetail() {
    const next = await getAdminUser(detail.user.id);
    onChanged(next);
  }

  return (
    <>
      <header className="admin-detail__header">
        <h2>{detail.user.globalName ?? detail.user.username}</h2>
        <p className="admin-detail__id">id: {detail.user.id}</p>
        <p>
          Current tier: <strong>{levelLabel(detail.user.permLevel)}</strong>
        </p>
      </header>

      <section className="admin-detail__section">
        <h3>Change tier</h3>
        <div className="admin-level-buttons">
          {[0, 1, 2, 3, 10].map((lvl) => (
            <button
              key={lvl}
              type="button"
              className={
                lvl === detail.user.permLevel
                  ? 'cta-button cta-button--secondary'
                  : 'cta-button cta-button--secondary'
              }
              onClick={() => setPending({ kind: 'level', level: lvl })}
              disabled={lvl === detail.user.permLevel}
            >
              {levelLabel(lvl)}
            </button>
          ))}
        </div>
      </section>

      <section className="admin-detail__section">
        <h3>Images ({detail.assets.length})</h3>
        {detail.assets.length === 0 ? (
          <p className="admin-empty">No uploads.</p>
        ) : (
          <ul className="admin-grid-thumbs">
            {detail.assets.map((a) => (
              <li key={a.id} className="admin-grid-thumbs__item">
                <img src={a.url} alt={a.name} />
                <span>{a.name}</span>
                <button
                  type="button"
                  className="cta-button cta-button--danger"
                  onClick={() =>
                    setPending({
                      kind: 'deleteAsset',
                      id: a.id,
                      name: a.name,
                    })
                  }
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="admin-detail__section">
        <h3>Icons ({detail.saves.length})</h3>
        {detail.saves.length === 0 ? (
          <p className="admin-empty">No saves.</p>
        ) : (
          <ul className="admin-grid-thumbs">
            {detail.saves.map((s) => (
              <li key={s.id} className="admin-grid-thumbs__item">
                <div className="admin-grid-thumbs__canvas">
                  <Canvas recipe={s.recipe} interactive={false} displaySize={120} />
                </div>
                <span className="admin-grid-thumbs__name">{s.name}</span>
                <button
                  type="button"
                  className="cta-button cta-button--danger"
                  onClick={() =>
                    setPending({
                      kind: 'deleteSave',
                      id: s.id,
                      name: s.name,
                    })
                  }
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="admin-detail__section">
        <h3>History</h3>
        {detail.actions.length === 0 ? (
          <p className="admin-empty">No moderation actions.</p>
        ) : (
          <ul className="admin-history">
            {detail.actions.map((a) => (
              <li key={a.id}>
                <span className="admin-history__when">
                  {new Date(a.createdAt).toLocaleString()}
                </span>{' '}
                <strong>{a.action}</strong>
                {a.targetLabel ? <> · {a.targetLabel}</> : null} —{' '}
                <em>{a.reason}</em>
              </li>
            ))}
          </ul>
        )}
      </section>

      {detail.user.id !== adminId && (
        <section className="admin-detail__section admin-detail__danger">
          <h3>Danger zone</h3>
          <p>
            Delete this account entirely. Removes user row, all saves, all
            uploaded images, and the R2 objects behind them. Audit row is kept.
          </p>
          <button
            type="button"
            className="cta-button cta-button--danger"
            onClick={() => setPending({ kind: 'deleteUser' })}
          >
            Delete account
          </button>
        </section>
      )}

      {pending?.kind === 'level' && (
        <ReasonModal
          title={`Set tier to ${levelLabel(pending.level)}`}
          description={
            pending.level === 0
              ? 'Banning the user kills their session and prevents future sign-ins.'
              : 'The user will see this reason in their notices banner on next sign-in.'
          }
          confirmLabel={pending.level === 0 ? 'Ban' : 'Apply'}
          onCancel={() => setPending(null)}
          onConfirm={async (reason) => {
            await setAdminUserPerm(detail.user.id, pending.level, reason);
            setPending(null);
            await refreshDetail();
          }}
        />
      )}
      {pending?.kind === 'deleteAsset' && (
        <ReasonModal
          title={`Delete image "${pending.name}"`}
          description="Removes the R2 object and the D1 row. The user sees this reason."
          confirmLabel="Delete image"
          onCancel={() => setPending(null)}
          onConfirm={async (reason) => {
            await deleteAdminAsset(pending.id, reason);
            setPending(null);
            await refreshDetail();
          }}
        />
      )}
      {pending?.kind === 'deleteSave' && (
        <ReasonModal
          title={`Delete save "${pending.name}"`}
          description="Removes the D1 row. The user sees this reason."
          confirmLabel="Delete save"
          onCancel={() => setPending(null)}
          onConfirm={async (reason) => {
            await deleteAdminSave(pending.id, reason);
            setPending(null);
            await refreshDetail();
          }}
        />
      )}
      {pending?.kind === 'deleteUser' && (
        <ReasonModal
          title={`Delete account "${detail.user.username}"`}
          description="Hard delete: user row, sessions, saves, assets, R2 objects all go. The audit log row stays."
          confirmLabel="Delete account permanently"
          onCancel={() => setPending(null)}
          onConfirm={async (reason) => {
            await deleteAdminUser(detail.user.id, reason);
            setPending(null);
            onDeleted();
          }}
        />
      )}
    </>
  );
}

function ImagesTab() {
  const [assets, setAssets] = useState<AdminAssetRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ id: string; name: string } | null>(null);

  async function refresh() {
    setError(null);
    try {
      const res = await listAdminAssets();
      setAssets(res.assets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed');
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="admin-panel">
      <p className="admin-help">
        All uploaded images across the platform, newest first. Use this to spot
        and remove banned content.
      </p>
      {error && <p className="admin-error">{error}</p>}
      {assets === null && !error && <p>Loading...</p>}
      {assets && assets.length === 0 && <p>No uploads yet.</p>}
      {assets && (
        <ul className="admin-grid-thumbs">
          {assets.map((a) => (
            <li key={a.id} className="admin-grid-thumbs__item">
              <img src={a.url} alt={a.name} />
              <span className="admin-grid-thumbs__name">{a.name}</span>
              <span className="admin-grid-thumbs__owner">user: {a.userId}</span>
              <button
                type="button"
                className="cta-button cta-button--danger"
                onClick={() => setPending({ id: a.id, name: a.name })}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
      {pending && (
        <ReasonModal
          title={`Delete image "${pending.name}"`}
          description="Removes the R2 object and the D1 row. The user sees this reason."
          confirmLabel="Delete image"
          onCancel={() => setPending(null)}
          onConfirm={async (reason) => {
            await deleteAdminAsset(pending.id, reason);
            setPending(null);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

function SavesTab() {
  const [saves, setSaves] = useState<AdminSaveRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ id: string; name: string } | null>(null);

  async function refresh() {
    setError(null);
    try {
      const res = await listAdminSaves();
      setSaves(res.saves);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed');
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="admin-panel">
      <p className="admin-help">
        Every saved design across the platform, most recently updated first.
      </p>
      {error && <p className="admin-error">{error}</p>}
      {saves === null && !error && <p>Loading...</p>}
      {saves && saves.length === 0 && <p>No saves yet.</p>}
      {saves && (
        <ul className="admin-grid-thumbs">
          {saves.map((s) => (
            <li key={s.id} className="admin-grid-thumbs__item">
              <div className="admin-grid-thumbs__canvas">
                <Canvas recipe={s.recipe} interactive={false} displaySize={120} />
              </div>
              <span className="admin-grid-thumbs__name">{s.name}</span>
              <span className="admin-grid-thumbs__owner">user: {s.userId}</span>
              <button
                type="button"
                className="cta-button cta-button--danger"
                onClick={() => setPending({ id: s.id, name: s.name })}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
      {pending && (
        <ReasonModal
          title={`Delete save "${pending.name}"`}
          description="Removes the D1 row. The user sees this reason."
          confirmLabel="Delete save"
          onCancel={() => setPending(null)}
          onConfirm={async (reason) => {
            await deleteAdminSave(pending.id, reason);
            setPending(null);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

function PackTab() {
  const [icons, setIcons] = useState<AdminCustomIcon[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);

  async function refresh() {
    setError(null);
    try {
      const res = await listAdminCustomIcons();
      setIcons(res.icons);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed');
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function performDelete(key: string) {
    await deleteAdminCustomIcon(key);
    setConfirmKey(null);
    await refresh();
  }

  return (
    <div className="admin-panel">
      <p className="admin-help">
        Curated icon pack entries served from R2. No reason is recorded — these
        are global assets, not user content.
      </p>
      {error && <p className="admin-error">{error}</p>}
      {icons === null && !error && <p>Loading...</p>}
      {icons && icons.length === 0 && <p>No custom icons.</p>}
      {icons && (
        <ul className="admin-list">
          {icons.map((i) => (
            <li key={i.key} className="admin-list__row">
              <span>
                <strong>{i.category}/{i.basename}</strong>{' '}
                <span className="admin-list__meta">{i.sizeBytes} bytes</span>
              </span>
              {confirmKey === i.key ? (
                <span className="admin-confirm">
                  <button
                    type="button"
                    className="cta-button cta-button--danger"
                    onClick={() => performDelete(i.key)}
                  >
                    Really delete
                  </button>
                  <button
                    type="button"
                    className="cta-button cta-button--secondary"
                    onClick={() => setConfirmKey(null)}
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className="cta-button cta-button--danger"
                  onClick={() => setConfirmKey(i.key)}
                >
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
