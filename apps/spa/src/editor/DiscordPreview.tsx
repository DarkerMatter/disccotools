import { useUser } from '../auth/useUser.js';
import { useRecipeStore } from './useRecipeStore.js';
import { Canvas } from './Canvas.js';

const NOW = '11:23 PM';

function discordAvatarUrl(id: string, hash: string): string {
  // animated avatars start with "a_" — request gif when available, png otherwise
  const ext = hash.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${id}/${hash}.${ext}?size=64`;
}

export function DiscordPreview() {
  const recipe = useRecipeStore((s) => s.recipe);
  const userState = useUser();

  const isAuthed = userState.status === 'authenticated';
  const topName = isAuthed
    ? userState.user.globalName ?? userState.user.username
    : 'Randy';
  const topAvatar =
    isAuthed && userState.user.avatarHash
      ? discordAvatarUrl(userState.user.id, userState.user.avatarHash)
      : null;
  const topMsg = isAuthed
    ? 'Look at my cool role icon from Disccotools'
    : 'disccotools is really cool! Look at my role icon!';
  const bottomMsg = isAuthed
    ? 'yo that goes hard, drop the link'
    : "how do I get one of those? you're so lucky...";

  return (
    <div className="discord-preview" aria-label="Discord preview">
      <DiscordRow
        name={topName}
        avatarUrl={topAvatar}
        recipe={recipe}
        msg={topMsg}
      />
      <DiscordRow
        name="Justin"
        nameModifier="alt"
        avatarModifier="alt"
        recipe={recipe}
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
  recipe,
  msg,
}: {
  name: string;
  nameModifier?: string;
  avatarModifier?: string;
  avatarUrl?: string | null;
  recipe: ReturnType<typeof useRecipeStore.getState>['recipe'];
  msg: string;
}) {
  return (
    <div className="discord-row">
      <div
        className={`discord-row__avatar ${avatarModifier ? `discord-row__avatar--${avatarModifier}` : ''}`}
        aria-hidden="true"
        style={
          avatarUrl
            ? { background: `center/cover no-repeat url(${avatarUrl})` }
            : undefined
        }
      />
      <div className="discord-row__body">
        <div className="discord-row__head">
          <span className={`discord-row__name ${nameModifier ? `discord-row__name--${nameModifier}` : ''}`}>
            {name}
          </span>
          <span className="discord-row__role-icon" aria-hidden="true">
            <Canvas recipe={recipe} displaySize={18} interactive={false} />
          </span>
          <span className="discord-row__time">Today at {NOW}</span>
        </div>
        <p className="discord-row__msg">{msg}</p>
      </div>
    </div>
  );
}
