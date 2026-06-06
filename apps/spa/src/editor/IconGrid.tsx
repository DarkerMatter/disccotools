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

export function IconGrid({
  active = true,
  onSelect,
}: {
  /** when false, no fetches happen — used by modal variant where it stays mounted offscreen */
  active?: boolean;
  onSelect: (hit: IconHit) => void;
}) {
  const { theme } = useTheme();
  const previewColor = theme === 'dark' ? '#ffffff' : '#0f172a';
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<IconHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [activePrefix, setActivePrefix] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_CHUNK);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(INITIAL_CHUNK);
  }, [hits]);

  useEffect(() => {
    if (!active) return;
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
  }, [active, hits, visibleCount]);

  useEffect(() => {
    if (!active) return;
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
  }, [active, query, activePrefix]);

  if (!active) return null;

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
    gridTemplateColumns: 'repeat(auto-fill, minmax(48px, 1fr))',
    gap: 6,
  };

  function renderIconButton(hit: IconHit) {
    return (
      <button
        key={hit.id}
        type="button"
        aria-label={`Insert ${hit.id}`}
        onClick={() => onSelect(hit)}
        style={{
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          padding: 8,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          aspectRatio: '1',
          transition: 'transform 140ms ease, border-color 140ms ease',
          // skip painting off-screen icons when the grid is huge
          ['contentVisibility' as never]: 'auto',
          ['containIntrinsicSize' as never]: '48px 48px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.borderColor = 'var(--color-accent)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = '';
          e.currentTarget.style.borderColor = 'var(--color-border)';
        }}
      >
        <img
          src={iconUrl(hit.prefix, hit.name, previewColor)}
          alt={hit.id}
          width={26}
          height={26}
        />
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, flex: 1 }}>
      <input
        type="text"
        aria-label="Search icons"
        placeholder="Search icons (e.g. rocket, star)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 10px',
          fontSize: 13,
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--color-bg)',
          color: 'var(--color-text)',
        }}
      />
      <div
        role="toolbar"
        aria-label="Filter by icon set"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}
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
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--color-border)',
                background: isActive ? 'var(--color-accent)' : 'var(--color-bg)',
                color: isActive ? 'white' : 'var(--color-text)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background 140ms ease, color 140ms ease',
              }}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {loading && (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Searching…</p>
        )}
        {!loading && hits.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            No matches. Try another search.
          </p>
        )}
        {!loading && hits.length > 0 && activePrefix !== null && (
          <>
            <div style={gridStyle}>{hits.slice(0, visibleCount).map(renderIconButton)}</div>
            {visibleCount < hits.length && (
              <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />
            )}
          </>
        )}
        {!loading && hits.length > 0 && activePrefix === null && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        {prefixLabel(prefix)}
                      </h3>
                      <div style={gridStyle}>{items.map(renderIconButton)}</div>
                    </section>
                  );
                });
              })()}
            </div>
            {visibleCount < hits.length && (
              <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />
            )}
          </>
        )}
      </div>
    </div>
  );
}
