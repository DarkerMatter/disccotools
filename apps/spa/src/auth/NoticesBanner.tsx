import { useState } from 'react';
import { PERM_LEVEL, type PendingNotice } from '@disccotools/shared';
import { ackNotice } from '../api/client.js';

type Tone = 'red' | 'green' | 'yellow';

type DisplayNotice = {
  id: string;
  tone: Tone;
  title: string;
  body: string | null;
  reason: string | null;
};

function levelMessage(level: number): string {
  if (level === PERM_LEVEL.ADMIN) return 'You now have admin access.';
  if (level >= PERM_LEVEL.UNLIMITED) {
    return 'You now have unlimited image uploads.';
  }
  if (level === PERM_LEVEL.PLUS) {
    return 'You can now upload up to 10 images.';
  }
  if (level === PERM_LEVEL.BASIC) {
    return 'You can now upload up to 5 images.';
  }
  return '';
}

function parseLevelChange(label: string | null): { from: number; to: number } | null {
  if (!label) return null;
  const [a, b] = label.split('|');
  const from = Number(a);
  const to = Number(b);
  if (!Number.isInteger(from) || !Number.isInteger(to)) return null;
  return { from, to };
}

function describe(notice: PendingNotice): DisplayNotice {
  switch (notice.kind) {
    case 'asset_deleted':
      return {
        id: notice.id,
        tone: 'red',
        title: notice.targetLabel
          ? `Image "${notice.targetLabel}" was removed`
          : 'An image was removed from your account',
        body: null,
        reason: notice.reason,
      };
    case 'save_deleted':
      return {
        id: notice.id,
        tone: 'red',
        title: notice.targetLabel
          ? `Icon "${notice.targetLabel}" was removed`
          : 'A saved icon was removed from your account',
        body: null,
        reason: notice.reason,
      };
    case 'account_deleted':
      return {
        id: notice.id,
        tone: 'red',
        title: 'Your account was deleted',
        body: null,
        reason: notice.reason,
      };
    case 'banned':
      return {
        id: notice.id,
        tone: 'red',
        title: 'Your account was banned',
        body: null,
        reason: notice.reason,
      };
    case 'level_changed': {
      const change = parseLevelChange(notice.targetLabel);
      const upgrade = change ? change.to > change.from : true;
      const newLevel = change?.to ?? PERM_LEVEL.BASIC;
      return {
        id: notice.id,
        tone: upgrade ? 'green' : 'yellow',
        title: upgrade ? 'Your account was upgraded' : 'Your account plan changed',
        body: levelMessage(newLevel),
        reason: null,
      };
    }
  }
}

export function NoticesBanner({ notices }: { notices: PendingNotice[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const visible = notices.filter((n) => !dismissed.has(n.id));
  if (visible.length === 0) return null;

  async function handleAck(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    try {
      await ackNotice(id);
    } catch {
      // already gone is fine, leave it dismissed locally
    }
  }

  return (
    <div className="notices-banner" role="alert">
      {visible.map((n) => {
        const d = describe(n);
        return (
          <div
            key={d.id}
            className={`notices-banner__item notices-banner__item--${d.tone}`}
          >
            <div>
              <strong>{d.title}</strong>
              {d.body && <p className="notices-banner__body">{d.body}</p>}
              {d.reason && (
                <p className="notices-banner__reason">Reason: {d.reason}</p>
              )}
            </div>
            <button
              type="button"
              className="cta-button cta-button--secondary notices-banner__ack"
              onClick={() => handleAck(d.id)}
            >
              Got it
            </button>
          </div>
        );
      })}
    </div>
  );
}
