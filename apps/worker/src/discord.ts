const DISCORD_API = 'https://discord.com/api/v10';

export type DiscordUser = {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
};

export async function exchangeCode(params: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<{ accessToken: string; tokenType: string }> {
  const body = new URLSearchParams({
    client_id: params.clientId,
    client_secret: params.clientSecret,
    grant_type: 'authorization_code',
    code: params.code,
    redirect_uri: params.redirectUri,
  });
  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`discord token exchange failed: ${res.status}`);
  const json = (await res.json()) as { access_token: string; token_type: string };
  return { accessToken: json.access_token, tokenType: json.token_type };
}

export async function fetchMe(accessToken: string): Promise<DiscordUser> {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`discord /users/@me failed: ${res.status}`);
  return (await res.json()) as DiscordUser;
}

/** True if the user is in `guildId`, false on 404. Other non-2xx logs + false. */
export async function fetchIsMember(
  accessToken: string,
  guildId: string,
): Promise<boolean> {
  const res = await fetch(`${DISCORD_API}/users/@me/guilds/${guildId}/member`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 200) return true;
  if (res.status === 404) return false;
  console.warn(`discord member check returned ${res.status} for guild ${guildId}`);
  return false;
}
