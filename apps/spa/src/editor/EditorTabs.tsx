export type EditorTabKey = 'search' | 'shape' | 'icons';

const TABS: { key: EditorTabKey; label: string; icon: string }[] = [
  { key: 'search', label: 'Search Icons', icon: '🔍' },
  { key: 'shape', label: 'Customise Shape', icon: '◆' },
  { key: 'icons', label: 'Customise Icons', icon: '✦' },
];

export function EditorTabs({
  active,
  onChange,
}: {
  active: EditorTabKey;
  onChange: (next: EditorTabKey) => void;
}) {
  return (
    <div role="tablist" aria-label="Editor sections" className="editor-card__tabs">
      {TABS.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`editor-tabpanel-${t.key}`}
            id={`editor-tab-${t.key}`}
            data-tour-id={`editor-tab-${t.key}`}
            onClick={() => onChange(t.key)}
            className={`editor-card__tab ${isActive ? 'editor-card__tab--active' : ''}`}
          >
            <span aria-hidden="true">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
