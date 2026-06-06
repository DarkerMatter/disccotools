import { useMemo } from 'react';
import { useUser } from '../auth/useUser.js';
import { useRecipeStore } from './useRecipeStore.js';
import { iconUrl } from './iconify.js';

const NOW = '11:23 PM';

function discordAvatarUrl(id: string, hash: string): string {
  // animated avatars start with "a_" — request gif when available, png otherwise
  const ext = hash.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${id}/${hash}.${ext}?size=64`;
}

export function DiscordPreview() {
  const recipe = useRecipeStore((s) => s.recipe);
  const userState = useUser();

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

  const isAuthed = userState.status === 'authenticated';
  const topName = isAuthed
    ? userState.user.globalName ?? userState.user.username
    : 'Captain Astro';
  const topAvatar =
    isAuthed && userState.user.avatarHash
      ? discordAvatarUrl(userState.user.id, userState.user.avatarHash)
      : null;
  const topMsg = isAuthed
    ? 'Look at my cool role icon from Disccotools'
    : 'disccotools is really cool! Look at my role icon!';
  const bottomMsg = isAuthed
    ? 'yo that goes hard, drop the link'
    : "How can I get the same cool icon? You're so lucky...";

  return (
    <div className="discord-preview" aria-label="Discord preview">
      <DiscordRow
        name={topName}
        nameModifier=""
        avatarUrl={topAvatar}
        iconSrc={topIcon ? iconUrl(topIcon.iconset, topIcon.name, previewColor) : null}
        msg={topMsg}
      />
      <DiscordRow
        name="Rookie"
        nameModifier="alt"
        avatarModifier="alt"
        iconSrc={topIcon ? iconUrl(topIcon.iconset, topIcon.name, previewColor) : null}
        msg={bottomMsg}
      />
    </div>
  );
}

function DiscordRow({
  name,
  nameModifier,
  avatarModifier,
  avatarUrl,
  iconSrc,
  msg,
}: {
  name: string;
  nameModifier?: string;
  avatarModifier?: string;
  avatarUrl?: string | null;
  iconSrc: string | null;
  msg: string;
}) {
  return (
    <div className="discord-row">
      <div
        className={`discord-row__avatar ${avatarModifier ? `discord-row__avatar--${avatarModifier}` : ''}`}
        aria-hidden="true"
        style={
          avatarUrl
            ? {
                background: `center/cover no-repeat url(${avatarUrl})`,
              }
            : undefined
        }
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
