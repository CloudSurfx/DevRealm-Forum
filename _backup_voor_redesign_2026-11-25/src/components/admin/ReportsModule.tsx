import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  Filter,
  Flag,
  MessageSquareText,
  Plus,
  Radio,
  User,
  XCircle,
} from 'lucide-react';
import type { AdminModuleProps, ReportRow } from '../../types/admin';
import { fetchPeople, fetchReports, resolveReport, type PeopleDirectory } from './client';
import {
  AdminCard,
  Avatar,
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
  formatRelative,
  table,
  tone,
  useAdminAction,
  useAdminFetch,
  usePaged,
  useToast,
} from './ui';

type StatusFilter = 'all' | 'open' | 'reviewing' | 'resolved' | 'dismissed';
type TypeFilter = 'all' | 'topic' | 'reply' | 'chat' | 'project' | 'profile';

const TYPE_LABELS: Record<TypeFilter, string> = {
  all: 'Alle types',
  topic: 'Topic',
  reply: 'Reactie',
  chat: 'Chat',
  project: 'Project',
  profile: 'Profiel',
};

const TYPE_ICONS: Record<TypeFilter, typeof Flag> = {
  all: Filter,
  topic: MessageSquareText,
  reply: MessageSquareText,
  chat: Radio,
  project: Plus,
  profile: User,
};

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: 'Alle statussen',
  open: 'Open',
  reviewing: 'In behandeling',
  resolved: 'Opgelost',
  dismissed: 'Afgewezen',
};

const STATUS_TONES: Record<Exclude<StatusFilter, 'all'>, 'rose' | 'amber' | 'emerald' | 'neutral'> = {
  open: 'rose',
  reviewing: 'amber',
  resolved: 'emerald',
  dismissed: 'neutral',
};

interface ReportsData {
  reports: ReportRow[];
  people: PeopleDirectory;
}

export function ReportsModule({ currentUserId, refresh, refreshKey, navigate }: AdminModuleProps) {
  const toast = useToast();
  const action = useAdminAction();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('open');
  const [type, setType] = useState<TypeFilter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [resolving, setResolving] = useState<ReportRow | null>(null);
  const [dismissing, setDismissing] = useState<ReportRow | null>(null);

  const { data, initialLoading, error, reload } = useAdminFetch<ReportsData>(async () => {
    const [reports, people] = await Promise.all([
      fetchReports({ status: status === 'all' ? undefined : status, limit: 500 }),
      fetchPeople(),
    ]);
    if (reports.error) return { data: null, error: reports.error };
    if (people.error || !people.data) return { data: null, error: people.error };
    return { data: { reports: reports.data ?? [], people: people.data }, error: null };
  }, [refreshKey, status]);

  useEffect(() => {
    if (status === 'open') {
      // Auto-refresh every 30 seconds for open reports
      const interval = setInterval(() => reload(), 30000);
      return () => clearInterval(interval);
    }
  }, [status, reload]);

  const reports = useMemo(() => data?.reports ?? [], [data]);
  const counts = useMemo(
    () => ({
      all: reports.length,
      open: reports.filter((r) => r.status === 'open').length,
      reviewing: reports.filter((r) => r.status === 'reviewing').length,
      resolved: reports.filter((r) => r.status === 'resolved').length,
      dismissed: reports.filter((r) => r.status === 'dismissed').length,
    }),
    [reports]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports.filter((r) => {
      if (type !== 'all' && r.target_type !== type) return false;
      if (!q) return true;
      return (
        r.reason.toLowerCase().includes(q) ||
        r.target_id.toLowerCase().includes(q) ||
        (r.reporter_name ?? '').toLowerCase().includes(q)
      );
    });
  }, [reports, query, type]);

  const paged = usePaged(filtered, 25, `${status}|${type}|${query}`);

  const report = openId ? reports.find((r) => r.id === openId) ?? null : null;

  const startResolving = (r: ReportRow) => setResolving(r);
  const startDismissing = (r: ReportRow) => setDismissing(r);

  const confirmResolve = async (reason: string) => {
    if (!resolving) return;
    const ok = await action.run(() => resolveReport(resolving.id, reason, false), { toast: true });
    if (ok) {
      toast.success('Rapport opgelost.');
      setResolving(null);
      reload();
      refresh();
    }
  };

  const confirmDismiss = async (reason: string) => {
    if (!dismissing) return;
    const ok = await action.run(() => resolveReport(dismissing.id, reason, true), { toast: true });
    if (ok) {
      toast.success('Rapport afgewezen.');
      setDismissing(null);
      reload();
      refresh();
    }
  };

  const getTargetLink = (report: ReportRow) => {
    switch (report.target_type) {
      case 'topic':
        return () => navigate('topics', report.target_id);
      case 'reply':
        return () => navigate('topics', report.target_id); // Would need topic_id
      case 'project':
        return () => navigate('gallery', report.target_id);
      case 'profile':
        return () => navigate('members', report.target_id);
      default:
        return undefined;
    }
  };

  return (
    <div>
      <ModuleHeading title="Rapporten" description="Leden melden ongepaste content. Behandel open rapporten, markeer ze als in behandeling, los ze op of weis ze af.">
        <Pill tone={counts.open > 0 ? 'rose' : 'neutral'} icon={Flag}>
          {counts.open} open
        </Pill>
      </ModuleHeading>

      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Zoek in reden, ID of melder" />
        <FilterChips
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'Alle', count: counts.all },
            { value: 'open', label: 'Open', count: counts.open },
            { value: 'reviewing', label: 'In behandeling', count: counts.reviewing },
            { value: 'resolved', label: 'Opgelost', count: counts.resolved },
            { value: 'dismissed', label: 'Afgewezen', count: counts.dismissed },
          ]}
        />
        <SelectInput
          label="Type"
          value={type}
          onChange={setType}
          options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value: value as TypeFilter, label }))}
        />
      </Toolbar>

      <AdminCard>
        {error && <ErrorState message={error} onRetry={reload} />}
        {initialLoading && <LoadingState rows={8} />}
        {!initialLoading && !error && filtered.length === 0 && (
          <EmptyState
            icon={Flag}
            title={status === 'open' ? 'Geen open rapporten' : 'Geen rapporten gevonden'}
            message={status === 'open' ? 'Goed gedaan! Er zijn geen open rapporten.' : 'Probeer andere filters of zoektermen.'}
          />
        )}
        {!initialLoading && !error && data && filtered.length > 0 && (
          <>
            <div className={table.wrap}>
              <table className={cx(table.table, 'min-w-[880px]')}>
                <thead className={table.head}>
                  <tr>
                    <th className={table.th}>Rapport</th>
                    <th className={table.th}>Type</th>
                    <th className={table.th}>Status</th>
                    <th className={table.th}>Gemeld door</th>
                    <th className={table.th}>Doel</th>
                    <th className={cx(table.th, 'text-right')}>Acties</th>
                  </tr>
                </thead>
                <tbody className={table.body}>
                  {paged.pageItems.map((report) => {
                    const reporter = data.people.byId.get(report.reporter_id);
                    const TypeIcon = TYPE_ICONS[report.target_type];
                    const statusTone = STATUS_TONES[report.status as Exclude<StatusFilter, 'all'>] ?? 'neutral';
                    return (
                      <tr key={report.id} className={cx(table.row, report.status === 'open' && 'bg-rose-500/[0.02]')}>
                        <td className={cx(table.td, 'max-w-[280px]')}>
                          <button
                            type="button"
                            onClick={() => setOpenId(report.id)}
                            className="text-left w-full cursor-pointer group"
                          >
                            <span className={cx('text-sm font-semibold truncate group-hover:text-[#a88bfa] transition-colors', tone.strong)}>
                              {report.reason}
                            </span>
                            <span className={cx('text-xs', tone.muted)}>
                              {formatRelative(report.created_at)} · <TypeIcon className="inline w-3 h-3" /> {TYPE_LABELS[report.target_type]}
                            </span>
                          </button>
                        </td>
                        <td className={table.td}>
                          <Pill tone="accent" icon={TypeIcon}>
                            {TYPE_LABELS[report.target_type]}
                          </Pill>
                        </td>
                        <td className={table.td}>
                          <Pill tone={statusTone}>
                            {STATUS_LABELS[report.status as StatusFilter] ?? report.status}
                          </Pill>
                        </td>
                        <td className={table.td}>
                          <span className="flex items-center gap-2">
                            <Avatar name={reporter?.display_name ?? report.reporter_name ?? 'Onbekend'} url={reporter?.avatar_url} color={reporter?.avatar_color} size="sm" />
                            <span className={cx('text-sm font-medium', tone.strong)}>{reporter?.display_name ?? report.reporter_name ?? 'Onbekend'}</span>
                          </span>
                        </td>
                        <td className={cx(table.td, 'text-sm', tone.body)}>
                          {report.target_id}
                          {getTargetLink(report) && (
                            <button
                              type="button"
                              onClick={getTargetLink(report)!}
                              className="ml-2 text-[11px] text-[#a88bfa] hover:underline cursor-pointer"
                            >
                              <Eye className="w-3 h-3 inline" /> Bekijken
                            </button>
                          )}
                        </td>
                        <td className={cx(table.td, 'text-right')}>
                          <div className="flex items-center justify-end gap-1">
                            {report.status === 'open' && (
                              <>
                                <IconButton label="In behandeling nemen" icon={Radio} tone="amber" onClick={() => startResolving(report)} />
                                <IconButton label="Oplossen" icon={CheckCircle2} tone="emerald" onClick={() => startResolving(report)} />
                                <IconButton label="Afwijzen" icon={XCircle} tone="rose" onClick={() => startDismissing(report)} />
                              </>
                            )}
                            {report.status === 'reviewing' && (
                              <>
                                <IconButton label="Oplossen" icon={CheckCircle2} tone="emerald" onClick={() => startResolving(report)} />
                                <IconButton label="Afwijzen" icon={XCircle} tone="rose" onClick={() => startDismissing(report)} />
                              </>
                            )}
                          </div>
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

      {report && data && (
        <ReportDrawer
          report={report}
          people={data.people}
          currentUserId={currentUserId}
          onClose={() => setOpenId(null)}
          onResolve={startResolving}
          onDismiss={startDismissing}
          busy={action.busy}
        />
      )}

      <ConfirmDialog
        open={!!resolving}
        title="Rapport oplossen"
        message={resolving ? `Rapport over "${TYPE_LABELS[resolving.target_type]}" oplossen.` : ''}
        confirmLabel="Oplossen"
        requireReason
        reasonLabel="Resolutie (komt in het moderatielog en wordt zichtbaar voor de melder)"
        busy={action.busy}
        error={action.error}
        onConfirm={(reason) => void confirmResolve(reason)}
        onCancel={() => setResolving(null)}
      />
      <ConfirmDialog
        open={!!dismissing}
        title="Rapport afwijzen"
        message={dismissing ? `Rapport over "${TYPE_LABELS[dismissing.target_type]}" afwijzen zonder actie.` : ''}
        confirmLabel="Afwijzen"
        danger
        requireReason
        reasonLabel="Reden voor afwijzing (komt in het moderatielog)"
        busy={action.busy}
        error={action.error}
        onConfirm={(reason) => void confirmDismiss(reason)}
        onCancel={() => setDismissing(null)}
      />
    </div>
  );
}

function ReportDrawer({
  report,
  people,
  onClose,
  onResolve,
  onDismiss,
  busy,
}: {
  report: ReportRow;
  people: PeopleDirectory;
  currentUserId: string;
  onClose: () => void;
  onResolve: (r: ReportRow) => void;
  onDismiss: (r: ReportRow) => void;
  busy: boolean;
}) {
  const reporter = people.byId.get(report.reporter_id);
  const statusTone = STATUS_TONES[report.status as Exclude<StatusFilter, 'all'>] ?? 'neutral';

  return (
    <Drawer
      open
      onClose={onClose}
      title={report.reason}
      subtitle={`${TYPE_LABELS[report.target_type]} ${reporter?.display_name ?? report.reporter_name ?? 'Onbekend'} · gemeld ${formatRelative(report.created_at)}`}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Pill tone={statusTone}>{STATUS_LABELS[report.status as StatusFilter] ?? report.status}</Pill>
          <Pill tone="accent" icon={TYPE_ICONS[report.target_type]}>
            {TYPE_LABELS[report.target_type]}
          </Pill>
        </div>

        <div className={cx('rounded-lg border p-4', tone.border)}>
          <h4 className={cx('text-sm font-semibold mb-2', tone.strong)}>Reden van de melding</h4>
          <p className={cx('text-sm whitespace-pre-wrap break-words', tone.body)}>{report.reason}</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className={cx('rounded-lg border p-4', tone.border)}>
            <h4 className={cx('text-sm font-semibold mb-2', tone.strong)}>Gemeld door</h4>
            <div className="flex items-center gap-3">
              <Avatar name={reporter?.display_name ?? report.reporter_name ?? 'Onbekend'} url={reporter?.avatar_url} color={reporter?.avatar_color} size="md" />
              <div>
                <p className={cx('text-sm font-semibold', tone.strong)}>{reporter?.display_name ?? report.reporter_name ?? 'Onbekend'}</p>
                <p className={cx('text-xs', tone.muted)}>@{reporter?.username ?? report.reporter_id.slice(0, 8)}</p>
              </div>
            </div>
            {reporter && (
              <button
                type="button"
                onClick={() => reporter.id && (window as any).navigate?.('members', reporter.id)}
                className={cx('mt-3 text-sm text-[#a88bfa] hover:underline cursor-pointer', tone.strong)}
              >
                Lid openen in Leden-module
              </button>
            )}
          </div>

          <div className={cx('rounded-lg border p-4', tone.border)}>
            <h4 className={cx('text-sm font-semibold mb-2', tone.strong)}>Gemeld item</h4>
            <p className={cx('text-sm font-mono text-xs', tone.body)}>{report.target_table}: {report.target_id}</p>
            {report.resolution && (
              <div className="mt-3 p-3 rounded-lg bg-emerald-500/[0.1] border border-emerald-500/20">
                <p className={cx('text-xs font-semibold mb-1', 'text-emerald-700 dark:text-emerald-300')}>Resolutie</p>
                <p className={cx('text-sm', 'text-emerald-600 dark:text-emerald-400')}>{report.resolution}</p>
                <p className={cx('text-xs mt-1', 'text-emerald-500/70 dark:text-emerald-500/70')}>
                  Door {report.moderator_name ?? 'Onbekend'} · {formatRelative(report.resolved_at)}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {report.status === 'open' && (
            <>
              <Button size="sm" icon={Radio} variant="secondary" disabled={busy} onClick={() => onResolve(report)}>
                In behandeling nemen
              </Button>
              <Button size="sm" icon={CheckCircle2} variant="primary" disabled={busy} onClick={() => onResolve(report)}>
                Oplossen
              </Button>
              <Button size="sm" icon={XCircle} variant="danger" disabled={busy} onClick={() => onDismiss(report)}>
                Afwijzen
              </Button>
            </>
          )}
          {report.status === 'reviewing' && (
            <>
              <Button size="sm" icon={CheckCircle2} variant="primary" disabled={busy} onClick={() => onResolve(report)}>
                Oplossen
              </Button>
              <Button size="sm" icon={XCircle} variant="danger" disabled={busy} onClick={() => onDismiss(report)}>
                Afwijzen
              </Button>
            </>
          )}
        </div>
      </div>
    </Drawer>
  );
}
