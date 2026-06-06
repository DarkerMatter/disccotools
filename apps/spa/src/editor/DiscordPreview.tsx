import { useMemo } from 'react';
import { useRecipeStore } from './useRecipeStore.js';
import { iconUrl } from './iconify.js';

// just a faux Discord chat row so you can see how the icon reads at small sizes
const NOW = '11:23 PM';

export function DiscordPreview() {
  const recipe = useRecipeStore((s) => s.recipe);

  // grab a representative top icon-layer for the chip preview (skip text/image)
  const topIcon = useMemo(() => {
    for (let i = recipe.layers.length - 1; i >= 0; i--) {
      const l = recipe.layers[i];
      if (l && l.kind === 'icon') return l;
    }
    return null;
  }, [recipe.layers]);

  const previewColor = useMemo(() => {
    if (!topIcon) return '#a3a3a3';
    if (topIcon.color.kind === 'solid') return topIcon.color.color;
    return topIcon.color.from;
  }, [topIcon]);

  return (
    <div className="discord-preview" aria-label="Discord preview">
      <DiscordRow
        name="Captain Astro"
        nameModifier=""
        iconSrc={topIcon ? iconUrl(topIcon.iconset, topIcon.name, previewColor) : null}
        msg="disccotools is really cool! Look at my role icon!"
      />
      <DiscordRow
        name="Rookie"
        nameModifier="alt"
        avatarModifier="alt"
        iconSrc={topIcon ? iconUrl(topIcon.iconset, topIcon.name, previewColor) : null}
        msg="How can I get the same cool icon? You're so lucky..."
      />
    </div>
  );
}

function DiscordRow({
  name,
  nameModifier,
  avatarModifier,
  iconSrc,
  msg,
}: {
  name: string;
  nameModifier?: string;
  avatarModifier?: string;
  iconSrc: string | null;
  msg: string;
}) {
  return (
    <div className="discord-row">
      <div
        className={`discord-row__avatar ${avatarModifier ? `discord-row__avatar--${avatarModifier}` : ''}`}
        aria-hidden="true"
      />
      <div className="discord-row__body">
        <div className="discord-row__head">
          <span className={`discord-row__name ${nameModifier ? `discord-row__name--${nameModifier}` : ''}`}>
            {name}
          </span>
          {iconSrc && (
            <span className="discord-row__role-icon" aria-hidden="true">
              <img src={iconSrc} alt="" />
            </span>
          )}
          <span className="discord-row__time">Today at {NOW}</span>
        </div>
        <p className="discord-row__msg">{msg}</p>
      </div>
    </div>
  );
}
