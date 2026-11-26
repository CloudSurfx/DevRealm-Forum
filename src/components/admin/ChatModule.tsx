import { useEffect, useMemo, useState } from 'react';
import { Ban, MessageCircle, Radio, Trash2 } from 'lucide-react';
import type { AdminModuleProps, ChatMessageRow } from '../../types/admin';
import { fetchPeople, mutateAndLog, supabase, type PeopleDirectory, type Person } from './client';
import { BanDialog, canBan } from './shared';
import {
  AdminCard,
  Avatar,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  ModuleHeading,
  Pill,
  SearchInput,
  SelectInput,
  Toolbar,
  cx,
  formatDate,
  formatRelative,
  tone,
  useAdminAction,
  useAdminFetch,
  useToast,
} from './ui';

type ChatRow = Pick<ChatMessageRow, 'id' | 'user_id' | 'author_name' | 'body' | 'created_at'>;

const PAGE = 100;

export function ChatModule({ currentUserId, role, refresh, refreshKey, navigate }: AdminModuleProps) {
  const toast = useToast();
  const action = useAdminAction();
  const [limit, setLimit] = useState(PAGE);
  const [query, setQuery] = useState('');
  const [author, setAuthor] = useState('all');
  const [deleting, setDeleting] = useState<ChatRow | null>(null);
  const [banning, setBanning] = useState<Person | null>(null);
  const [live, setLive] = useState<ChatRow[]>([]);
  const [removed, setRemoved] = useState<Set<number>>(new Set());

  const { data, initialLoading, loading, error, reload } = useAdminFetch<{ rows: ChatRow[]; people: PeopleDirectory }>(
    async () => {
      const [chat, people] = await Promise.all([
        supabase
          .from('chat_messages')
          .select('id, user_id, author_name, body, created_at')
          .order('created_at', { ascending: false })
          .limit(limit),
        fetchPeople(),
      ]);
      if (chat.error) return { data: null, error: chat.error };
      if (people.error || !people.data) return { data: null, error: people.error };
      return { data: { rows: chat.data ?? [], people: people.data }, error: null };
    },
    [refreshKey, limit]
  );

  // Nieuwe en verwijderde berichten live verwerken.
  useEffect(() => {
    setLive([]);
    setRemoved(new Set());
  }, [data]);

  useEffect(() => {
    const channel = supabase
      .channel(`admin-chat-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        const row = payload.new as ChatRow;
        setLive((current) => [row, ...current.filter((r) => r.id !== row.id)]);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_messages' }, (payload) => {
        const id = (payload.old as Partial<ChatRow>).id;
        if (typeof id === 'number') setRemoved((current) => new Set(current).add(id));
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const rows = useMemo(() => {
    const base = data?.rows ?? [];
    const known = new Set(base.map((r) => r.id));
    return [...live.filter((r) => !known.has(r.id)), ...base].filter((r) => !removed.has(r.id));
  }, [data, live, removed]);

  const authors = useMemo(() => {
    const ids = new Map<string, string>();
    rows.forEach((r) => {
      if (r.user_id) ids.set(r.user_id, data?.people.name(r.user_id, r.author_name ?? 'Onbekend') ?? 'Onbekend');
    });
    return [...ids.entries()].sort((a, b) => a[1].localeCompare(b[1], 'nl'));
  }, [rows, data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => (author === 'all' || r.user_id === author) && (!q || r.body.toLowerCase().includes(q)));
  }, [rows, query, author]);

  const confirmDelete = async (reason: string) => {
    if (!deleting) return;
    const target = deleting;
    const ok = await action.run(() =>
      mutateAndLog(() => supabase.from('chat_messages').delete().eq('id', target.id), {
        moderatorId: currentUserId,
        action: 'delete',
        targetTable: 'chat_messages',
        targetId: String(target.id),
        reason,
      })
    );
    if (ok) {
      setDeleting(null);
      setRemoved((current) => new Set(current).add(target.id));
      toast.success('Chatbericht verwijderd en gelogd.');
      refresh();
    }
  };

  return (
    <div>
      <ModuleHeading title="Live chat" description="Lees de chat live mee. Verwijder berichten met een reden of schors een lid direct vanuit een bericht.">
        <Pill tone="emerald" icon={Radio}>
          Live
        </Pill>
      </ModuleHeading>

      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Zoek in berichten" />
        <SelectInput
          label="Filter op lid"
          value={author}
          onChange={setAuthor}
          options={[{ value: 'all', label: 'Alle leden' }, ...authors.map(([id, name]) => ({ value: id, label: name }))]}
        />
      </Toolbar>

      <AdminCard padded={false}>
        {error && (
          <div className="p-5">
            <ErrorState message={error} onRetry={reload} />
          </div>
        )}
        {initialLoading && (
          <div className="p-5">
            <LoadingState rows={8} />
          </div>
        )}
        {!initialLoading && !error && filtered.length === 0 && (
          <EmptyState icon={MessageCircle} message={query || author !== 'all' ? 'Geen berichten gevonden.' : 'Nog geen chatberichten.'} />
        )}
        {!initialLoading && !error && data && filtered.length > 0 && (
          <ul className={cx('divide-y', tone.divider)}>
            {filtered.map((message) => {
              const person = message.user_id ? data.people.byId.get(message.user_id) : undefined;
              const name = person?.display_name ?? message.author_name ?? 'Onbekend';
              return (
                <li key={message.id} className={cx('group flex items-start gap-3 px-5 py-3.5', tone.hover)}>
                  <Avatar name={name} url={person?.avatar_url} color={person?.avatar_color} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => person && navigate('members', person.id)}
                        className={cx('text-sm font-semibold hover:underline cursor-pointer', tone.strong)}
                      >
                        {name}
                      </button>
                      {person?.activeBan && <Pill tone="rose">Geschorst</Pill>}
                      <span className={cx('text-[11px]', tone.faint)} title={formatDate(message.created_at)}>
                        {formatRelative(message.created_at)}
                      </span>
                    </div>
                    <p className={cx('mt-0.5 text-sm whitespace-pre-wrap break-words', tone.body)}>{message.body}</p>
                  </div>
                  <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    {person && !person.activeBan && canBan(role, currentUserId, person) && (
                      <IconButton label={`${name} schorsen`} icon={Ban} tone="rose" onClick={() => setBanning(person)} />
                    )}
                    <IconButton
                      label="Bericht verwijderen"
                      icon={Trash2}
                      tone="rose"
                      onClick={() => {
                        action.clearError();
                        setDeleting(message);
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {!initialLoading && !error && (data?.rows.length ?? 0) >= limit && (
          <div className={cx('p-4 border-t text-center', tone.border)}>
            <Button loading={loading} onClick={() => setLimit((current) => current + PAGE)}>
              Oudere berichten laden
            </Button>
          </div>
        )}
      </AdminCard>

      <ConfirmDialog
        open={!!deleting}
        title="Chatbericht verwijderen?"
        message={deleting ? `“${deleting.body.slice(0, 120)}${deleting.body.length > 120 ? '…' : ''}”` : ''}
        confirmLabel="Verwijderen"
        danger
        requireReason
        busy={action.busy}
        error={action.error}
        onConfirm={(reason) => void confirmDelete(reason)}
        onCancel={() => setDeleting(null)}
      />
      <BanDialog
        open={!!banning}
        member={banning}
        viewerRole={role}
        viewerId={currentUserId}
        onClose={() => setBanning(null)}
        onDone={(member) => {
          setBanning(null);
          toast.success(`${member.display_name} is geschorst.`);
          reload();
          refresh();
        }}
      />
    </div>
  );
}
