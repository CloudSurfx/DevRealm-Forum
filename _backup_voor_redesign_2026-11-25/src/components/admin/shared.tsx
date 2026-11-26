import { useEffect, useMemo, useState } from 'react';
import { Ban } from 'lucide-react';
import { BAN_DURATIONS, createBan, type Person } from './client';
import {
  Avatar,
  Button,
  Field,
  Modal,
  RoleBadge,
  SearchInput,
  cx,
  describeError,
  textareaClass,
  tone,
} from './ui';
import type { ModuleRole } from '../../types/admin';

/** Mag de huidige moderator/admin dit lid schorsen? (de database controleert het ook) */
export function canBan(viewerRole: ModuleRole, viewerId: string, target: Pick<Person, 'id' | 'role'>): boolean {
  if (target.id === viewerId) return false;
  if (target.role === 'admin') return false;
  if (target.role === 'moderator') return viewerRole === 'admin';
  return true;
}

/**
 * Venster om een lid te schorsen. Geef `member` mee om direct dat lid te
 * schorsen, of `people` om eerst een lid te kiezen.
 */
export function BanDialog({
  open,
  member,
  people,
  viewerRole,
  viewerId,
  onClose,
  onDone,
}: {
  open: boolean;
  member?: Person | null;
  people?: Person[];
  viewerRole: ModuleRole;
  viewerId: string;
  onClose: () => void;
  onDone: (member: Person) => void;
}) {
  const [picked, setPicked] = useState<Person | null>(member ?? null);
  const [query, setQuery] = useState('');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('24h');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPicked(member ?? null);
    setQuery('');
    setReason('');
    setDuration('24h');
    setError(null);
  }, [open, member]);

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (people ?? [])
      .filter((p) => canBan(viewerRole, viewerId, p) && !p.activeBan)
      .filter((p) => !q || p.display_name.toLowerCase().includes(q) || p.username.toLowerCase().includes(q))
      .slice(0, 8);
  }, [people, query, viewerRole, viewerId]);

  const submit = async () => {
    if (!picked) return;
    setBusy(true);
    setError(null);
    try {
      const hours = BAN_DURATIONS.find((d) => d.id === duration)?.hours ?? 24;
      await createBan(picked.id, reason, hours);
      onDone(picked);
    } catch (caught: unknown) {
      setError(describeError(caught));
    } finally {
      setBusy(false);
    }
  };

  const valid = !!picked && reason.trim().length >= 3;

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      title={picked ? `${picked.display_name} schorsen` : 'Lid schorsen'}
      description="Een geschorst lid kan nog meelezen, maar geen topics, reacties, chatberichten of projecten plaatsen."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Annuleren
          </Button>
          <Button variant="danger" icon={Ban} loading={busy} disabled={!valid} onClick={() => void submit()}>
            Schorsen
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {!member && (
          <div>
            {picked ? (
              <div className={cx('flex items-center gap-3 rounded-lg border p-2.5', tone.border, tone.sunken)}>
                <Avatar name={picked.display_name} url={picked.avatar_url} color={picked.avatar_color} size="sm" />
                <span className={cx('text-sm font-semibold flex-1 truncate', tone.strong)}>{picked.display_name}</span>
                <Button size="sm" variant="ghost" onClick={() => setPicked(null)}>
                  Ander lid
                </Button>
              </div>
            ) : (
              <Field label="Lid">
                <SearchInput value={query} onChange={setQuery} placeholder="Zoek op naam" className="sm:w-full" />
                <ul className={cx('mt-2 rounded-lg border divide-y max-h-56 overflow-y-auto', tone.border, tone.divider)}>
                  {candidates.length === 0 && (
                    <li className={cx('px-3 py-2.5 text-xs', tone.muted)}>Geen leden gevonden die je kunt schorsen.</li>
                  )}
                  {candidates.map((person) => (
                    <li key={person.id}>
                      <button
                        type="button"
                        onClick={() => setPicked(person)}
                        className={cx('w-full flex items-center gap-3 px-3 py-2 text-left cursor-pointer', tone.hover)}
                      >
                        <Avatar name={person.display_name} url={person.avatar_url} color={person.avatar_color} size="sm" />
                        <span className={cx('text-sm flex-1 truncate', tone.strong)}>{person.display_name}</span>
                        <RoleBadge role={person.role} />
                      </button>
                    </li>
                  ))}
                </ul>
              </Field>
            )}
          </div>
        )}

        <div>
          <span className={cx('block text-xs font-semibold mb-1.5', tone.body)}>Duur</span>
          <div className="flex flex-wrap gap-1.5">
            {BAN_DURATIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setDuration(option.id)}
                aria-pressed={duration === option.id}
                className={cx(
                  'h-8 px-3 rounded-lg border text-xs font-semibold cursor-pointer transition-colors',
                  duration === option.id
                    ? option.hours === null
                      ? 'bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-300'
                      : 'bg-[#a88bfa]/12 border-[#a88bfa]/45 text-violet-700 dark:text-[#d6c8ff]'
                    : cx(tone.border, tone.muted, 'hover:text-slate-900 dark:hover:text-white')
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <Field label="Reden" hint="Het lid ziet deze reden als het iets probeert te plaatsen. Minimaal 3 tekens.">
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Bijv. herhaaldelijk spammen in de chat"
            className={textareaClass}
          />
        </Field>

        {error && (
          <p role="alert" className="text-xs text-rose-600 dark:text-rose-300 break-words">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
