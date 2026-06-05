/**
 * Tag normalization shared by `saves` and `assets`. Tags are stored as a
 * JSON-stringified array of lowercase strings, capped at 8 entries x 24 chars.
 */
export function normalizeTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== 'string') continue;
    const t = raw.trim().toLowerCase();
    if (!t || t.length > 24) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= 8) break;
  }
  return out;
}
