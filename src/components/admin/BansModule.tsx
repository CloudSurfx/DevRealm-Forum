import { useMemo, useState } from 'react';
import { Ban, Undo2 } from 'lucide-react';
import type { AdminModuleProps, MemberBanRow } from '../../types/admin';
import {
  MIGRATION_HINT,
  fetchPeople,
  isBanActive,
  isMissingTable,
  liftBan,
  supabase,
  type PeopleDirectory,
} from './client';
import { BanDialog } from './shared';
import {
  AdminCard,
  Avatar,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FilterChips,
  LoadingState,
  MigrationNotice,
  ModuleHeading,
  Pagination,
  Pill,
  SearchInput,
  Toolbar,
  cx,
  formatDate,
  formatRelative,
  table,
  tone,
  useAdminFetch,
  usePaged,
  useToast,
} from './ui';

type View = 'active' | 'history';

interface BansData {
  bans: MemberBanRow[];
  people: PeopleDirectory;
  missing: boolean;
}

export function BansModule({ currentUserId, role, refresh, refreshKey, navigate }: AdminModuleProps) {
  const toast = useToast();
  const [view, setView] = useState<View>('active');
  const [query, setQuery] = useState('');
  const [banOpen, setBanOpen] = useState(false);
  const [lifting, setLifting] = useState<MemberBanRow | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, initialLoading, error, reload } = useAdminFetch<BansData>(async () => {
    const [bans, people] = await Promise.all([
      supabase.from('member_bans').select('*').order('created_at', { ascending: false }).limit(500),
      fetchPeople(),
    ]);
    if (people.error || !people.data) return { data: null, error: people.error };
    if (bans.error) {
      if (isMissingTable(bans.error)) return { data: { bans: [], people: people.data, missing: true }, error: null };
      return { data: null, error: bans.error };
    }
    return { data: { bans: bans.data ?? [], people: people.data, missing: false }, error: null };
  }, [refreshKey]);

  const active = useMemo(() => (data?.bans ?? []).filter(isBanActive), [data]);
  const history = useMemo(() => (data?.bans ?? []).filter((b) => !isBanActive(b)), [data]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = view === 'active' ? active : history;
    if (!q || !data) return list;
    return list.filter(
      (ban) => data.people.name(ban.user_id).toLowerCase().includes(q) || ban.reason.toLowerCase().includes(q)
    );
  }, [view, active, history, query, data]);
  const paged = usePaged(filtered, 20, `${view}|${query}`);

  const confirmLift = async () => {
    if (!lifting || !data) return;
    setBusy(true);
    try {
      await liftBan(lifting.id);
      toast.success(`Schorsing van ${data.people.name(lifting.user_id)} is opgeheven.`);
      setLifting(null);
      reload();
      refresh();
    } catch (caught: unknown) {
      toast.error(caught);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <ModuleHeading
        title="Schorsingen"
        description="Geschorste leden kunnen meelezen, maar niets plaatsen. Schorsen en opheffen komt automatisch in het moderatielog."
      >
        <Button variant="primary" icon={Ban} onClick={() => setBanOpen(true)} disabled={!data || data.missing}>
          Lid schorsen
        </Button>
      </ModuleHeading>

      {data?.missing ? (
        <MigrationNotice hint={MIGRATION_HINT} />
      ) : (
        <>
          <Toolbar>
            <FilterChips
              label="Weergave"
              value={view}
              onChange={setView}
              options={[
                { value: 'active', label: 'Actief', count: active.length },
                { value: 'history', label: 'Geschiedenis', count: history.length },
              ]}
            />
            <SearchInput value={query} onChange={setQuery} placeholder="Zoek op lid of reden" />
          </Toolbar>

          <AdminCard>
            {error && <ErrorState message={error} onRetry={reload} />}
            {initialLoading && <LoadingState />}
            {!initialLoading && !error && filtered.length === 0 && (
              <EmptyState
                icon={Ban}
                title={view === 'active' ? 'Niemand is geschorst' : 'Nog geen eerdere schorsingen'}
                message={view === 'active' ? 'Fijn! Iedereen houdt zich aan de regels.' : 'Opgeheven en verlopen schorsingen verschijnen hier.'}
              />
            )}
            {!initialLoading && !error && data && filtered.length > 0 && (
              <>
                <div className={table.wrap}>
                  <table className={cx(table.table, 'min-w-[760px]')}>
                    <thead className={table.head}>
                      <tr>
                        <th className={table.th}>Lid</th>
                        <th className={table.th}>Reden</th>
                        <th className={table.th}>Door</th>
                        <th className={table.th}>{view === 'active' ? 'Loopt af' : 'Status'}</th>
                        <th className={cx(table.th, 'text-right')}>Actie</th>
                      </tr>
                    </thead>
                    <tbody className={table.body}>
                      {paged.pageItems.map((ban) => {
                        const person = data.people.byId.get(ban.user_id);
                        return (
                          <tr key={ban.id} className={table.row}>
                            <td className={table.td}>
                              <button
                                type="button"
                                onClick={() => navigate('members', ban.user_id)}
                                className="flex items-center gap-2.5 min-w-0 cursor-pointer text-left"
                              >
                                <Avatar name={person?.display_name ?? '?'} url={person?.avatar_url} color={person?.avatar_color} size="sm" />
                                <span className={cx('text-sm font-semibold truncate hover:underline', tone.strong)}>
                                  {data.people.name(ban.user_id)}
                                </span>
                              </button>
                            </td>
                            <td className={cx(table.td, 'text-sm max-w-[280px]', tone.body)}>
                              <span className="line-clamp-2 break-words">{ban.reason}</span>
                              <span className={cx('block text-[11px] mt-0.5', tone.faint)}>{formatDate(ban.created_at)}</span>
                            </td>
                            <td className={cx(table.td, 'text-xs', tone.muted)}>{data.people.name(ban.banned_by, '—')}</td>
                            <td className={table.td}>
                              {view === 'active' ? (
                                ban.expires_at ? (
                                  <span className={cx('text-xs whitespace-nowrap', tone.body)} title={formatDate(ban.expires_at)}>
                                    {formatRelative(ban.expires_at)}
                                  </span>
                                ) : (
                                  <Pill tone="rose">Permanent</Pill>
                                )
                              ) : ban.lifted_at ? (
                                <span className={cx('text-xs', tone.muted)}>
                                  Opgeheven door {data.people.name(ban.lifted_by, 'onbekend')}
                                  <span className="block text-[11px]">{formatRelative(ban.lifted_at)}</span>
                                </span>
                              ) : (
                                <Pill>Verlopen</Pill>
                              )}
                            </td>
                            <td className={cx(table.td, 'text-right')}>
                              {view === 'active' && (
                                <Button size="sm" icon={Undo2} onClick={() => setLifting(ban)}>
                                  Opheffen
                                </Button>
                              )}
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
        </>
      )}

      <BanDialog
        open={banOpen}
        people={data?.people.list}
        viewerRole={role}
        viewerId={currentUserId}
        onClose={() => setBanOpen(false)}
        onDone={(member) => {
          setBanOpen(false);
          toast.success(`${member.display_name} is geschorst.`);
          setView('active');
          reload();
          refresh();
        }}
      />
      <ConfirmDialog
        open={!!lifting}
        title="Schorsing opheffen?"
        message={lifting && data ? `${data.people.name(lifting.user_id)} kan daarna meteen weer berichten plaatsen.` : ''}
        confirmLabel="Opheffen"
        busy={busy}
        onConfirm={() => void confirmLift()}
        onCancel={() => setLifting(null)}
      />
    </div>
  );
}
