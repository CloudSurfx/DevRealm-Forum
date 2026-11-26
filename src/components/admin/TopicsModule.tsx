import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  CircleDashed,
  Eye,
  Lock,
  LockOpen,
  MessageSquareText,
  Pin,
  PinOff,
  Star,
  Trash2,
} from 'lucide-react';
import type { AdminModuleProps, CategoryRow, ReplyRow, TopicRow } from '../../types/admin';
import { CATEGORIES } from '../../data/forumData';
import { fetchPeople, mutateAndLog, supabase, type PeopleDirectory } from './client';
import {
  AdminCard,
  Button,
  ConfirmDialog,
  Drawer,
  EmptyState,
  ErrorState,
  FilterChips,
  IconButton,
  LoadingState,
  ModuleHeading,
  Pagination,
  Pill,
  SearchInput,
  SelectInput,
  Toolbar,
  cx,
  formatDate,
  formatNumber,
  formatRelative,
  table,
  tone,
  useAdminAction,
  useAdminFetch,
  usePaged,
  useToast,
} from './ui';

type TopicListRow = Pick<
  TopicRow,
  'id' | 'title' | 'category' | 'author_id' | 'author_name' | 'views' | 'pinned' | 'locked' | 'solved' | 'created_at' | 'last_activity'
>;
type StatusFilter = 'all' | 'pinned' | 'locked' | 'solved' | 'open';
type Flag = 'pinned' | 'locked' | 'solved';

interface TopicsData {
  topics: TopicListRow[];
  replyCounts: Map<string, number>;
  categories: Pick<CategoryRow, 'id' | 'name'>[];
  people: PeopleDirectory;
}

const FLAG_ACTIONS: Record<Flag, { on: 'pin' | 'lock' | 'solve'; off: 'unpin' | 'unlock' | 'unsolve'; onText: string; offText: string }> = {
  pinned: { on: 'pin', off: 'unpin', onText: 'vastgemaakt', offText: 'losgemaakt' },
  locked: { on: 'lock', off: 'unlock', onText: 'gesloten', offText: 'heropend' },
  solved: { on: 'solve', off: 'unsolve', onText: 'als opgelost gemarkeerd', offText: 'weer open gezet' },
};

function flagPatch(flag: Flag, value: boolean): Partial<Pick<TopicRow, Flag>> {
  if (flag === 'pinned') return { pinned: value };
  if (flag === 'locked') return { locked: value };
  return { solved: value };
}

export function TopicsModule({ currentUserId, role, refresh, refreshKey, focus, navigate }: AdminModuleProps) {
  const toast = useToast();
  const action = useAdminAction();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [category, setCategory] = useState('all');
  const [openId, setOpenId] = useState<string | null>(focus ?? null);
  const [deleting, setDeleting] = useState<TopicListRow | null>(null);

  const { data, initialLoading, error, reload } = useAdminFetch<TopicsData>(async () => {
    const [topics, replies, categories, people] = await Promise.all([
      supabase
        .from('topics')
        .select('id, title, category, author_id, author_name, views, pinned, locked, solved, created_at, last_activity')
        .order('last_activity', { ascending: false })
        .limit(1000),
      supabase.from('replies').select('topic_id').limit(10000),
      supabase.from('categories').select('id, name').order('sort_order'),
      fetchPeople(),
    ]);
    if (topics.error) return { data: null, error: topics.error };
    if (people.error || !people.data) return { data: null, error: people.error };
    const replyCounts = new Map<string, number>();
    (replies.data ?? []).forEach((r) => replyCounts.set(r.topic_id, (replyCounts.get(r.topic_id) ?? 0) + 1));
    const categoryRows =
      categories.data && categories.data.length > 0
        ? categories.data
        : CATEGORIES.filter((c) => c.id !== 'all').map((c) => ({ id: c.id, name: c.label }));
    return {
      data: { topics: topics.data ?? [], replyCounts, categories: categoryRows, people: people.data },
      error: null,
    };
  }, [refreshKey]);

  useEffect(() => {
    if (focus) setOpenId(focus);
  }, [focus]);

  const topics = useMemo(() => data?.topics ?? [], [data]);
  const categoryName = (id: string) => data?.categories.find((c) => c.id === id)?.name ?? id;

  const counts = useMemo(
    () => ({
      all: topics.length,
      pinned: topics.filter((t) => t.pinned).length,
      locked: topics.filter((t) => t.locked).length,
      solved: topics.filter((t) => t.solved).length,
      open: topics.filter((t) => !t.solved).length,
    }),
    [topics]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return topics.filter((t) => {
      if (status === 'pinned' && !t.pinned) return false;
      if (status === 'locked' && !t.locked) return false;
      if (status === 'solved' && !t.solved) return false;
      if (status === 'open' && t.solved) return false;
      if (category !== 'all' && t.category !== category) return false;
      return !q || t.title.toLowerCase().includes(q) || (t.author_name ?? '').toLowerCase().includes(q);
    });
  }, [topics, query, status, category]);
  const paged = usePaged(filtered, 25, `${query}|${status}|${category}`);

  const toggleFlag = async (topic: TopicListRow, flag: Flag) => {
    const next = !topic[flag];
    const meta = FLAG_ACTIONS[flag];
    const ok = await action.run(() =>
      mutateAndLog(() => supabase.from('topics').update(flagPatch(flag, next)).eq('id', topic.id), {
        moderatorId: currentUserId,
        action: next ? meta.on : meta.off,
        targetTable: 'topics',
        targetId: topic.id,
        reason: topic.title,
      }),
      { toast: true }
    );
    if (ok) {
      toast.success(`“${topic.title}” is ${next ? meta.onText : meta.offText}.`);
      reload();
      refresh();
    }
  };

  const confirmDelete = async (reason: string) => {
    if (!deleting) return;
    const target = deleting;
    const ok = await action.run(() =>
      mutateAndLog(() => supabase.from('topics').delete().eq('id', target.id), {
        moderatorId: currentUserId,
        action: 'delete',
        targetTable: 'topics',
        targetId: target.id,
        reason: `${target.title} — ${reason}`,
      })
    );
    if (ok) {
      setDeleting(null);
      setOpenId(null);
      toast.success(`Topic “${target.title}” is verwijderd.`);
      reload();
      refresh();
    }
  };

  const openTopic = openId ? topics.find((t) => t.id === openId) ?? null : null;

  return (
    <div>
      <ModuleHeading title="Topics" description="Maak topics vast, sluit ze, verplaats ze naar een andere categorie of markeer ze als opgelost." />

      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Zoek op titel of auteur" />
        <SelectInput
          label="Categorie"
          value={category}
          onChange={setCategory}
          options={[{ value: 'all', label: 'Alle categorieën' }, ...(data?.categories ?? []).map((c) => ({ value: c.id, label: c.name }))]}
        />
        <FilterChips
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'Alle', count: counts.all },
            { value: 'open', label: 'Open', count: counts.open },
            { value: 'solved', label: 'Opgelost', count: counts.solved },
            { value: 'pinned', label: 'Vast', count: counts.pinned },
            { value: 'locked', label: 'Gesloten', count: counts.locked },
          ]}
        />
      </Toolbar>

      <AdminCard>
        {error && <ErrorState message={error} onRetry={reload} />}
        {initialLoading && <LoadingState rows={8} />}
        {!initialLoading && !error && filtered.length === 0 && (
          <EmptyState icon={MessageSquareText} message={topics.length ? 'Geen topics gevonden met deze filters.' : 'Nog geen topics.'} />
        )}
        {!initialLoading && !error && data && filtered.length > 0 && (
          <>
            <div className={table.wrap}>
              <table className={cx(table.table, 'min-w-[860px]')}>
                <thead className={table.head}>
                  <tr>
                    <th className={table.th}>Topic</th>
                    <th className={table.th}>Categorie</th>
                    <th className={cx(table.th, 'text-right')}>Reacties</th>
                    <th className={cx(table.th, 'text-right')}>Weergaven</th>
                    <th className={table.th}>Laatste activiteit</th>
                    <th className={cx(table.th, 'text-right')}>Acties</th>
                  </tr>
                </thead>
                <tbody className={table.body}>
                  {paged.pageItems.map((topic) => (
                    <tr key={topic.id} className={table.row}>
                      <td className={cx(table.td, 'max-w-[320px]')}>
                        <button type="button" onClick={() => setOpenId(topic.id)} className="text-left w-full cursor-pointer group">
                          <span className={cx('text-sm font-semibold flex items-center gap-1.5 group-hover:text-[#a88bfa] transition-colors', tone.strong)}>
                            {topic.pinned && <Pin className="w-3.5 h-3.5 text-[#a88bfa] shrink-0" />}
                            {topic.locked && <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                            {topic.solved && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                            <span className="truncate">{topic.title}</span>
                          </span>
                          <span className={cx('text-xs', tone.muted)}>
                            door {data.people.name(topic.author_id, topic.author_name ?? 'onbekend')} · {formatRelative(topic.created_at)}
                          </span>
                        </button>
                      </td>
                      <td className={table.td}>
                        <Pill tone="accent">{categoryName(topic.category)}</Pill>
                      </td>
                      <td className={cx(table.td, 'text-right text-sm tabular-nums', tone.body)}>
                        {formatNumber(data.replyCounts.get(topic.id) ?? 0)}
                      </td>
                      <td className={cx(table.td, 'text-right text-sm tabular-nums', tone.body)}>{formatNumber(topic.views)}</td>
                      <td className={cx(table.td, 'text-xs whitespace-nowrap', tone.muted)}>{formatRelative(topic.last_activity)}</td>
                      <td className={table.td}>
                        <div className="flex items-center justify-end gap-0.5">
                          <IconButton
                            label={topic.pinned ? 'Losmaken' : 'Vastmaken'}
                            icon={topic.pinned ? PinOff : Pin}
                            tone="accent"
                            active={topic.pinned}
                            disabled={action.busy}
                            onClick={() => void toggleFlag(topic, 'pinned')}
                          />
                          <IconButton
                            label={topic.locked ? 'Heropenen' : 'Sluiten'}
                            icon={topic.locked ? LockOpen : Lock}
                            tone="amber"
                            active={topic.locked}
                            disabled={action.busy}
                            onClick={() => void toggleFlag(topic, 'locked')}
                          />
                          <IconButton
                            label={topic.solved ? 'Weer open zetten' : 'Markeer als opgelost'}
                            icon={topic.solved ? CircleDashed : CheckCircle2}
                            tone="emerald"
                            active={topic.solved}
                            disabled={action.busy}
                            onClick={() => void toggleFlag(topic, 'solved')}
                          />
                          {role === 'admin' && (
                            <IconButton
                              label="Verwijderen"
                              icon={Trash2}
                              tone="rose"
                              disabled={action.busy}
                              onClick={() => {
                                action.clearError();
                                setDeleting(topic);
                              }}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination {...paged} onChange={paged.setPage} />
          </>
        )}
      </AdminCard>

      {openTopic && data && (
        <TopicDrawer
          topic={openTopic}
          people={data.people}
          categories={data.categories}
          currentUserId={currentUserId}
          role={role}
          onClose={() => setOpenId(null)}
          onToggle={(flag) => void toggleFlag(openTopic, flag)}
          onDelete={() => setDeleting(openTopic)}
          onChanged={() => {
            reload();
            refresh();
          }}
          onOpenMember={(id) => navigate('members', id)}
          busy={action.busy}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Topic verwijderen?"
        message={deleting ? `“${deleting.title}” en alle reacties worden definitief verwijderd.` : ''}
        confirmLabel="Definitief verwijderen"
        danger
        requireReason
        busy={action.busy}
        error={action.error}
        onConfirm={(reason) => void confirmDelete(reason)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detailpaneel van één topic, met reacties
// ---------------------------------------------------------------------------
type ReplyListRow = Pick<ReplyRow, 'id' | 'author_id' | 'author_name' | 'body' | 'is_best_answer' | 'created_at'>;

function TopicDrawer({
  topic,
  people,
  categories,
  currentUserId,
  role,
  onClose,
  onToggle,
  onDelete,
  onChanged,
  onOpenMember,
  busy,
}: {
  topic: TopicListRow;
  people: PeopleDirectory;
  categories: Pick<CategoryRow, 'id' | 'name'>[];
  currentUserId: string;
  role: AdminModuleProps['role'];
  onClose: () => void;
  onToggle: (flag: Flag) => void;
  onDelete: () => void;
  onChanged: () => void;
  onOpenMember: (id: string) => void;
  busy: boolean;
}) {
  const toast = useToast();
  const action = useAdminAction();
  const [moveTo, setMoveTo] = useState(topic.category);
  const [deletingReply, setDeletingReply] = useState<ReplyListRow | null>(null);

  useEffect(() => setMoveTo(topic.category), [topic.category]);

  const { data, initialLoading, error, reload } = useAdminFetch<{ body: string; replies: ReplyListRow[] }>(async () => {
    const [full, replies] = await Promise.all([
      supabase.from('topics').select('body').eq('id', topic.id).maybeSingle(),
      supabase
        .from('replies')
        .select('id, author_id, author_name, body, is_best_answer, created_at')
        .eq('topic_id', topic.id)
        .order('created_at', { ascending: true }),
    ]);
    if (full.error) return { data: null, error: full.error };
    if (replies.error) return { data: null, error: replies.error };
    return { data: { body: full.data?.body ?? '', replies: replies.data ?? [] }, error: null };
  }, [topic.id]);

  const move = async () => {
    const ok = await action.run(() =>
      mutateAndLog(() => supabase.from('topics').update({ category: moveTo }).eq('id', topic.id), {
        moderatorId: currentUserId,
        action: 'move',
        targetTable: 'topics',
        targetId: topic.id,
        reason: `${topic.title}: ${categories.find((c) => c.id === topic.category)?.name ?? topic.category} → ${categories.find((c) => c.id === moveTo)?.name ?? moveTo}`,
      }),
      { toast: true }
    );
    if (ok) {
      toast.success('Topic verplaatst.');
      onChanged();
    }
  };

  const deleteReply = async (reason: string) => {
    if (!deletingReply) return;
    const target = deletingReply;
    const ok = await action.run(() =>
      mutateAndLog(() => supabase.from('replies').delete().eq('id', target.id), {
        moderatorId: currentUserId,
        action: 'delete',
        targetTable: 'replies',
        targetId: target.id,
        reason: `Reactie in “${topic.title}” — ${reason}`,
      })
    );
    if (ok) {
      setDeletingReply(null);
      toast.success('Reactie verwijderd.');
      reload();
      onChanged();
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={topic.title}
      subtitle={
        <>
          door{' '}
          <button type="button" className="underline cursor-pointer" onClick={() => topic.author_id && onOpenMember(topic.author_id)}>
            {people.name(topic.author_id, topic.author_name ?? 'onbekend')}
          </button>{' '}
          · {formatDate(topic.created_at)} · <Eye className="inline w-3 h-3" /> {formatNumber(topic.views)}
        </>
      }
      footer={
        role === 'admin' ? (
          <Button variant="danger" icon={Trash2} onClick={onDelete}>
            Topic verwijderen
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-wrap gap-2">
        <Button size="sm" icon={topic.pinned ? PinOff : Pin} disabled={busy} onClick={() => onToggle('pinned')}>
          {topic.pinned ? 'Losmaken' : 'Vastmaken'}
        </Button>
        <Button size="sm" icon={topic.locked ? LockOpen : Lock} disabled={busy} onClick={() => onToggle('locked')}>
          {topic.locked ? 'Heropenen' : 'Sluiten'}
        </Button>
        <Button size="sm" icon={topic.solved ? CircleDashed : CheckCircle2} disabled={busy} onClick={() => onToggle('solved')}>
          {topic.solved ? 'Weer open zetten' : 'Opgelost'}
        </Button>
      </div>

      <section>
        <h3 className={cx('text-sm font-bold mb-2', tone.strong)}>Categorie</h3>
        <div className="flex gap-2">
          <SelectInput
            label="Verplaats naar categorie"
            value={moveTo}
            onChange={setMoveTo}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            className="flex-1"
          />
          <Button variant="primary" disabled={moveTo === topic.category} loading={action.busy} onClick={() => void move()}>
            Verplaatsen
          </Button>
        </div>
      </section>

      <section>
        <h3 className={cx('text-sm font-bold mb-2', tone.strong)}>Bericht</h3>
        {error && <ErrorState message={error} onRetry={reload} />}
        {initialLoading ? (
          <LoadingState rows={2} />
        ) : (
          <div className={cx('rounded-lg p-4 text-sm whitespace-pre-wrap break-words max-h-64 overflow-y-auto', tone.sunken, tone.body)}>
            {data?.body || <span className={tone.faint}>Geen tekst.</span>}
          </div>
        )}
      </section>

      <section>
        <h3 className={cx('text-sm font-bold mb-2', tone.strong)}>Reacties ({data?.replies.length ?? '…'})</h3>
        {data && data.replies.length === 0 && <p className={cx('text-sm', tone.muted)}>Nog geen reacties.</p>}
        <ul className="space-y-2">
          {data?.replies.map((reply) => (
            <li key={reply.id} className={cx('rounded-lg border p-3', reply.is_best_answer ? 'border-emerald-500/40 bg-emerald-500/[0.04]' : tone.border)}>
              <div className="flex items-start justify-between gap-2">
                <p className={cx('text-xs', tone.muted)}>
                  <span className={cx('font-semibold', tone.strong)}>{people.name(reply.author_id, reply.author_name ?? 'onbekend')}</span> ·{' '}
                  {formatRelative(reply.created_at)}
                  {reply.is_best_answer && (
                    <span className="ml-2 inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <Star className="w-3 h-3" /> Beste antwoord
                    </span>
                  )}
                </p>
                {role === 'admin' && (
                  <IconButton label="Reactie verwijderen" icon={Trash2} tone="rose" onClick={() => setDeletingReply(reply)} />
                )}
              </div>
              <p className={cx('text-sm mt-1 whitespace-pre-wrap break-words line-clamp-6', tone.body)}>{reply.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <ConfirmDialog
        open={!!deletingReply}
        title="Reactie verwijderen?"
        message="De reactie wordt definitief verwijderd."
        confirmLabel="Verwijderen"
        danger
        requireReason
        busy={action.busy}
        error={action.error}
        onConfirm={(reason) => void deleteReply(reason)}
        onCancel={() => setDeletingReply(null)}
      />
    </Drawer>
  );
}
