import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../theme/ThemeContext.js';
import {
  DEFAULT_PREFIXES,
  browseIcons,
  iconUrl,
  prefixLabel,
  searchIcons,
  type IconHit,
} from './iconify.js';

const DEBOUNCE_MS = 200;
const INITIAL_CHUNK = 200;
const CHUNK_SIZE = 200;

function groupByPrefix(hits: IconHit[]): Map<string, IconHit[]> {
  const map = new Map<string, IconHit[]>();
  for (const hit of hits) {
    const arr = map.get(hit.prefix) ?? [];
    arr.push(hit);
    map.set(hit.prefix, arr);
  }
  return map;
}

export function IconPicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (hit: IconHit) => void;
}) {
  const { theme } = useTheme();
  const previewColor = theme === 'dark' ? '#ffffff' : '#0f172a';
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<IconHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [activePrefix, setActivePrefix] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_CHUNK);
  const inputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    setVisibleCount(INITIAL_CHUNK);
  }, [hits]);

  useEffect(() => {
    if (!open) return;
    if (typeof IntersectionObserver === 'undefined') return;
    if (visibleCount >= hits.length) return;
    const node = sentinelRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisibleCount((c) => Math.min(c + CHUNK_SIZE, hits.length));
          }
        }
      },
      { rootMargin: '200px' },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [open, hits, visibleCount]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      const q = query.trim();
      let result: IconHit[];
      if (q === '') {
        if (activePrefix !== null) {
          result = await browseIcons(activePrefix, { signal: controller.signal });
        } else {
          const lists = await Promise.all(
            DEFAULT_PREFIXES.map((p) =>
              browseIcons(p, { signal: controller.signal }),
            ),
          );
          result = lists.flat();
        }
      } else {
        const opts: { signal: AbortSignal; prefixes?: readonly string[] } = {
          signal: controller.signal,
        };
        if (activePrefix !== null) opts.prefixes = [activePrefix];
        result = await searchIcons(q, opts);
      }
      setHits(result);
      setLoading(false);
    }, DEBOUNCE_MS);
    return () => {
      controller.abort();
      clearTimeout(t);
      setLoading(false);
    };
  }, [open, query, activePrefix]);

  if (!open) return null;

  const grouped = groupByPrefix(hits);
  const orderedPrefixes: string[] = [];
  for (const p of DEFAULT_PREFIXES) {
    if (grouped.has(p)) orderedPrefixes.push(p);
  }
  for (const p of grouped.keys()) {
    if (!orderedPrefixes.includes(p)) orderedPrefixes.push(p);
  }

  const chips: Array<{ key: string; label: string; value: string | null }> = [
    { key: 'all', label: 'All', value: null },
    ...DEFAULT_PREFIXES.map((p) => ({
      key: p,
      label: prefixLabel(p),
      value: p,
    })),
  ];

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))',
    gap: 8,
  };

  function renderIconButton(hit: IconHit) {
    return (
      <button
        key={hit.id}
        type="button"
        aria-label={`Insert ${hit.id}`}
        onClick={() => onSelect(hit)}
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          padding: 8,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // skip painting off-screen icons when the grid is huge; types miss these so we cast
          ['contentVisibility' as never]: 'auto',
          ['containIntrinsicSize' as never]: '56px 56px',
        }}
      >
        <img
          src={iconUrl(hit.prefix, hit.name, previewColor)}
          alt={hit.id}
          width={28}
          height={28}
        />
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Icon picker"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--color-bg)',
          color: 'var(--color-text)',
          width: '100%',
          maxWidth: 720,
          maxHeight: '80vh',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <header
          style={{
            display: 'flex',
            gap: 8,
            padding: 12,
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <input
            ref={inputRef}
            type="text"
            aria-label="Search icons"
            placeholder="Filter icons (e.g. rocket, star)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 10px',
              fontSize: 14,
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
            }}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close icon picker"
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontSize: 13,
            }}
          >
            Close
          </button>
        </header>
        <div
          role="toolbar"
          aria-label="Filter by icon set"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            padding: '8px 12px',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          {chips.map((chip) => {
            const isActive = activePrefix === chip.value;
            return (
              <button
                key={chip.key}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActivePrefix(chip.value)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  background: isActive
                    ? 'var(--color-surface-elev)'
                    : 'var(--color-bg)',
                  color: 'var(--color-text)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: 12,
          }}
        >
          {loading && (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              Searching…
            </p>
          )}
          {!loading && hits.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              No matches. Try another search.
            </p>
          )}
          {!loading && hits.length > 0 && activePrefix !== null && (
            <>
              <div style={gridStyle}>
                {hits.slice(0, visibleCount).map(renderIconButton)}
              </div>
              {visibleCount < hits.length && (
                <div
                  ref={sentinelRef}
                  style={{ height: 1 }}
                  aria-hidden="true"
                />
              )}
            </>
          )}
          {!loading && hits.length > 0 && activePrefix === null && (
            <>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                {(() => {
                  let remaining = visibleCount;
                  return orderedPrefixes.map((prefix) => {
                    const fullList = grouped.get(prefix) ?? [];
                    const take = Math.min(remaining, fullList.length);
                    remaining -= take;
                    const items = fullList.slice(0, take);
                    if (items.length === 0) return null;
                    return (
                      <section key={prefix}>
                        <h3
                          style={{
                            margin: '0 0 8px 0',
                            fontSize: 12,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          {prefixLabel(prefix)}
                        </h3>
                        <div style={gridStyle}>
                          {items.map(renderIconButton)}
                        </div>
                      </section>
                    );
                  });
                })()}
              </div>
              {visibleCount < hits.length && (
                <div
                  ref={sentinelRef}
                  style={{ height: 1 }}
                  aria-hidden="true"
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
