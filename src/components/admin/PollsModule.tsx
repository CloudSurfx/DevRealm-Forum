import { useMemo, useState } from 'react';
import { Lock, Plus, Trash2, Unlock, Vote, X } from 'lucide-react';
import type { AdminModuleProps, PollOptionRow, PollRow } from '../../types/admin';
import { logModerationAction, mutateAndLog, supabase } from './client';
import {
  AdminCard,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  LoadingState,
  Modal,
  ModuleHeading,
  Pill,
  ProgressBar,
  cx,
  formatNumber,
  formatRelative,
  inputClass,
  tone,
  useAdminAction,
  useAdminFetch,
  useToast,
} from './ui';

interface PollView extends PollRow {
  options: (PollOptionRow & { votes: number })[];
  totalVotes: number;
}

function closesLabel(closesAt: string | null): string {
  if (!closesAt) return 'Loopt door tot je hem sluit';
  return `Sluit op ${new Date(closesAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}`;
}

export function PollsModule({ currentUserId, refresh, refreshKey }: AdminModuleProps) {
  const toast = useToast();
  const action = useAdminAction();
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<PollView | null>(null);

  const { data, initialLoading, error, reload } = useAdminFetch<PollView[]>(async () => {
    const [polls, options, votes] = await Promise.all([
      supabase.from('polls').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('poll_options').select('*').order('sort_order'),
      supabase.from('poll_votes').select('poll_id, option_id').limit(20000),
    ]);
    if (polls.error) return { data: null, error: polls.error };
    if (options.error) return { data: null, error: options.error };
    const voteCounts = new Map<string, number>();
    (votes.data ?? []).forEach((v) => voteCounts.set(v.option_id, (voteCounts.get(v.option_id) ?? 0) + 1));
    return {
      data: (polls.data ?? []).map((poll) => {
        const opts = (options.data ?? [])
          .filter((o) => o.poll_id === poll.id)
          .map((o) => ({ ...o, votes: voteCounts.get(o.id) ?? 0 }));
        return { ...poll, options: opts, totalVotes: opts.reduce((sum, o) => sum + o.votes, 0) };
      }),
      error: null,
    };
  }, [refreshKey]);

  const polls = useMemo(() => data ?? [], [data]);
  const active = polls.find((p) => p.active);
  const others = polls.filter((p) => !p.active);

  const setActive = async (poll: PollView, next: boolean) => {
    const ok = await action.run(
      () =>
        mutateAndLog(() => supabase.from('polls').update({ active: next }).eq('id', poll.id), {
          moderatorId: currentUserId,
          action: next ? 'open' : 'close',
          targetTable: 'polls',
          targetId: poll.id,
          reason: poll.question,
        }),
      { toast: true }
    );
    if (ok) {
      toast.success(next ? 'Peiling staat nu op de site.' : 'Peiling gesloten.');
      reload();
      refresh();
    }
  };

  const confirmDelete = async (reason: string) => {
    if (!deleting) return;
    const target = deleting;
    const ok = await action.run(() =>
      mutateAndLog(() => supabase.from('polls').delete().eq('id', target.id), {
        moderatorId: currentUserId,
        action: 'delete',
        targetTable: 'polls',
        targetId: target.id,
        reason: `${target.question} — ${reason}`,
      })
    );
    if (ok) {
      setDeleting(null);
      toast.success('Peiling verwijderd.');
      reload();
      refresh();
    }
  };

  return (
    <div>
      <ModuleHeading title="Peilingen" description="Er staat altijd maar één peiling op de site. Een nieuwe peiling openen sluit de vorige automatisch.">
        <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
          Nieuwe peiling
        </Button>
      </ModuleHeading>

      {error && <ErrorState message={error} onRetry={reload} />}
      {initialLoading && (
        <AdminCard>
          <LoadingState />
        </AdminCard>
      )}

      {!initialLoading && !error && polls.length === 0 && (
        <AdminCard>
          <EmptyState
            icon={Vote}
            message="Nog geen peilingen."
            action={
              <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
                Eerste peiling maken
              </Button>
            }
          />
        </AdminCard>
      )}

      {!initialLoading && !error && polls.length > 0 && (
        <div className="space-y-6">
          <section>
            <h3 className={cx('text-xs font-bold uppercase tracking-wider mb-2', tone.faint)}>Op de site</h3>
            {active ? (
              <PollCard poll={active} busy={action.busy} onToggle={() => void setActive(active, false)} onDelete={() => setDeleting(active)} />
            ) : (
              <AdminCard>
                <p className={cx('text-sm', tone.muted)}>Er staat nu geen peiling op de site. Open een eerdere peiling of maak een nieuwe.</p>
              </AdminCard>
            )}
          </section>
          {others.length > 0 && (
            <section>
              <h3 className={cx('text-xs font-bold uppercase tracking-wider mb-2', tone.faint)}>Eerdere peilingen</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {others.map((poll) => (
                  <PollCard key={poll.id} poll={poll} busy={action.busy} onToggle={() => void setActive(poll, true)} onDelete={() => setDeleting(poll)} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <CreatePollModal
        open={creating}
        currentUserId={currentUserId}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          toast.success('Peiling aangemaakt en op de site gezet.');
          reload();
          refresh();
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        title="Peiling verwijderen?"
        message={deleting ? `“${deleting.question}” en alle ${deleting.totalVotes} stemmen worden definitief verwijderd.` : ''}
        confirmLabel="Verwijderen"
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

function PollCard({ poll, busy, onToggle, onDelete }: { poll: PollView; busy: boolean; onToggle: () => void; onDelete: () => void }) {
  const expired = poll.closes_at ? Date.parse(poll.closes_at) < Date.now() : false;
  return (
    <AdminCard className={poll.active ? 'border-[#a88bfa]/40' : ''}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {poll.active ? <Pill tone="emerald">Op de site</Pill> : <Pill>Gesloten</Pill>}
            {expired && poll.active && <Pill tone="amber">Einddatum verstreken</Pill>}
          </div>
          <h4 className={cx('text-base font-bold', tone.strong)}>{poll.question}</h4>
          <p className={cx('text-xs mt-0.5', tone.muted)}>
            {formatNumber(poll.totalVotes)} stemmen · {closesLabel(poll.closes_at)} · gemaakt {formatRelative(poll.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" icon={poll.active ? Lock : Unlock} disabled={busy} onClick={onToggle}>
            {poll.active ? 'Sluiten' : 'Openen'}
          </Button>
          <IconButton label="Peiling verwijderen" icon={Trash2} tone="rose" onClick={onDelete} />
        </div>
      </div>
      <div className="space-y-3">
        {poll.options.map((option) => (
          <ProgressBar key={option.id} label={option.label} value={option.votes} max={poll.totalVotes || 1} />
        ))}
        {poll.options.length === 0 && <p className={cx('text-sm', tone.muted)}>Deze peiling heeft geen opties.</p>}
      </div>
    </AdminCard>
  );
}

function CreatePollModal({
  open,
  currentUserId,
  onClose,
  onCreated,
}: {
  open: boolean;
  currentUserId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const action = useAdminAction();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [closesAt, setClosesAt] = useState('');

  const reset = () => {
    setQuestion('');
    setOptions(['', '']);
    setClosesAt('');
    action.clearError();
  };

  const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
  const duplicate = new Set(cleanOptions.map((o) => o.toLowerCase())).size !== cleanOptions.length;
  const closesDate = closesAt ? new Date(`${closesAt}T23:59:00`) : null;
  const dateInvalid = !!closesDate && closesDate.getTime() <= Date.now();
  const valid = question.trim().length >= 5 && cleanOptions.length >= 2 && !duplicate && !dateInvalid;

  const create = async () => {
    const ok = await action.run(async () => {
      const { data: poll, error } = await supabase
        .from('polls')
        .insert({
          question: question.trim(),
          active: true,
          closes_at: closesDate ? closesDate.toISOString() : null,
          closes_in: closesLabel(closesDate ? closesDate.toISOString() : null),
        })
        .select('id')
        .single();
      if (error) throw error;
      const { error: optionsError } = await supabase
        .from('poll_options')
        .insert(cleanOptions.map((label, index) => ({ poll_id: poll.id, label, sort_order: index })));
      if (optionsError) {
        await supabase.from('polls').delete().eq('id', poll.id);
        throw optionsError;
      }
      await logModerationAction({
        moderatorId: currentUserId,
        action: 'create',
        targetTable: 'polls',
        targetId: poll.id,
        reason: question.trim(),
      });
    });
    if (ok) {
      reset();
      onCreated();
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (action.busy) return;
        reset();
        onClose();
      }}
      title="Nieuwe peiling"
      description="De nieuwe peiling komt direct op de site en vervangt de huidige."
      footer={
        <>
          <Button variant="ghost" onClick={() => { reset(); onClose(); }} disabled={action.busy}>
            Annuleren
          </Button>
          <Button variant="primary" disabled={!valid} loading={action.busy} onClick={() => void create()}>
            Peiling starten
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Vraag" hint="Minimaal 5 tekens.">
          <input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={200} className={inputClass} placeholder="Wat bouwen we hierna?" autoFocus />
        </Field>
        <div>
          <span className={cx('block text-xs font-semibold mb-1.5', tone.body)}>Antwoorden (2 tot 6)</span>
          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={index} className="flex gap-2">
                <input
                  value={option}
                  onChange={(e) => setOptions(options.map((o, i) => (i === index ? e.target.value : o)))}
                  maxLength={80}
                  placeholder={`Antwoord ${index + 1}`}
                  className={inputClass}
                />
                {options.length > 2 && (
                  <IconButton label="Antwoord weghalen" icon={X} onClick={() => setOptions(options.filter((_, i) => i !== index))} />
                )}
              </div>
            ))}
          </div>
          {options.length < 6 && (
            <Button size="sm" variant="ghost" icon={Plus} className="mt-2" onClick={() => setOptions([...options, ''])}>
              Antwoord toevoegen
            </Button>
          )}
          {duplicate && <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">Twee antwoorden zijn hetzelfde.</p>}
        </div>
        <Field label="Einddatum (optioneel)" error={dateInvalid ? 'Kies een datum in de toekomst.' : null} hint="Leeg = de peiling loopt tot je hem sluit.">
          <input type="date" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className={cx(inputClass, 'w-48')} />
        </Field>
        {action.error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-300 break-words">{action.error}</p>}
      </div>
    </Modal>
  );
}
