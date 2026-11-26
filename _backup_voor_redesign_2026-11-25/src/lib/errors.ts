/**
 * Zet elke fout (Error, Supabase/PostgREST-fout of string) om naar een leesbare
 * Nederlandse melding. Supabase-fouten zijn gewone objecten (geen `Error`),
 * dus `err instanceof Error` alleen is niet genoeg.
 */
export function describeError(error: unknown, fallback = 'Er is een onverwachte fout opgetreden.'): string {
  if (!error) return fallback;
  if (typeof error === 'string') return friendly(error) ?? error;

  if (typeof error === 'object') {
    const e = error as { message?: unknown; hint?: unknown; status?: unknown };
    const message = typeof e.message === 'string' ? e.message.trim() : '';
    const hint = typeof e.hint === 'string' ? e.hint.trim() : '';
    const known = friendly(message, typeof e.status === 'number' ? e.status : undefined);
    if (known) return known;
    // Korte machinecodes als hint (bijv. "banned", "rate_limited") niet tonen.
    const usefulHint = hint && !/^[a-z_]+$/.test(hint) ? hint : '';
    if (message) return usefulHint ? `${message} — ${usefulHint}` : message;
  }
  return fallback;
}

function friendly(message: string, status?: number): string | null {
  const m = message.toLowerCase();
  if (m.includes('unregistered api key') || m.includes('invalid api key')) {
    return 'De Supabase-sleutel (VITE_SUPABASE_ANON_KEY in .env) wordt geweigerd. Kopieer de huidige publishable key uit Supabase → Project Settings → API Keys en herstart de dev-server.';
  }
  if (m.includes('failed to fetch') || m.includes('networkerror')) {
    return 'Supabase is niet bereikbaar. Controleer je internet en of het project niet gepauzeerd is.';
  }
  const missing = message.match(/could not find the (?:table|function) '?public\.([a-z_]+)/i);
  if (missing) {
    const name = missing[1];
    const migration = name.startsWith('release') || name.startsWith('register_release')
      ? '0005_releases.sql'
      : name === 'member_bans' || name.startsWith('admin_') || name === 'my_active_ban'
        ? '0004_beheer_uitbreiding.sql'
        : 'de nieuwste migratie';
    return `De database mist nog een onderdeel (${name}). Draai supabase/migrations/${migration} in de Supabase SQL Editor.`;
  }
  if (m.includes('bucket not found')) {
    return 'De opslagmap voor releases bestaat nog niet. Draai supabase/migrations/0005_releases.sql in de Supabase SQL Editor.';
  }
  if (m.includes('exceeded the maximum allowed size') || m.includes('payload too large')) {
    return 'Dit bestand is te groot. Releases mogen maximaal 25 MB zijn, afbeeldingen 5 MB.';
  }
  if (m.includes('violates foreign key constraint') && m.includes('category')) {
    return 'Deze categorie bestaat nog niet in de database. Draai supabase/migrations/0005_releases.sql in de Supabase SQL Editor.';
  }
  if (status === 401) {
    return 'Supabase weigert de verbinding (401). Controleer de URL en sleutel in .env.';
  }
  return null;
}
