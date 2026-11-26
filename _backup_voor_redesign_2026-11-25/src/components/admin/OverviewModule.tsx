import {
  Activity,
  ArrowRight,
  Ban,
  ClipboardList,
  MessageCircle,
  MessageSquareText,
  Newspaper,
  Reply,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react';
import type { ActivityRow, AdminModuleProps, ModerationActionRow } from '../../types/admin';
import { fetchPeople, isMissingTable, supabase, type PeopleDirectory } from './client';
import { ACTION_LABELS } from './ModerationLogModule';
import {
  AdminCard,
  Avatar,
  Button,
  CardTitle,
  ErrorState,
  LoadingState,
  ModuleHeading,
  Pill,
  RoleBadge,
  StackedBarChart,
  StatCard,
  cx,
  formatNumber,
  formatRelative,
  tone,
  useAdminFetch,
} from './ui';

interface OverviewData {
  people: PeopleDirectory;
  counts: {
    topics: number;
    replies: number;
    chat: number;
    newsPublished: number;
    newsDrafts: number;
    lockedTopics: number;
    activeBans: number;
  };
  activity: ActivityRow[] | null;
  recentActions: ModerationActionRow[];
}

const SERIES = [
  { key: 'topics', label: 'Topics', color: '#a88bfa' },
  { key: 'replies', label: 'Reacties', color: '#34d399' },
  { key: 'chat', label: 'Chat', color: '#38bdf8' },
];

function sum(rows: ActivityRow[] | null, key: keyof Omit<ActivityRow, 'day'>, lastDays = 7): number {
  if (!rows) return 0;
  return rows.slice(-lastDays).reduce((total, row) => total + Number(row[key] ?? 0), 0);
}

export function OverviewModule({ role, refreshKey, navigate }: AdminModuleProps) {
  const { data, initialLoading, error, reload } = useAdminFetch<OverviewData>(async () => {
    const [people, topics, replies, chat, newsPublished, newsDrafts, lockedTopics, bans, activity, actions] =
      await Promise.all([
        fetchPeople(),
        supabase.from('topics').select('*', { count: 'exact', head: true }),
        supabase.from('replies').select('*', { count: 'exact', head: true }),
        supabase.from('chat_messages').select('*', { count: 'exact', head: true }),
        supabase.from('news').select('*', { count: 'exact', head: true }).eq('published', true),
        supabase.from('news').select('*', { count: 'exact', head: true }).eq('published', false),
        supabase.from('topics').select('*', { count: 'exact', head: true }).eq('locked', true),
        supabase.from('member_bans').select('id, expires_at, lifted_at').is('lifted_at', null),
        supabase.rpc('admin_activity', { days: 14 }),
        supabase
          .from('moderation_actions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(6),
      ]);

    const firstError = people.error ?? topics.error ?? replies.error ?? chat.error ?? newsPublished.error ?? actions.error;
    if (firstError || !people.data) return { data: null, error: firstError };

    const activeBans = bans.error
      ? 0
      : (bans.data ?? []).filter((b) => !b.expires_at || Date.parse(b.expires_at) > Date.now()).length;

    return {
      data: {
        people: people.data,
        counts: {
          topics: topics.count ?? 0,
          replies: replies.count ?? 0,
          chat: chat.count ?? 0,
          newsPublished: newsPublished.count ?? 0,
          newsDrafts: newsDrafts.count ?? 0,
          lockedTopics: lockedTopics.count ?? 0,
          activeBans,
        },
        // admin_activity bestaat pas na migratie 0004; zonder die functie geen grafiek.
        activity: activity.error && isMissingTable(activity.error) ? null : (activity.data ?? null),
        recentActions: actions.data ?? [],
      },
      error: null,
    };
  }, [refreshKey]);

  if (initialLoading) {
    return (
      <div>
        <ModuleHeading title="Overzicht" description="Even alles ophalen…" />
        <AdminCard>
          <LoadingState rows={6} />
        </AdminCard>
      </div>
    );
  }
  if (error || !data) return <ErrorState message={error ?? 'Geen gegevens.'} onRetry={reload} />;

  const { people, counts, activity } = data;
  const members = people.list;
  const newMembers7 = members.filter((m) => Date.now() - Date.parse(m.created_at) < 7 * 86400_000).length;
  const spark = (key: keyof Omit<ActivityRow, 'day'>) => activity?.map((row) => Number(row[key] ?? 0));
  const topContributors = [...members].sort((a, b) => b.reputation - a.reputation).slice(0, 5);
  const newest = members.slice(0, 5);
  const dayLabel = (index: number) => {
    if (!activity) return '';
    const date = new Date(`${activity[index].day}T12:00:00`);
    return index % 2 === 0 || activity.length <= 7 ? String(date.getDate()) : '';
  };

  return (
    <div>
      <ModuleHeading
        title="Overzicht"
        description={`Welkom terug. Dit gebeurt er op je forum · je bent ingelogd als ${role === 'admin' ? 'admin' : 'moderator'}.`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Leden"
          value={members.length}
          icon={Users}
          hint={`+${newMembers7} deze week`}
          spark={spark('signups')}
          onClick={() => navigate('members')}
        />
        <StatCard
          label="Topics"
          value={counts.topics}
          icon={MessageSquareText}
          accent="text-[#a88bfa]"
          hint={activity ? `+${sum(activity, 'topics')} deze week` : undefined}
          spark={spark('topics')}
          onClick={() => navigate('topics')}
        />
        <StatCard
          label="Reacties"
          value={counts.replies}
          icon={Reply}
          accent="text-emerald-400"
          hint={activity ? `+${sum(activity, 'replies')} deze week` : undefined}
          spark={spark('replies')}
          onClick={() => navigate('topics')}
        />
        <StatCard
          label="Chatberichten"
          value={counts.chat}
          icon={MessageCircle}
          accent="text-sky-400"
          hint={activity ? `+${sum(activity, 'chat')} deze week` : undefined}
          spark={spark('chat')}
          onClick={() => navigate('chat')}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-3 mt-3">
        <AdminCard className="lg:col-span-2">
          <CardTitle icon={Activity} title="Activiteit · laatste 14 dagen" />
          {activity ? (
            <StackedBarChart
              data={activity.map((row) => ({
                label: new Date(`${row.day}T12:00:00`).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }),
                values: { topics: Number(row.topics), replies: Number(row.replies), chat: Number(row.chat) },
              }))}
              series={SERIES}
              labelFor={dayLabel}
            />
          ) : (
            <p className={cx('text-sm', tone.muted)}>
              Draai migratie <code className="font-mono text-[#a88bfa]">0004_beheer_uitbreiding.sql</code> om de
              activiteitsgrafiek te zien.
            </p>
          )}
        </AdminCard>

        <AdminCard>
          <CardTitle icon={ClipboardList} title="Aandacht nodig" />
          <ul className="space-y-1">
            <AttentionRow
              icon={Ban}
              label="Actieve schorsingen"
              value={counts.activeBans}
              tone={counts.activeBans > 0 ? 'rose' : 'neutral'}
              onClick={() => navigate('bans')}
            />
            <AttentionRow
              icon={Newspaper}
              label="Nieuws in concept"
              value={counts.newsDrafts}
              tone={counts.newsDrafts > 0 ? 'amber' : 'neutral'}
              onClick={() => navigate('news')}
            />
            <AttentionRow
              icon={MessageSquareText}
              label="Gesloten topics"
              value={counts.lockedTopics}
              tone="neutral"
              onClick={() => navigate('topics')}
            />
            <AttentionRow
              icon={Newspaper}
              label="Gepubliceerd nieuws"
              value={counts.newsPublished}
              tone="neutral"
              onClick={() => navigate('news')}
            />
          </ul>
        </AdminCard>
      </div>

      <div className="grid lg:grid-cols-3 gap-3 mt-3">
        <AdminCard>
          <CardTitle
            icon={UserPlus}
            title="Nieuwe leden"
            action={
              <Button size="sm" variant="ghost" onClick={() => navigate('members')}>
                Alle leden
              </Button>
            }
          />
          <PeopleList
            people={newest}
            meta={(p) => formatRelative(p.created_at)}
            onPick={(id) => navigate('members', id)}
            empty="Nog geen leden."
          />
        </AdminCard>

        <AdminCard>
          <CardTitle icon={Trophy} title="Meeste reputatie" />
          <PeopleList
            people={topContributors}
            meta={(p) => `${formatNumber(p.reputation)} rep`}
            onPick={(id) => navigate('members', id)}
            empty="Nog geen leden."
          />
        </AdminCard>

        <AdminCard>
          <CardTitle
            icon={ClipboardList}
            title="Laatste moderatie"
            action={
              <Button size="sm" variant="ghost" onClick={() => navigate('moderation-log')}>
                Log
              </Button>
            }
          />
          {data.recentActions.length === 0 ? (
            <p className={cx('text-sm', tone.muted)}>Nog geen moderatie-acties.</p>
          ) : (
            <ul className="space-y-3">
              {data.recentActions.map((action) => (
                <li key={action.id} className="flex items-start gap-2.5">
                  <Pill tone={ACTION_LABELS[action.action]?.tone ?? 'neutral'}>
                    {ACTION_LABELS[action.action]?.label ?? action.action}
                  </Pill>
                  <div className="min-w-0 flex-1">
                    <p className={cx('text-xs truncate', tone.body)}>
                      {people.name(action.moderator_id)}
                      {action.reason ? ` · ${action.reason}` : ''}
                    </p>
                    <p className={cx('text-[11px]', tone.faint)}>{formatRelative(action.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </div>
    </div>
  );
}

function AttentionRow({
  icon: Icon,
  label,
  value,
  tone: rowTone,
  onClick,
}: {
  icon: typeof Ban;
  label: string;
  value: number;
  tone: 'rose' | 'amber' | 'neutral';
  onClick: () => void;
}) {
  const colors = {
    rose: 'text-rose-500 bg-rose-500/10',
    amber: 'text-amber-500 bg-amber-500/10',
    neutral: 'text-slate-500 dark:text-[#8d87a4] bg-slate-100 dark:bg-white/[0.05]',
  };
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cx('w-full flex items-center gap-3 rounded-lg px-2 py-2 text-left cursor-pointer group', tone.hover)}
      >
        <span className={cx('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', colors[rowTone])}>
          <Icon className="w-4 h-4" />
        </span>
        <span className={cx('text-sm flex-1', tone.body)}>{label}</span>
        <span className={cx('text-sm font-bold tabular-nums', tone.strong)}>{value}</span>
        <ArrowRight className={cx('w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity', tone.faint)} />
      </button>
    </li>
  );
}

function PeopleList({
  people,
  meta,
  onPick,
  empty,
}: {
  people: PeopleDirectory['list'];
  meta: (person: PeopleDirectory['list'][number]) => string;
  onPick: (id: string) => void;
  empty: string;
}) {
  if (people.length === 0) return <p className={cx('text-sm', tone.muted)}>{empty}</p>;
  return (
    <ul className="space-y-1">
      {people.map((person) => (
        <li key={person.id}>
          <button
            type="button"
            onClick={() => onPick(person.id)}
            className={cx('w-full flex items-center gap-3 rounded-lg px-2 py-1.5 text-left cursor-pointer', tone.hover)}
          >
            <Avatar name={person.display_name} url={person.avatar_url} color={person.avatar_color} size="sm" />
            <span className={cx('text-sm font-medium flex-1 truncate', tone.strong)}>{person.display_name}</span>
            {person.role !== 'member' && <RoleBadge role={person.role} />}
            <span className={cx('text-xs tabular-nums shrink-0', tone.muted)}>{meta(person)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
