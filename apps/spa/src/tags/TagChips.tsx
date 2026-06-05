import { useState } from 'react';

const MAX_TAGS = 8;
const MAX_TAG_LEN = 24;

/**
 * A row of tag chips with inline add/remove. Tags are normalized on commit
 * (trim + lowercase) and deduped. Calls `onChange` with the new array; the
 * caller is responsible for persistence.
 */
export function TagChips({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (next: string[]) => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  async function commit() {
    const value = draft.trim().toLowerCase();
    if (!value || value.length > MAX_TAG_LEN) {
      setDraft('');
      setEditing(false);
      return;
    }
    if (tags.includes(value)) {
      setDraft('');
      setEditing(false);
      return;
    }
    const next = [...tags, value].slice(0, MAX_TAGS);
    setDraft('');
    setEditing(false);
    await onChange(next);
  }

  function cancel() {
    setDraft('');
    setEditing(false);
  }

  async function remove(tag: string) {
    const next = tags.filter((t) => t !== tag);
    await onChange(next);
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
      {tags.map((tag) => (
        <span
          key={tag}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 6px 2px 8px',
            background: 'var(--color-accent-bg)',
            color: 'var(--color-accent)',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 500,
            lineHeight: 1.4,
          }}
        >
          {tag}
          <button
            type="button"
            onClick={() => void remove(tag)}
            aria-label={`Remove tag ${tag}`}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '0 2px',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: 12,
              lineHeight: 1,
            }}
          >
            x
          </button>
        </span>
      ))}
      {!editing && tags.length < MAX_TAGS && (
        <button
          type="button"
          onClick={() => {
            setDraft('');
            setEditing(true);
          }}
          style={{
            background: 'transparent',
            border: '1px dashed var(--color-border)',
            color: 'var(--color-text-muted)',
            borderRadius: 999,
            padding: '2px 8px',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          + Tag
        </button>
      )}
      {editing && (
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_TAG_LEN))}
          autoFocus
          aria-label="New tag"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void commit();
            } else if (e.key === 'Escape') {
              cancel();
            }
          }}
          onBlur={() => void commit()}
          maxLength={MAX_TAG_LEN}
          style={{
            padding: '2px 6px',
            fontSize: 11,
            border: '1px solid var(--color-border)',
            borderRadius: 999,
            background: 'var(--color-bg)',
            color: 'var(--color-text)',
            width: 80,
          }}
        />
      )}
    </div>
  );
}
