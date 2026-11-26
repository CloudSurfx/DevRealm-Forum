import { useEffect, useMemo, useState } from 'react';
import { Award, Ban, Plus, ShieldCheck, Undo2, Users, X } from 'lucide-react';
import type { AdminModuleProps, AdminRole, MemberBanRow, TopicRow } from '../../types/admin';
import { BADGE_CATALOG, getBadgeDefinition } from '../../utils/badgeSystem';
import { getBadgeToneClasses, renderBadgeIcon } from '../UserBadges';
import {
  fetchPeople,
  isBanActive,
  isMissingTable,
  liftBan,
  logModerationAction,
  supabase,
  type Person,
} from './client';
import { BanDialog, canBan } from './shared';
import {
  AdminCard,
  Avatar,
  Button,
  ConfirmDialog,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  FilterChips,
  LoadingState,
  ModuleHeading,
  Pagination,
  Pill,
  ROLE_LABELS,
  RoleBadge,
  SearchInput,
  SelectInput,
  Toolbar,
  cx,
  formatDate,
  formatNumber,
  formatRelative,
  inputClass,
  table,
  tone,
  useAdminFetch,
  usePaged,
  useToast,
} from './ui';

type RoleFilter = 'all' | AdminRole | 'banned';
type SortKey = 'newest' | 'reputation' | 'posts' | 'name';

export function MembersModule({ currentUserId, role, refresh, refreshKey, focus, navigate }: AdminModuleProps) {
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [openId, setOpenId] = useState<string | null>(focus ?? null);

  const { data, initialLoading, error, reload } = useAdminFetch(fetchPeople, [refreshKey]);
  const people = useMemo(() => data?.list ?? [], [data]);

  const counts = useMemo(
    () => ({
      all: people.length,
      admin: people.filter((p) => p.role === 'admin').length,
      moderator: people.filter((p) => p.role === 'moderator').length,
      member: people.filter((p) => p.role === 'member').length,
      banned: people.filter((p) => p.activeBan).length,
    }),
    [people]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = people.filter((p) => {
      if (roleFilter === 'banned' ? !p.activeBan : roleFilter !== 'all' && p.role !== roleFilter) return false;
      return !q || p.display_name.toLowerCase().includes(q) || p.username.toLowerCase().includes(q);
    });
    const sorters: Record<SortKey, (a: Person, b: Person) => number> = {
      newest: (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
      reputation: (a, b) => b.reputation - a.reputation,
      posts: (a, b) => b.posts_count - a.posts_count,
      name: (a, b) => a.display_name.localeCompare(b.display_name, 'nl'),
    };
    return [...list].sort(sorters[sort]);
  }, [people, query, roleFilter, sort]);

  const paged = usePaged(filtered, 25, `${query}|${roleFilter}|${sort}`);
  const openPerson = openId ? data?.byId.get(openId) ?? null : null;

  return (
    <div>
      <ModuleHeading title="Leden" description="Zoek leden, pas rollen, reputatie en badges aan en schors leden die zich niet aan de regels houden." />

      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Zoek op naam of gebruikersnaam" />
        <FilterChips
          label="Filter op rol"
          value={roleFilter}
          onChange={setRoleFilter}
          options={[
            { value: 'all', label: 'Alle', count: counts.all },
            { value: 'admin', label: 'Admins', count: counts.admin },
            { value: 'moderator', label: 'Moderators', count: counts.moderator },
            { value: 'member', label: 'Leden', count: counts.member },
            { value: 'banned', label: 'Geschorst', count: counts.banned },
          ]}
        />
        <SelectInput
          label="Sorteren"
          value={sort}
          onChange={setSort}
          options={[
            { value: 'newest', label: 'Nieuwste eerst' },
            { value: 'reputation', label: 'Meeste reputatie' },
            { value: 'posts', label: 'Meeste berichten' },
            { value: 'name', label: 'Naam (A–Z)' },
          ]}
        />
      </Toolbar>

      <AdminCard>
        {error && <ErrorState message={error} onRetry={reload} />}
        {initialLoading && <LoadingState rows={8} />}
        {!initialLoading && !error && filtered.length === 0 && (
          <EmptyState icon={Users} message={query || roleFilter !== 'all' ? 'Geen leden gevonden met deze filters.' : 'Nog geen leden.'} />
        )}
        {!initialLoading && !error && filtered.length > 0 && (
          <>
            <div className={table.wrap}>
              <table className={cx(table.table, 'min-w-[720px]')}>
                <thead className={table.head}>
                  <tr>
                    <th className={table.th}>Lid</th>
                    <th className={table.th}>Rol</th>
                    <th className={cx(table.th, 'text-right')}>Reputatie</th>
                    <th className={cx(table.th, 'text-right')}>Berichten</th>
                    <th className={table.th}>Lid sinds</th>
                    <th className={table.th}>Status</th>
                  </tr>
                </thead>
                <tbody className={table.body}>
                  {paged.pageItems.map((person) => (
                    <tr
                      key={person.id}
                      onClick={() => setOpenId(person.id)}
                      className={cx(table.row, 'cursor-pointer')}
                    >
                      <td className={table.td}>
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar name={person.display_name} url={person.avatar_url} color={person.avatar_color} />
                          <div className="min-w-0">
                            <p className={cx('text-sm font-semibold truncate', tone.strong)}>
                              {person.display_name}
                              {person.id === currentUserId && <span className={cx('ml-1.5 text-xs font-normal', tone.faint)}>(jij)</span>}
                            </p>
                            <p className={cx('text-xs truncate', tone.muted)}>@{person.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className={table.td}>
                        <RoleBadge role={person.role} />
                      </td>
                      <td className={cx(table.td, 'text-right text-sm tabular-nums font-semibold', tone.strong)}>
                        {formatNumber(person.reputation)}
                      </td>
                      <td className={cx(table.td, 'text-right text-sm tabular-nums', tone.body)}>
                        {formatNumber(person.posts_count)}
                      </td>
                      <td className={cx(table.td, 'text-xs whitespace-nowrap', tone.muted)}>{formatDate(person.created_at, false)}</td>
                      <td className={table.td}>
                        {person.activeBan ? (
                          <Pill tone="rose" icon={Ban}>
                            Geschorst
                          </Pill>
                        ) : (
                          <span className={cx('text-xs whitespace-nowrap', tone.muted)}>Actief {formatRelative(person.last_seen)}</span>
                        )}
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

      {openPerson && data && (
        <MemberDrawer
          person={openPerson}
          people={data.list}
          viewerId={currentUserId}
          viewerRole={role}
          onClose={() => setOpenId(null)}
          onChanged={() => {
            reload();
            refresh();
          }}
          onOpenTopic={(topicId) => navigate('topics', topicId)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detailpaneel van één lid
// ---------------------------------------------------------------------------
interface MemberDetail {
  topics: number;
  replies: number;
  chat: number;
  bans: MemberBanRow[] | null;
  recentTopics: Pick<TopicRow, 'id' | 'title' | 'created_at'>[];
}

function MemberDrawer({
  person,
  people,
  viewerId,
  viewerRole,
  onClose,
  onChanged,
  onOpenTopic,
}: {
  person: Person;
  people: Person[];
  viewerId: string;
  viewerRole: AdminModuleProps['role'];
  onClose: () => void;
  onChanged: () => void;
  onOpenTopic: (topicId: string) => void;
}) {
  const toast = useToast();
  const isSelf = person.id === viewerId;
  const isAdmin = viewerRole === 'admin';

  const [nextRole, setNextRole] = useState<AdminRole>(person.role);
  const [reputation, setReputation] = useState(String(person.reputation));
  const [badges, setBadges] = useState<string[]>(person.badges);
  const [newBadge, setNewBadge] = useState('');
  const [busy, setBusy] = useState<'role' | 'stats' | 'lift' | null>(null);
  const [banOpen, setBanOpen] = useState(false);
  const [liftOpen, setLiftOpen] = useState(false);

  useEffect(() => {
    setNextRole(person.role);
    setReputation(String(person.reputation));
    setBadges(person.badges);
  }, [person]);

  const { data: detail, reload: reloadDetail } = useAdminFetch<MemberDetail>(async () => {
    const [topics, replies, chat, bans, recent] = await Promise.all([
      supabase.from('topics').select('*', { count: 'exact', head: true }).eq('author_id', person.id),
      supabase.from('replies').select('*', { count: 'exact', head: true }).eq('author_id', person.id),
      supabase.from('chat_messages').select('*', { count: 'exact', head: true }).eq('user_id', person.id),
      supabase.from('member_bans').select('*').eq('user_id', person.id).order('created_at', { ascending: false }),
      supabase
        .from('topics')
        .select('id, title, created_at')
        .eq('author_id', person.id)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);
    return {
      data: {
        topics: topics.count ?? 0,
        replies: replies.count ?? 0,
        chat: chat.count ?? 0,
        bans: bans.error && isMissingTable(bans.error) ? null : bans.data ?? [],
        recentTopics: recent.data ?? [],
      },
      error: topics.error ?? replies.error ?? chat.error ?? null,
    };
  }, [person.id]);

  const saveRole = async () => {
    setBusy('role');
    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: person.id, role: nextRole }, { onConflict: 'user_id' });
      if (error) throw error;
      await logModerationAction({
        moderatorId: viewerId,
        action: 'role_change',
        targetTable: 'user_roles',
        targetId: person.id,
        reason: `Rol van ${person.display_name}: ${ROLE_LABELS[person.role]} → ${ROLE_LABELS[nextRole]}`,
      });
      toast.success(`${person.display_name} is nu ${ROLE_LABELS[nextRole].toLowerCase()}.`);
      onChanged();
    } catch (caught: unknown) {
      toast.error(caught);
    } finally {
      setBusy(null);
    }
  };

  const repNumber = Number(reputation);
  const repValid = reputation.trim() !== '' && Number.isInteger(repNumber) && repNumber >= 0 && repNumber <= 1_000_000;
  const statsDirty = repNumber !== person.reputation || badges.join('|') !== person.badges.join('|');

  const saveStats = async () => {
    setBusy('stats');
    try {
      const { error } = await supabase.rpc('admin_update_member', {
        target_user_id: person.id,
        new_reputation: repNumber,
        new_badges: badges,
        reason: null,
      });
      if (error) {
        if (isMissingTable(error) || (typeof error.message === 'string' && error.message.includes('admin_update_member'))) {
          throw new Error('Draai eerst migratie 0004_beheer_uitbreiding.sql om reputatie en badges te kunnen aanpassen.');
        }
        throw error;
      }
      toast.success('Reputatie en badges opgeslagen.');
      onChanged();
    } catch (caught: unknown) {
      toast.error(caught);
    } finally {
      setBusy(null);
    }
  };

  const addBadge = (name: string) => {
    const clean = name.trim();
    if (clean.length < 2 || badges.includes(clean)) return;
    setBadges([...badges, clean]);
    setNewBadge('');
  };

  const confirmLift = async () => {
    if (!person.activeBan) return;
    setBusy('lift');
    try {
      await liftBan(person.activeBan.id);
      toast.success(`Schorsing van ${person.display_name} is opgeheven.`);
      setLiftOpen(false);
      onChanged();
      reloadDetail();
    } catch (caught: unknown) {
      toast.error(caught);
    } finally {
      setBusy(null);
    }
  };

  const suggestions = BADGE_CATALOG.map((b) => b.id).filter((id) => !badges.includes(id));

  return (
    <Drawer
      open
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          {person.display_name}
          <RoleBadge role={person.role} />
        </span>
      }
      subtitle={`@${person.username} · lid sinds ${formatDate(person.created_at, false)} · laatst actief ${formatRelative(person.last_seen)}`}
    >
      <div className="flex items-center gap-4">
        <Avatar name={person.display_name} url={person.avatar_url} color={person.avatar_color} size="lg" />
        <div className="grid grid-cols-3 gap-2 flex-1">
          {[
            ['Reputatie', person.reputation],
            ['Topics', detail?.topics],
            ['Reacties', detail?.replies],
          ].map(([label, value]) => (
            <div key={label as string} className={cx('rounded-lg px-3 py-2', tone.sunken)}>
              <p className={cx('text-[11px]', tone.muted)}>{label}</p>
              <p className={cx('text-lg font-bold tabular-nums', tone.strong)}>
                {value === undefined ? '…' : formatNumber(Number(value))}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Schorsing */}
      {person.activeBan ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.06] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                <Ban className="w-4 h-4" /> Geschorst
                {person.activeBan.expires_at ? ` tot ${formatDate(person.activeBan.expires_at)}` : ' (permanent)'}
              </p>
              <p className={cx('text-sm mt-1', tone.body)}>{person.activeBan.reason}</p>
              <p className={cx('text-xs mt-1', tone.muted)}>
                Door {people.find((p) => p.id === person.activeBan?.banned_by)?.display_name ?? 'onbekend'} ·{' '}
                {formatRelative(person.activeBan.created_at)}
              </p>
            </div>
            <Button size="sm" icon={Undo2} onClick={() => setLiftOpen(true)}>
              Opheffen
            </Button>
          </div>
        </div>
      ) : (
        canBan(viewerRole, viewerId, person) && (
          <div className={cx('rounded-xl border p-4 flex items-center justify-between gap-3', tone.border)}>
            <div>
              <p className={cx('text-sm font-semibold', tone.strong)}>Schorsen</p>
              <p className={cx('text-xs mt-0.5', tone.muted)}>Tijdelijk of permanent; het lid kan dan niets meer plaatsen.</p>
            </div>
            <Button size="sm" variant="danger" icon={Ban} onClick={() => setBanOpen(true)}>
              Schorsen
            </Button>
          </div>
        )
      )}

      {/* Rol */}
      <section>
        <h3 className={cx('text-sm font-bold mb-2 flex items-center gap-2', tone.strong)}>
          <ShieldCheck className="w-4 h-4 text-[#a88bfa]" /> Rol
        </h3>
        {isSelf ? (
          <p className={cx('text-sm', tone.muted)}>Je kunt je eigen rol niet aanpassen.</p>
        ) : !isAdmin ? (
          <p className={cx('text-sm', tone.muted)}>Alleen admins kunnen rollen aanpassen.</p>
        ) : (
          <div className="flex items-center gap-2">
            <SelectInput
              label="Rol"
              value={nextRole}
              onChange={setNextRole}
              options={[
                { value: 'member', label: 'Lid' },
                { value: 'moderator', label: 'Moderator — kan modereren en schorsen' },
                { value: 'admin', label: 'Admin — alle rechten' },
              ]}
              className="flex-1"
            />
            <Button variant="primary" disabled={nextRole === person.role} loading={busy === 'role'} onClick={() => void saveRole()}>
              Opslaan
            </Button>
          </div>
        )}
      </section>

      {/* Reputatie en badges */}
      <section>
        <h3 className={cx('text-sm font-bold mb-2 flex items-center gap-2', tone.strong)}>
          <Award className="w-4 h-4 text-[#a88bfa]" /> Reputatie en badges
        </h3>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {badges.length === 0 && <span className={cx('text-sm', tone.muted)}>Geen handmatige badges.</span>}
          {badges.map((badge) => {
            const def = getBadgeDefinition(badge);
            return (
              <span
                key={badge}
                className={cx('inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-md border text-xs font-semibold', getBadgeToneClasses(def.tone))}
              >
                {renderBadgeIcon(def.icon, 'w-3 h-3')}
                {def.label}
                {isAdmin && (
                  <button
                    type="button"
                    aria-label={`Badge ${def.label} verwijderen`}
                    onClick={() => setBadges(badges.filter((b) => b !== badge))}
                    className="ml-0.5 rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            );
          })}
        </div>

        {isAdmin ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                list="admin-badge-suggestions"
                value={newBadge}
                onChange={(event) => setNewBadge(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addBadge(newBadge);
                  }
                }}
                placeholder="Badge toevoegen (kies of typ zelf)"
                className={inputClass}
                aria-label="Badge toevoegen"
              />
              <datalist id="admin-badge-suggestions">
                {suggestions.map((id) => (
                  <option key={id} value={id} />
                ))}
              </datalist>
              <Button icon={Plus} onClick={() => addBadge(newBadge)} disabled={newBadge.trim().length < 2}>
                Toevoegen
              </Button>
            </div>
            <Field label="Reputatie" hint="Tussen 0 en 1.000.000. Wordt gelogd in het moderatielog.">
              <input
                type="number"
                min={0}
                max={1000000}
                value={reputation}
                onChange={(event) => setReputation(event.target.value)}
                className={cx(inputClass, 'w-40')}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                disabled={!statsDirty}
                onClick={() => {
                  setReputation(String(person.reputation));
                  setBadges(person.badges);
                }}
              >
                Herstellen
              </Button>
              <Button variant="primary" disabled={!statsDirty || !repValid} loading={busy === 'stats'} onClick={() => void saveStats()}>
                Opslaan
              </Button>
            </div>
          </div>
        ) : (
          <p className={cx('text-sm', tone.muted)}>Alleen admins kunnen reputatie en badges aanpassen.</p>
        )}
      </section>

      {/* Recente topics */}
      <section>
        <h3 className={cx('text-sm font-bold mb-2', tone.strong)}>Recente topics</h3>
        {!detail ? (
          <LoadingState rows={2} />
        ) : detail.recentTopics.length === 0 ? (
          <p className={cx('text-sm', tone.muted)}>Nog geen topics gestart.</p>
        ) : (
          <ul className={cx('rounded-lg border divide-y', tone.border, tone.divider)}>
            {detail.recentTopics.map((topic) => (
              <li key={topic.id}>
                <button
                  type="button"
                  onClick={() => onOpenTopic(topic.id)}
                  className={cx('w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left cursor-pointer', tone.hover)}
                >
                  <span className={cx('text-sm truncate', tone.strong)}>{topic.title}</span>
                  <span className={cx('text-xs shrink-0', tone.muted)}>{formatRelative(topic.created_at)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Schorsingsgeschiedenis */}
      {detail?.bans && detail.bans.length > 0 && (
        <section>
          <h3 className={cx('text-sm font-bold mb-2', tone.strong)}>Eerdere schorsingen</h3>
          <ul className="space-y-2">
            {detail.bans.map((ban) => (
              <li key={ban.id} className={cx('rounded-lg px-3 py-2.5 text-sm', tone.sunken)}>
                <div className="flex items-center justify-between gap-2">
                  <span className={tone.body}>{ban.reason}</span>
                  {isBanActive(ban) ? <Pill tone="rose">Actief</Pill> : <Pill>{ban.lifted_at ? 'Opgeheven' : 'Verlopen'}</Pill>}
                </div>
                <p className={cx('text-xs mt-0.5', tone.muted)}>
                  {formatDate(ban.created_at)} · {ban.expires_at ? `tot ${formatDate(ban.expires_at)}` : 'permanent'}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <BanDialog
        open={banOpen}
        member={person}
        viewerRole={viewerRole}
        viewerId={viewerId}
        onClose={() => setBanOpen(false)}
        onDone={() => {
          setBanOpen(false);
          toast.success(`${person.display_name} is geschorst.`);
          onChanged();
          reloadDetail();
        }}
      />
      <ConfirmDialog
        open={liftOpen}
        title="Schorsing opheffen?"
        message={`${person.display_name} kan daarna meteen weer berichten plaatsen.`}
        confirmLabel="Opheffen"
        busy={busy === 'lift'}
        onConfirm={() => void confirmLift()}
        onCancel={() => setLiftOpen(false)}
      />
    </Drawer>
  );
}
