import { useMemo, useState } from 'react';
import { ClipboardList, Download } from 'lucide-react';
import type { AdminModuleProps, ModerationActionRow } from '../../types/admin';
import { fetchPeople, supabase, type PeopleDirectory } from './client';
import {
  AdminCard,
  Avatar,
  Button,
  EmptyState,
  ErrorState,
  FilterChips,
  LoadingState,
  ModuleHeading,
  Pagination,
  Pill,
  SearchInput,
  SelectInput,
  Toolbar,
  cx,
  formatDate,
  formatRelative,
  table,
  tone,
  useAdminFetch,
  usePaged,
  downloadCsv,
  type PillTone,
} from './ui';

/** Leesbare namen en kleuren voor de acties in het log. */
export const ACTION_LABELS: Record<string, { label: string; tone: PillTone }> = {
  delete: { label: 'Verwijderd', tone: 'rose' },
  edit: { label: 'Bewerkt', tone: 'sky' },
  create: { label: 'Aangemaakt', tone: 'emerald' },
  pin: { label: 'Vastgemaakt', tone: 'accent' },
  pinned: { label: 'Vastgemaakt', tone: 'accent' },
  unpin: { label: 'Losgemaakt', tone: 'neutral' },
  lock: { label: 'Gesloten', tone: 'amber' },
  locked: { label: 'Gesloten', tone: 'amber' },
  unlock: { label: 'Heropend', tone: 'neutral' },
  solve: { label: 'Opgelost', tone: 'emerald' },
  unsolve: { label: 'Weer open', tone: 'neutral' },
  move: { label: 'Verplaatst', tone: 'sky' },
  publish: { label: 'Gepubliceerd', tone: 'emerald' },
  unpublish: { label: 'Offline gehaald', tone: 'neutral' },
  open: { label: 'Geopend', tone: 'emerald' },
  close: { label: 'Gesloten', tone: 'amber' },
  warn: { label: 'Waarschuwing', tone: 'amber' },
  ban: { label: 'Geschorst', tone: 'rose' },
  unban: { label: 'Schorsing opgeheven', tone: 'emerald' },
  role_change: { label: 'Rol gewijzigd', tone: 'accent' },
  edit_member: { label: 'Lid aangepast', tone: 'accent' },
};

const TABLE_LABELS: Record<string, string> = {
  topics: 'Topic',
  replies: 'Reactie',
  news: 'Nieuws',
  chat_messages: 'Chat',
  gallery_projects: 'Galerij',
  polls: 'Peiling',
  profiles: 'Lid',
  user_roles: 'Lid',
};

type Period = 'day' | 'week' | 'month' | 'all';
const PERIOD_MS: Record<Period, number> = { day: 86400_000, week: 7 * 86400_000, month: 30 * 86400_000, all: Infinity };

interface LogData {
  rows: ModerationActionRow[];
  people: PeopleDirectory;
}

export function ModerationLogModule({ refreshKey, navigate }: AdminModuleProps) {
  const [query, setQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [moderator, setModerator] = useState('all');
  const [period, setPeriod] = useState<Period>('all');

  const { data, initialLoading, error, reload } = useAdminFetch<LogData>(async () => {
    const [rows, people] = await Promise.all([
      supabase.from('moderation_actions').select('*').order('created_at', { ascending: false }).limit(2000),
      fetchPeople(),
    ]);
    if (rows.error) return { data: null, error: rows.error };
    if (people.error || !people.data) return { data: null, error: people.error };
    return { data: { rows: rows.data ?? [], people: people.data }, error: null };
  }, [refreshKey]);

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const moderators = useMemo(() => {
    const ids = [...new Set(rows.map((r) => r.moderator_id))];
    return ids.map((id) => ({ value: id, label: data?.people.name(id) ?? id.slice(0, 8) })).sort((a, b) => a.label.localeCompare(b.label, 'nl'));
  }, [rows, data]);
  const actionsPresent = useMemo(() => [...new Set(rows.map((r) => r.action))].sort(), [rows]);

  const targetLabel = (row: ModerationActionRow) => {
    if ((row.target_table === 'profiles' || row.target_table === 'user_roles') && data) {
      return data.people.name(row.target_id, row.target_id.slice(0, 8));
    }
    return TABLE_LABELS[row.target_table] ?? row.target_table;
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const since = Date.now() - PERIOD_MS[period];
    return rows.filter((r) => {
      if (actionFilter !== 'all' && r.action !== actionFilter) return false;
      if (moderator !== 'all' && r.moderator_id !== moderator) return false;
      if (period !== 'all' && Date.parse(r.created_at) < since) return false;
      if (!q) return true;
      return [r.reason ?? '', r.target_id, targetLabel(r), data?.people.name(r.moderator_id) ?? ''].some((v) => v.toLowerCase().includes(q));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, query, actionFilter, moderator, period, data]);
  const paged = usePaged(filtered, 30, `${query}|${actionFilter}|${moderator}|${period}`);

  const exportCsv = () => {
    downloadCsv(`moderatielog-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Tijd', 'Moderator', 'Actie', 'Soort', 'Doel', 'Reden'],
      ...filtered.map((r) => [
        new Date(r.created_at).toLocaleString('nl-NL'),
        data?.people.name(r.moderator_id) ?? r.moderator_id,
        ACTION_LABELS[r.action]?.label ?? r.action,
        TABLE_LABELS[r.target_table] ?? r.target_table,
        targetLabel(r),
        r.reason,
      ]),
    ]);
  };

  return (
    <div>
      <ModuleHeading title="Moderatielog" description="Elke moderatie-actie met wie, wat, wanneer en waarom. Moderators zien het hele log; leden niet.">
        <Button icon={Download} onClick={exportCsv} disabled={filtered.length === 0}>
          Exporteren (CSV)
        </Button>
      </ModuleHeading>

      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Zoek in reden, doel of moderator" />
        <SelectInput
          label="Actie"
          value={actionFilter}
          onChange={setActionFilter}
          options={[{ value: 'all', label: 'Alle acties' }, ...actionsPresent.map((a) => ({ value: a, label: ACTION_LABELS[a]?.label ?? a }))]}
        />
        <SelectInput label="Moderator" value={moderator} onChange={setModerator} options={[{ value: 'all', label: 'Alle moderators' }, ...moderators]} />
        <FilterChips
          label="Periode"
          value={period}
          onChange={setPeriod}
          options={[
            { value: 'day', label: '24 uur' },
            { value: 'week', label: '7 dagen' },
            { value: 'month', label: '30 dagen' },
            { value: 'all', label: 'Alles' },
          ]}
        />
      </Toolbar>

      <AdminCard>
        {error && <ErrorState message={error} onRetry={reload} />}
        {initialLoading && <LoadingState rows={8} />}
        {!initialLoading && !error && filtered.length === 0 && (
          <EmptyState icon={ClipboardList} message={rows.length ? 'Geen acties gevonden met deze filters.' : 'Nog geen moderatie-acties gelogd.'} />
        )}
        {!initialLoading && !error && data && filtered.length > 0 && (
          <>
            <div className={table.wrap}>
              <table className={cx(table.table, 'min-w-[820px]')}>
                <thead className={table.head}>
                  <tr>
                    <th className={table.th}>Wanneer</th>
                    <th className={table.th}>Moderator</th>
                    <th className={table.th}>Actie</th>
                    <th className={table.th}>Doel</th>
                    <th className={table.th}>Reden / details</th>
                  </tr>
                </thead>
                <tbody className={table.body}>
                  {paged.pageItems.map((row) => {
                    const mod = data.people.byId.get(row.moderator_id);
                    const meta = ACTION_LABELS[row.action];
                    const isPerson = row.target_table === 'profiles' || row.target_table === 'user_roles';
                    return (
                      <tr key={row.id} className={cx(table.row, 'align-top')}>
                        <td className={cx(table.td, 'text-xs whitespace-nowrap', tone.muted)} title={formatDate(row.created_at)}>
                          {formatRelative(row.created_at)}
                        </td>
                        <td className={table.td}>
                          <span className="flex items-center gap-2">
                            <Avatar name={mod?.display_name ?? '?'} url={mod?.avatar_url} color={mod?.avatar_color} size="sm" />
                            <span className={cx('text-sm font-medium whitespace-nowrap', tone.strong)}>{data.people.name(row.moderator_id)}</span>
                          </span>
                        </td>
                        <td className={table.td}>
                          <Pill tone={meta?.tone ?? 'neutral'}>{meta?.label ?? row.action}</Pill>
                        </td>
                        <td className={cx(table.td, 'text-xs')}>
                          {isPerson ? (
                            <button type="button" onClick={() => navigate('members', row.target_id)} className="font-semibold text-[#a88bfa] hover:underline cursor-pointer">
                              {targetLabel(row)}
                            </button>
                          ) : row.target_table === 'topics' && row.action !== 'delete' ? (
                            <button type="button" onClick={() => navigate('topics', row.target_id)} className="font-semibold text-[#a88bfa] hover:underline cursor-pointer">
                              {targetLabel(row)}
                            </button>
                          ) : (
                            <span className={cx('font-medium', tone.body)}>{targetLabel(row)}</span>
                          )}
                        </td>
                        <td className={cx(table.td, 'text-sm max-w-[360px] break-words', tone.body)}>
                          {row.reason ?? <span className={tone.faint}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination {...paged} onChange={paged.setPage} />
          </>
        )}
      </AdminCard>
    </div>
  );
}
