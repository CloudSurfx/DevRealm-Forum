import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as forumSupabase } from '../../lib/supabase';
import type {
  AdminDatabase,
  AdminRole,
  MemberBanRow,
  ProfileRow,
  ReportRow,
  WarningRow,
  SiteSettingRow,
} from '../../types/admin';

/**
 * \src/lib/supabase.ts\ is aangemaakt zonder Database-generic. Dit is dezelfde
 * client, maar met een strikte view op de tabellen uit src/types/admin.ts.
 */
export const supabase = forumSupabase as unknown as SupabaseClient<AdminDatabase>;

// ---------------------------------------------------------------------------
// Moderatielog
// ---------------------------------------------------------------------------
export type ModerationAction =
  | 'delete'
  | 'edit'
  | 'create'
  | 'pin'
  | 'unpin'
  | 'lock'
  | 'unlock'
  | 'solve'
  | 'unsolve'
  | 'move'
  | 'publish'
  | 'unpublish'
  | 'open'
  | 'close'
  | 'warn'
  | 'ban'
  | 'unban'
  | 'role_change'
  | 'edit_member';

export interface ModerationLogInput {
  moderatorId: string;
  action: ModerationAction;
  targetTable: string;
  targetId: string;
  reason?: string | null;
}

/** Schrijf een moderation-actie weg. Gooit de PostgREST-error bij falen. */
export async function logModerationAction(input: ModerationLogInput): Promise<void> {
  const reason = input.reason?.trim() ?? '';
  const { error } = await supabase.from('moderation_actions').insert({
    moderator_id: input.moderatorId,
    action: input.action,
    target_table: input.targetTable,
    target_id: input.targetId,
    reason: reason.length > 0 ? reason : null,
  });
  if (error) throw error;
}

/**
 * Voer een mutatie uit en log hem daarna. Als alleen het loggen mislukt, krijg
 * je een duidelijke melding dat de wijziging wél is opgeslagen.
 */
export async function mutateAndLog(
  mutation: () => PromiseLike<{ error: unknown }>,
  log: ModerationLogInput
): Promise<void> {
  const { error } = await mutation();
  if (error) throw error;
  try {
    await logModerationAction(log);
  } catch (logError: unknown) {
    const message =
      logError && typeof logError === 'object' && 'message' in logError
        ? String((logError as { message: unknown }).message)
        : 'onbekende fout';
    throw new Error(`Opgeslagen, maar de actie kon niet in het moderatielog: ${message}`);
  }
}

// ---------------------------------------------------------------------------
// Leden: profielen + rollen + schorsingen in één keer
// ---------------------------------------------------------------------------
export type PersonProfile = Pick<
  ProfileRow,
  | 'id'
  | 'username'
  | 'display_name'
  | 'avatar_url'
  | 'avatar_color'
  | 'reputation'
  | 'posts_count'
  | 'badges'
  | 'created_at'
  | 'last_seen'
>;

export interface Person extends PersonProfile {
  role: AdminRole;
  activeBan: MemberBanRow | null;
}

export interface PeopleDirectory {
  list: Person[];
  byId: Map<string, Person>;
  name: (id: string | null | undefined, fallback?: string) => string;
}

export function isBanActive(ban: Pick<MemberBanRow, 'lifted_at' | 'expires_at'>): boolean {
  if (ban.lifted_at) return false;
  if (!ban.expires_at) return true;
  return Date.parse(ban.expires_at) > Date.now();
}

/** Haal alle leden met rol en eventuele actieve schorsing op. */
export async function fetchPeople(): Promise<{ data: PeopleDirectory | null; error: unknown }> {
  const [profiles, roles, bans] = await Promise.all([
    supabase
      .from('profiles')
      .select(
        'id, username, display_name, avatar_url, avatar_color, reputation, posts_count, badges, created_at, last_seen'
      )
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase.from('user_roles').select('user_id, role'),
    supabase
      .from('member_bans')
      .select('*')
      .is('lifted_at', null)
      .order('created_at', { ascending: false }),
  ]);
  if (profiles.error) return { data: null, error: profiles.error };
  if (roles.error) return { data: null, error: roles.error };

  const roleMap = new Map<string, AdminRole>((roles.data ?? []).map((r) => [r.user_id, r.role]));
  const banMap = new Map<string, MemberBanRow>();
  // Ontbreekt de tabel (migratie 0004 nog niet gedraaid)? Dan gewoon geen schorsingen tonen.
  for (const ban of bans.error ? [] : bans.data ?? []) {
    if (isBanActive(ban) && !banMap.has(ban.user_id)) banMap.set(ban.user_id, ban);
  }

  const list: Person[] = (profiles.data ?? []).map((p) => ({
    ...p,
    badges: p.badges ?? [],
    role: roleMap.get(p.id) ?? 'member',
    activeBan: banMap.get(p.id) ?? null,
  }));
  const byId = new Map(list.map((p) => [p.id, p] as const));
  return {
    data: {
      list,
      byId,
      name: (id, fallback = 'Onbekend') => (id ? byId.get(id)?.display_name ?? fallback : fallback),
    },
    error: null,
  };
}

// ---------------------------------------------------------------------------
// Schorsingen
// ---------------------------------------------------------------------------
export const BAN_DURATIONS: { id: string; label: string; hours: number | null }[] = [
  { id: '1h', label: '1 uur', hours: 1 },
  { id: '24h', label: '24 uur', hours: 24 },
  { id: '7d', label: '7 dagen', hours: 24 * 7 },
  { id: '30d', label: '30 dagen', hours: 24 * 30 },
  { id: 'perm', label: 'Permanent', hours: null },
];

/** Schors een lid. Loggen gebeurt automatisch in de database. */
export async function createBan(userId: string, reason: string, hours: number | null): Promise<void> {
  const expiresAt = hours === null ? null : new Date(Date.now() + hours * 3600_000).toISOString();
  const { error } = await supabase
    .from('member_bans')
    .insert({ user_id: userId, reason: reason.trim(), expires_at: expiresAt });
  if (error) throw error;
}

/** Hef een schorsing op. Wie en wanneer vult de database zelf in (en logt het). */
export async function liftBan(banId: string): Promise<void> {
  const { error } = await supabase
    .from('member_bans')
    .update({ lifted_at: new Date().toISOString() })
    .eq('id', banId);
  if (error) throw error;
}

/** Is migratie 0004 al gedraaid? (PostgREST kent de tabel dan niet.) */
export function isMissingTable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: unknown; message?: unknown };
  return (
    e.code === 'PGRST205' ||
    e.code === '42P01' ||
    (typeof e.message === 'string' && e.message.includes('schema cache'))
  );
}

export const MIGRATION_HINT =
  'Draai supabase/migrations/0004_beheer_uitbreiding.sql in de Supabase SQL Editor om dit onderdeel te activeren.';

// ---------------------------------------------------------------------------
// Rapporten (Reports)
// ---------------------------------------------------------------------------
export interface ReportFilters {
  status?: 'open' | 'reviewing' | 'resolved' | 'dismissed' | 'all';
  limit?: number;
}

export async function fetchReports(filters: ReportFilters = {}): Promise<{ data: ReportRow[] | null; error: unknown }> {
  const { status = 'open', limit = 200 } = filters;
  let query = supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (status !== 'all') {
    query = query.eq('status', status);
  }
  const { data, error } = await query;
  return { data: data ?? [], error };
}

export async function resolveReport(reportId: string, resolution: string, dismiss = false): Promise<void> {
  const { error } = await supabase.rpc('admin_resolve_report', {
    report_id: reportId,
    resolution,
    dismiss,
  });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Waarschuwingen (Warnings)
// ---------------------------------------------------------------------------
export async function fetchWarnings(userId: string): Promise<{ data: WarningRow[] | null; error: unknown }> {
  const { data, error } = await supabase.rpc('admin_get_warnings', { target_user_id: userId });
  return { data: data ?? [], error };
}

export async function addWarning(
  userId: string,
  reason: string,
  severity: 'low' | 'medium' | 'high',
  expiresDays: number | null
): Promise<void> {
  const { error } = await supabase.rpc('admin_add_warning', {
    target_user_id: userId,
    reason,
    severity,
    expires_days: expiresDays,
  });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Instellingen (Settings)
// ---------------------------------------------------------------------------
export async function fetchSettings(category?: string): Promise<{ data: SiteSettingRow[] | null; error: unknown }> {
  const { data, error } = await supabase.rpc('admin_get_settings', { category });
  return { data: data ?? [], error };
}

export async function updateSetting(key: string, value: string): Promise<void> {
  const { error } = await supabase.rpc('admin_update_setting', { key, value });
  if (error) throw error;
}

// Default settings for the UI
export const DEFAULT_SETTINGS: { key: string; label: string; description: string; category: string; type: 'string' | 'number' | 'boolean' | 'json'; defaultValue: string }[] = [
  // General
  { key: 'site_name', label: 'Forumnaam', description: 'Naam van het forum zoals getoond in de header', category: 'Algemeen', type: 'string', defaultValue: 'Codex Forum' },
  { key: 'site_description', label: 'Beschrijving', description: 'Korte beschrijving voor SEO en sociale media', category: 'Algemeen', type: 'string', defaultValue: 'Community voor developers' },
  { key: 'maintenance_mode', label: 'Onderhoudsmodus', description: 'Alleen admins kunnen het forum bekijken', category: 'Algemeen', type: 'boolean', defaultValue: 'false' },
  { key: 'registration_enabled', label: 'Registratie open', description: 'Nieuwe leden mogen zich aanmelden', category: 'Algemeen', type: 'boolean', defaultValue: 'true' },
  { key: 'require_email_verification', label: 'E-mail verificatie vereist', description: 'Nieuwe leden moeten hun e-mail bevestigen', category: 'Algemeen', type: 'boolean', defaultValue: 'true' },

  // Topics & Replies
  { key: 'max_topic_title_length', label: 'Max. topic titel lengte', description: 'Maximaal aantal tekens voor een topic titel', category: 'Topics', type: 'number', defaultValue: '140' },
  { key: 'max_reply_length', label: 'Max. reactie lengte', description: 'Maximaal aantal tekens voor een reactie', category: 'Topics', type: 'number', defaultValue: '10000' },
  { key: 'edit_window_minutes', label: 'Bewerk-venster (minuten)', description: 'Hoe lang na plaatsen mag een bericht bewerkt worden (0 = oneindig)', category: 'Topics', type: 'number', defaultValue: '15' },
  { key: 'allow_topic_voting', label: 'Stemmen op topics', description: 'Leden mogen topics up/downvoten', category: 'Topics', type: 'boolean', defaultValue: 'true' },
  { key: 'allow_best_answer', label: 'Beste antwoord markeren', description: 'Topic-starter mag een reactie als beste antwoord markeren', category: 'Topics', type: 'boolean', defaultValue: 'true' },

  // Reputation & Badges
  { key: 'reputation_per_topic', label: 'Reputatie per topic', description: 'Punten voor het aanmaken van een topic', category: 'Reputatie', type: 'number', defaultValue: '10' },
  { key: 'reputation_per_reply', label: 'Reputatie per reactie', description: 'Punten voor het plaatsen van een reactie', category: 'Reputatie', type: 'number', defaultValue: '5' },
  { key: 'reputation_per_like', label: 'Reputatie per like', description: 'Punten wanneer je reactie een like krijgt', category: 'Reputatie', type: 'number', defaultValue: '2' },
  { key: 'reputation_best_answer', label: 'Reputatie voor beste antwoord', description: 'Bonus punten wanneer je reactie geselecteerd wordt als beste antwoord', category: 'Reputatie', type: 'number', defaultValue: '15' },

  // Chat
  { key: 'chat_enabled', label: 'Live chat ingeschakeld', description: 'De live chat tonen op het forum', category: 'Chat', type: 'boolean', defaultValue: 'true' },
  { key: 'chat_message_limit', label: 'Chat bericht limiet', description: 'Maximaal aantal berichten in de chat geschiedenis', category: 'Chat', type: 'number', defaultValue: '200' },
  { key: 'chat_reactions_enabled', label: 'Chat reacties', description: 'Leden mogen reageren op chatberichten met emoji', category: 'Chat', type: 'boolean', defaultValue: 'true' },

  // Gallery
  { key: 'gallery_enabled', label: 'Project galerij', description: 'De project galerij tonen', category: 'Galerij', type: 'boolean', defaultValue: 'true' },
  { key: 'max_projects_per_user', label: 'Max projecten per lid', description: 'Hoeveel projecten een lid maximaal mag delen', category: 'Galerij', type: 'number', defaultValue: '10' },

  // Polls
  { key: 'polls_enabled', label: 'Peilingen', description: 'Peilingen tonen en toestaan', category: 'Peilingen', type: 'boolean', defaultValue: 'true' },

  // Notifications
  { key: 'email_notifications', label: 'E-mail notificaties', description: 'Stuur e-mails voor reacties, mentions, etc.', category: 'Notificaties', type: 'boolean', defaultValue: 'true' },
  { key: 'push_notifications', label: 'Push notificaties', description: 'Stuur browser push notificaties', category: 'Notificaties', type: 'boolean', defaultValue: 'false' },

  // Moderation
  { key: 'auto_lock_days', label: 'Auto-sluiten na dagen', description: 'Topics automatisch sluiten na inactiviteit (0 = uit)', category: 'Moderatie', type: 'number', defaultValue: '365' },
  { key: 'max_warnings_before_ban', label: 'Max waarschuwingen voor schorsing', description: 'Aantal waarschuwingen voordat auto-schorsing triggert (0 = uit)', category: 'Moderatie', type: 'number', defaultValue: '3' },
];
