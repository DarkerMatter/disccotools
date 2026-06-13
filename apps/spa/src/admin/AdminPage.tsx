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
import { Spinner } from '../Spinner.js';
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

function formatActionLabel(action: string, raw: string | null): string | null {
  if (!raw) return null;
  if (action === 'level_changed' || action === 'banned') {
    const [a, b] = raw.split('|');
    const from = Number(a);
    const to = Number(b);
    if (Number.isInteger(from) && Number.isInteger(to)) {
      return `${levelLabel(from)} → ${levelLabel(to)}`;
    }
  }
  return raw;
}

export function AdminPage() {
  const userState = useUser();
  const [tab, setTab] = useState<Tab>('users');

  async function handleLogout() {
    await logout();
    window.location.reload();
  }

  if (userState.status === 'loading') {
    return (
      <div className="admin-page__loading">
        <Spinner size={20} label="Loading admin panel…" />
      </div>
    );
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
        {users === null && !error && <Spinner size={16} label="Loading users…" />}
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
        <div className="admin-tier-select">
          <select
            aria-label="Permission tier"
            value={detail.user.permLevel}
            onChange={async (e) => {
              const next = Number(e.target.value);
              if (!Number.isFinite(next) || next === detail.user.permLevel) return;
              if (next === PERM_LEVEL.BANNED) {
                // bans need a reason; everything else is silent
                setPending({ kind: 'level', level: next });
                return;
              }
              await setAdminUserPerm(detail.user.id, next);
              await refreshDetail();
            }}
          >
            {[0, 1, 2, 3, 10].map((lvl) => (
              <option key={lvl} value={lvl}>
                {levelLabel(lvl)}
              </option>
            ))}
          </select>
          <p className="admin-tier-select__hint">
            Banning prompts for a reason. Everything else applies immediately.
          </p>
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
            {detail.actions.map((a) => {
              const label = formatActionLabel(a.action, a.targetLabel);
              return (
                <li key={a.id}>
                  <span className="admin-history__when">
                    {new Date(a.createdAt).toLocaleString()}
                  </span>{' '}
                  <strong>{a.action}</strong>
                  {label ? <> · {label}</> : null}
                  {a.reason ? (
                    <>
                      {' '}— <em>{a.reason}</em>
                    </>
                  ) : null}
                </li>
              );
            })}
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
  const [pending, setPending] = useState<
    | { kind: 'single'; id: string; name: string }
    | { kind: 'bulk'; ids: string[] }
    | null
  >(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  async function refresh() {
    setError(null);
    try {
      const res = await listAdminAssets();
      setAssets(res.assets);
      // drop any selections that no longer exist after a refresh
      setSelected((prev) => {
        const ids = new Set(res.assets.map((a) => a.id));
        const next = new Set<string>();
        for (const id of prev) if (ids.has(id)) next.add(id);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed');
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (!assets) return;
    setSelected(new Set(assets.map((a) => a.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  const allSelected = assets !== null && assets.length > 0 && selected.size === assets.length;

  return (
    <div className="admin-panel">
      <p className="admin-help">
        All uploaded images across the platform, newest first. Use this to spot
        and remove banned content.
      </p>
      {error && <p className="admin-error">{error}</p>}
      {assets === null && !error && <Spinner size={16} label="Loading images…" />}
      {assets && assets.length === 0 && <p>No uploads yet.</p>}
      {assets && assets.length > 0 && (
        <div className="admin-bulk-bar">
          <label className="admin-bulk-bar__check">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => (allSelected ? clearSelection() : selectAll())}
              aria-label="Select all images"
            />
            <span>
              {selected.size === 0
                ? `Select all (${assets.length})`
                : `${selected.size} selected`}
            </span>
          </label>
          <div className="admin-bulk-bar__actions">
            {selected.size > 0 && (
              <>
                <button
                  type="button"
                  className="cta-button cta-button--secondary"
                  onClick={clearSelection}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="cta-button cta-button--danger"
                  onClick={() =>
                    setPending({ kind: 'bulk', ids: Array.from(selected) })
                  }
                >
                  Delete selected ({selected.size})
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {bulkProgress && (
        <p className="admin-help" role="status">
          Deleting {bulkProgress.done} / {bulkProgress.total}…
        </p>
      )}
      {assets && (
        <ul className="admin-grid-thumbs">
          {assets.map((a) => {
            const isChecked = selected.has(a.id);
            return (
              <li
                key={a.id}
                className={`admin-grid-thumbs__item${isChecked ? ' admin-grid-thumbs__item--checked' : ''}`}
              >
                <label className="admin-grid-thumbs__select">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleOne(a.id)}
                    aria-label={`Select ${a.name}`}
                  />
                </label>
                <img src={a.url} alt={a.name} />
                <span className="admin-grid-thumbs__name">{a.name}</span>
                <span className="admin-grid-thumbs__owner">user: {a.userId}</span>
                <button
                  type="button"
                  className="cta-button cta-button--danger"
                  onClick={() =>
                    setPending({ kind: 'single', id: a.id, name: a.name })
                  }
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {pending?.kind === 'single' && (
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
      {pending?.kind === 'bulk' && (
        <ReasonModal
          title={`Delete ${pending.ids.length} images`}
          description="One reason will be recorded against every selected image. Users see this in their notices banner."
          confirmLabel={`Delete ${pending.ids.length} images`}
          onCancel={() => setPending(null)}
          onConfirm={async (reason) => {
            const ids = pending.ids;
            setPending(null);
            setBulkProgress({ done: 0, total: ids.length });
            for (let i = 0; i < ids.length; i++) {
              try {
                await deleteAdminAsset(ids[i]!, reason);
              } catch {
                // surface the count, swallow individual errors so one bad row
                // doesnt block the rest of the batch
              }
              setBulkProgress({ done: i + 1, total: ids.length });
            }
            setBulkProgress(null);
            clearSelection();
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
      {saves === null && !error && <Spinner size={16} label="Loading saves…" />}
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
      {icons === null && !error && <Spinner size={16} label="Loading pack…" />}
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
