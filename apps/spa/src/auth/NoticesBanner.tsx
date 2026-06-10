import { useState } from 'react';
import type { PendingNotice } from '@disccotools/shared';
import { ackNotice } from '../api/client.js';

const KIND_LABELS: Record<PendingNotice['kind'], string> = {
  asset_deleted: 'An image was removed from your account',
  save_deleted: 'A saved design was removed from your account',
  account_deleted: 'Your account was deleted',
  banned: 'Your account was banned',
  level_changed: 'Your account tier was changed',
};

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
      {visible.map((n) => (
        <div key={n.id} className="notices-banner__item">
          <div>
            <strong>{KIND_LABELS[n.kind]}</strong>
            {n.targetLabel && <span>: {n.targetLabel}</span>}
            <p className="notices-banner__reason">Reason: {n.reason}</p>
          </div>
          <button
            type="button"
            className="cta-button cta-button--secondary notices-banner__ack"
            onClick={() => handleAck(n.id)}
          >
            Got it
          </button>
        </div>
      ))}
    </div>
  );
}
