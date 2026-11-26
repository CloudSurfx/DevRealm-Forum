import { describeError as describeErrorBase } from '../../lib/errors';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type DependencyList,
  type ReactNode,
} from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  Inbox,
  LoaderCircle,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import type { AdminRole } from '../../types/admin';

// ---------------------------------------------------------------------------
// Ontwerp-tokens (Tailwind-klassen). Eén plek, zodat alles er hetzelfde uitziet
// in licht én donker thema.
// ---------------------------------------------------------------------------
export const tone = {
  strong: 'text-slate-900 dark:text-[#f5f3ff]',
  body: 'text-slate-700 dark:text-[#d6d6d8]',
  muted: 'text-slate-500 dark:text-[#8e8e93]',
  faint: 'text-slate-400 dark:text-[#6a6b6c]',
  accent: 'text-[#a88bfa]',
  border: 'border-slate-200 dark:border-white/[0.07]',
  divider: 'divide-slate-100 dark:divide-white/[0.05]',
  surface: 'bg-white dark:bg-[#13111c]',
  sunken: 'bg-slate-50 dark:bg-[#0f0d17]',
  hover: 'hover:bg-slate-50 dark:hover:bg-white/[0.03]',
};

export const inputClass =
  'w-full h-9 rounded-lg px-3 text-sm bg-white dark:bg-[#0f0d17] border border-slate-200 dark:border-white/[0.09] text-slate-900 dark:text-[#f5f3ff] placeholder:text-slate-400 dark:placeholder:text-[#6a6b6c] focus:outline-none focus:ring-2 focus:ring-[#a88bfa]/50 focus:border-[#a88bfa]/60 disabled:opacity-50 transition-colors';

export const textareaClass = inputClass.replace('h-9', 'min-h-[88px] py-2 leading-relaxed resize-y');

/** Zelfde als inputClass, maar zo breed als de inhoud (voor keuzelijsten in een filterbalk). */
export const selectClass = inputClass.replace('w-full ', '');

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ---------------------------------------------------------------------------
// Opmaak-hulpjes
// ---------------------------------------------------------------------------

/** Maak van een PostgREST-error (of onbekende fout) een vriendelijke NL melding. */
export function describeError(error: unknown): string {
  return error ? describeErrorBase(error) : '';
}

export function formatDate(value: string | null | undefined, withTime = true): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
}

const rtf = new Intl.RelativeTimeFormat('nl-NL', { numeric: 'auto' });

/** "3 minuten geleden", "over 2 dagen" */
export function formatRelative(value: string | null | undefined): string {
  if (!value) return '—';
  const diff = Date.parse(value) - Date.now();
  if (Number.isNaN(diff)) return '—';
  const abs = Math.abs(diff);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 365 * 86400_000],
    ['month', 30 * 86400_000],
    ['week', 7 * 86400_000],
    ['day', 86400_000],
    ['hour', 3600_000],
    ['minute', 60_000],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return 'zojuist';
}

export function debounce<T extends (...args: any[]) => void>(fn: T, delayMs = 250): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}

export function formatNumber(value: number): string {
  return value.toLocaleString('nl-NL');
}

export function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return `${parts[0].charAt(0)}${parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''}`.toUpperCase();
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Download rijen als CSV (Excel-vriendelijk: puntkomma + BOM). */
export function downloadCsv(filename: string, rows: (string | number | null)[][]): void {
  const escape = (cell: string | number | null) => {
    const text = cell === null ? '' : String(cell);
    return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = '﻿' + rows.map((row) => row.map(escape).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export interface AdminFetchResult<T> {
  data: T | null;
  error: unknown;
}

export interface AdminFetchState<T> {
  data: T | null;
  loading: boolean;
  /** true bij de allereerste keer laden; daarna blijft oude data staan tijdens verversen. */
  initialLoading: boolean;
  error: string | null;
  rawError: unknown;
  reload: () => void;
}

/**
 * Data-hook voor adminmodules: laadt bij mount en bij elke dependency-wijziging,
 * houdt oude data zichtbaar tijdens verversen en biedt `reload()`.
 */
export function useAdminFetch<T>(
  fetcher: () => Promise<AdminFetchResult<T>>,
  deps: DependencyList
): AdminFetchState<T> {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [rawError, setRawError] = useState<unknown>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetcherRef
      .current()
      .then((result) => {
        if (!active) return;
        setData(result.data);
        setRawError(result.error ?? null);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setData(null);
        setRawError(caught);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
        setLoadedOnce(true);
      });

    return () => {
      active = false;
    };
    // fetcher zit in een ref; expliciete deps komen van de aanroepende module.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((current) => current + 1), []);
  return {
    data,
    loading,
    initialLoading: loading && !loadedOnce,
    error: rawError ? describeError(rawError) : null,
    rawError,
    reload,
  };
}


/** Paginering van een lijst in het geheugen. Springt terug naar pagina 1 als de lijst verandert. */
export function usePaged<T>(items: T[], pageSize = 20, resetKey: unknown = items.length) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  useEffect(() => setPage(1), [resetKey]);
  const safePage = Math.min(page, pageCount);
  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize]
  );
  return { page: safePage, setPage, pageCount, pageItems, total: items.length, pageSize };
}

// ---------------------------------------------------------------------------
// Meldingen (toasts)
// ---------------------------------------------------------------------------
type ToastKind = 'success' | 'error';
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const ToastContext = createContext<(kind: ToastKind, message: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = nextId.current++;
    setToasts((current) => [...current.slice(-3), { id, kind, message }]);
    window.setTimeout(
      () => setToasts((current) => current.filter((toast) => toast.id !== id)),
      kind === 'error' ? 7000 : 3500
    );
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 left-4 sm:left-auto z-[70] flex flex-col gap-2 sm:w-96 pointer-events-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.kind === 'error' ? 'alert' : 'status'}
            className={cx(
              'pointer-events-auto flex items-start gap-2.5 rounded-xl border px-4 py-3 shadow-lg text-sm backdrop-blur',
              toast.kind === 'success'
                ? 'bg-white/95 dark:bg-[#13111c]/95 border-emerald-500/30 text-slate-800 dark:text-[#e9e5f6]'
                : 'bg-white/95 dark:bg-[#13111c]/95 border-rose-500/40 text-slate-800 dark:text-[#e9e5f6]'
            )}
          >
            {toast.kind === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            )}
            <span className="flex-1 break-words">{toast.message}</span>
            <button
              type="button"
              aria-label="Melding sluiten"
              onClick={() => setToasts((current) => current.filter((t) => t.id !== toast.id))}
              className={cx('shrink-0 rounded p-0.5 cursor-pointer', tone.faint, 'hover:text-slate-700 dark:hover:text-white')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** `const toast = useToast(); toast.success('Opgeslagen'); toast.error(fout)` */
export function useToast() {
  const push = useContext(ToastContext);
  return useMemo(
    () => ({
      success: (message: string) => push('success', message),
      error: (error: unknown) => push('error', typeof error === 'string' ? error : describeError(error)),
    }),
    [push]
  );
}

export interface AdminActionState {
  busy: boolean;
  error: string | null;
  /** Voer een mutatie uit. Met `{ toast: true }` verschijnt een fout ook als melding. */
  run: (action: () => Promise<void>, options?: { toast?: boolean }) => Promise<boolean>;
  clearError: () => void;
}

/** Voert een mutatie uit met busy-state en consistente foutmeldingen. */
export function useAdminAction(): AdminActionState {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (action: () => Promise<void>, options?: { toast?: boolean }): Promise<boolean> => {
      setBusy(true);
      setError(null);
      try {
        await action();
        return true;
      } catch (caught: unknown) {
        const message = describeError(caught);
        setError(message);
        if (options?.toast) toast.error(message);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [toast]
  );

  const clearError = useCallback(() => setError(null), []);
  return { busy, error, run, clearError };
}

// ---------------------------------------------------------------------------
// Knoppen
// ---------------------------------------------------------------------------
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-[#a88bfa] hover:bg-[#b79dff] text-[#0c0d10] border-transparent font-semibold',
  secondary:
    'bg-white dark:bg-[#1a1726] hover:bg-slate-50 dark:hover:bg-[#221e31] text-slate-800 dark:text-[#e9e5f6] border-slate-200 dark:border-white/[0.09] font-medium',
  ghost:
    'bg-transparent hover:bg-slate-100 dark:hover:bg-white/[0.05] text-slate-600 dark:text-[#b1b1b4] border-transparent font-medium',
  danger: 'bg-rose-600 hover:bg-rose-500 text-white border-transparent font-semibold',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  loading,
  children,
  className,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  icon?: LucideIcon;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg border transition-colors cursor-pointer whitespace-nowrap disabled:opacity-45 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a88bfa]/60',
        size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3.5 text-sm',
        BUTTON_VARIANTS[variant],
        className
      )}
      {...rest}
    >
      {loading ? (
        <LoaderCircle className={cx('animate-spin', size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
      ) : Icon ? (
        <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      ) : null}
      {children}
    </button>
  );
}

type IconTone = 'neutral' | 'accent' | 'amber' | 'emerald' | 'rose' | 'sky';
const ICON_TONES: Record<IconTone, string> = {
  neutral: 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06]',
  accent: 'hover:text-[#a88bfa] hover:bg-[#a88bfa]/10',
  amber: 'hover:text-amber-500 hover:bg-amber-500/10',
  emerald: 'hover:text-emerald-500 hover:bg-emerald-500/10',
  rose: 'hover:text-rose-500 hover:bg-rose-500/10',
  sky: 'hover:text-sky-500 hover:bg-sky-500/10',
};

export function IconButton({
  label,
  icon: Icon,
  tone: iconTone = 'neutral',
  active,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: LucideIcon;
  tone?: IconTone;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cx(
        'w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a88bfa]/60',
        active ? 'text-[#a88bfa] bg-[#a88bfa]/10' : tone.muted,
        ICON_TONES[iconTone],
        className
      )}
      {...rest}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Opbouw
// ---------------------------------------------------------------------------
export function AdminCard({
  children,
  className = '',
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={cx('rounded-xl border', tone.border, tone.surface, padded && 'p-5', className)}>
      {children}
    </section>
  );
}

export function CardTitle({
  icon: Icon,
  title,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <h3 className={cx('text-sm font-bold flex items-center gap-2', tone.strong)}>
        {Icon && <Icon className="w-4 h-4 text-[#a88bfa]" />}
        {title}
      </h3>
      {action}
    </div>
  );
}

export function ModuleHeading({
  title,
  description,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h2 className={cx('text-2xl font-display font-extrabold tracking-tight', tone.strong)}>{title}</h2>
        <p className={cx('text-sm mt-1 max-w-2xl', tone.muted)}>{description}</p>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/** Balk met zoekveld en filters boven een lijst. */
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 mb-4">{children}</div>;
}

// ---------------------------------------------------------------------------
// Toestanden
// ---------------------------------------------------------------------------
export function LoadingState({ rows = 5 }: { label?: string; rows?: number }) {
  return (
    <div role="status" aria-label="Laden" className="space-y-2.5 py-2">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/[0.06] shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 rounded bg-slate-200 dark:bg-white/[0.06]" style={{ width: `${70 - index * 7}%` }} />
            <div className="h-2.5 rounded bg-slate-100 dark:bg-white/[0.04] w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-rose-500/30 bg-rose-500/[0.06] p-4 flex flex-wrap items-center gap-3"
    >
      <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">Kon de gegevens niet laden</p>
        <p className="text-xs text-rose-600/90 dark:text-rose-300/80 mt-0.5 break-words">{message}</p>
      </div>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          Opnieuw proberen
        </Button>
      )}
    </div>
  );
}

/** Melding dat een onderdeel migratie 0004 nodig heeft. */
export function MigrationNotice({ hint }: { hint: string }) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.07] p-4 flex items-start gap-3">
      <Database className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Database nog niet bijgewerkt</p>
        <p className="text-xs text-amber-700/90 dark:text-amber-200/80 mt-0.5">{hint}</p>
      </div>
    </div>
  );
}

export function EmptyState({
  message,
  title,
  icon: Icon = Inbox,
  action,
}: {
  message: string;
  title?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <div className="py-12 flex flex-col items-center text-center">
      <span className={cx('w-11 h-11 rounded-xl flex items-center justify-center mb-3', tone.sunken, tone.faint)}>
        <Icon className="w-5 h-5" />
      </span>
      {title && <p className={cx('text-sm font-semibold', tone.strong)}>{title}</p>}
      <p className={cx('text-sm mt-0.5 max-w-sm', tone.muted)}>{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------
export type PillTone = 'neutral' | 'accent' | 'emerald' | 'amber' | 'rose' | 'sky';
const PILL_TONES: Record<PillTone, string> = {
  neutral: 'bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-[#b1b1b4] border-slate-200 dark:border-white/[0.08]',
  accent: 'bg-[#a88bfa]/12 text-violet-700 dark:text-[#d6c8ff] border-[#a88bfa]/35',
  emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  rose: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
  sky: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
};

export function Pill({
  tone: pillTone = 'neutral',
  icon: Icon,
  children,
}: {
  tone?: PillTone;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap shrink-0',
        PILL_TONES[pillTone]
      )}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  );
}

export const ROLE_LABELS: Record<AdminRole, string> = {
  admin: 'Admin',
  moderator: 'Moderator',
  member: 'Lid',
};

export function RoleBadge({ role }: { role: AdminRole | 'unknown' }) {
  if (role === 'unknown') return <Pill>Onbekend</Pill>;
  const tones: Record<AdminRole, PillTone> = { admin: 'accent', moderator: 'sky', member: 'neutral' };
  return <Pill tone={tones[role]}>{ROLE_LABELS[role]}</Pill>;
}

export function Avatar({
  name,
  url,
  color,
  size = 'md',
}: {
  name: string;
  url?: string | null;
  color?: string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizes = { sm: 'w-7 h-7 text-[10px]', md: 'w-9 h-9 text-xs', lg: 'w-14 h-14 text-lg' };
  return (
    <span
      className={cx(
        'rounded-full flex items-center justify-center font-bold shrink-0 overflow-hidden text-[#0c0d10]',
        sizes[size]
      )}
      style={{ backgroundColor: color || '#a88bfa' }}
      aria-hidden="true"
    >
      {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : initialsOf(name)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Formulieren en filters
// ---------------------------------------------------------------------------
export function SearchInput({
  value,
  onChange,
  placeholder = 'Zoeken…',
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={cx('relative block w-full sm:w-72', className)}>
      <span className="sr-only">{placeholder}</span>
      <Search className={cx('w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none', tone.faint)} />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cx(inputClass, 'pl-9')}
      />
    </label>
  );
}

export function SelectInput<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
  disabled,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as T)}
      className={cx(selectClass, 'max-w-full pr-8 cursor-pointer', className)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/** Rij met filterknoppen ("Alle · Actief · Gesloten"), optioneel met aantallen. */
export function FilterChips<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; count?: number }[];
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx('inline-flex max-w-full overflow-x-auto p-0.5 rounded-lg border', tone.border, tone.sunken)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cx(
              'h-8 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5',
              active
                ? 'bg-white dark:bg-[#1f1b2e] text-slate-900 dark:text-white shadow-sm'
                : cx(tone.muted, 'hover:text-slate-900 dark:hover:text-white')
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span className={cx('tabular-nums text-[10px] px-1.5 rounded-full', active ? 'bg-[#a88bfa]/20 text-[#a88bfa]' : 'bg-slate-200/70 dark:bg-white/[0.06]')}>
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className={cx('block text-xs font-semibold mb-1.5', tone.body)}>{label}</span>
      {children}
      {error ? (
        <span className="block mt-1 text-xs text-rose-600 dark:text-rose-300">{error}</span>
      ) : hint ? (
        <span className={cx('block mt-1 text-xs', tone.faint)}>{hint}</span>
      ) : null}
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className={cx('text-sm font-semibold cursor-pointer', tone.strong)}>
          {label}
        </label>
        {description && <p className={cx('text-xs mt-0.5', tone.muted)}>{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative w-10 h-6 rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a88bfa]/60',
          checked ? 'bg-[#a88bfa]' : 'bg-slate-300 dark:bg-white/[0.12]'
        )}
      >
        <span
          className={cx(
            'absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform',
            checked && 'translate-x-4'
          )}
        />
      </button>
    </div>
  );
}

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className={cx('flex items-center justify-between gap-3 pt-4 mt-2 border-t text-xs', tone.border, tone.muted)}>
      <span className="tabular-nums">
        {from}–{to} van {formatNumber(total)}
      </span>
      <div className="flex items-center gap-1">
        <IconButton label="Vorige pagina" icon={ChevronLeft} disabled={page <= 1} onClick={() => onChange(page - 1)} />
        <span className="tabular-nums px-2">
          {page} / {pageCount}
        </span>
        <IconButton label="Volgende pagina" icon={ChevronRight} disabled={page >= pageCount} onClick={() => onChange(page + 1)} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabel
// ---------------------------------------------------------------------------
export const table = {
  wrap: 'overflow-x-auto -mx-5 px-5',
  table: 'w-full text-left',
  head: cx('text-[11px] uppercase tracking-wider border-b', 'text-slate-400 dark:text-[#6a6b6c]', 'border-slate-200 dark:border-white/[0.07]'),
  th: 'py-2.5 pr-4 font-semibold whitespace-nowrap',
  body: 'divide-y divide-slate-100 dark:divide-white/[0.05]',
  row: 'hover:bg-slate-50/80 dark:hover:bg-white/[0.025] transition-colors',
  td: 'py-3 pr-4 align-middle',
};

// ---------------------------------------------------------------------------
// Vensters: modal, zijpaneel en bevestiging
// ---------------------------------------------------------------------------
function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Voorkom dat het hele dashboard ook sluit.
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open, onClose]);
}

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  useEscape(open, onClose);
  const titleId = useId();
  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx(
          'relative w-full rounded-t-2xl sm:rounded-2xl border shadow-2xl max-h-[92vh] flex flex-col',
          widths[size],
          tone.border,
          tone.surface
        )}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
          <div className="min-w-0">
            <h2 id={titleId} className={cx('text-base font-bold', tone.strong)}>
              {title}
            </h2>
            {description && <div className={cx('text-sm mt-1', tone.muted)}>{description}</div>}
          </div>
          <IconButton label="Sluiten" icon={X} onClick={onClose} />
        </div>
        {children && <div className="px-5 pb-4 overflow-y-auto">{children}</div>}
        {footer && (
          <div className={cx('flex flex-wrap justify-end gap-2 px-5 py-3.5 border-t rounded-b-2xl', tone.border, tone.sunken)}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Drawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[55] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30 dark:bg-black/50" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        className={cx('relative w-full max-w-xl h-full flex flex-col border-l shadow-2xl', tone.border, tone.surface)}
      >
        <header className={cx('flex items-start justify-between gap-4 px-5 py-4 border-b', tone.border)}>
          <div className="min-w-0">
            <div className={cx('text-base font-bold truncate', tone.strong)}>{title}</div>
            {subtitle && <div className={cx('text-xs mt-0.5', tone.muted)}>{subtitle}</div>}
          </div>
          <IconButton label="Sluiten" icon={X} onClick={onClose} />
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">{children}</div>
        {footer && (
          <footer className={cx('flex flex-wrap justify-end gap-2 px-5 py-3.5 border-t', tone.border, tone.sunken)}>
            {footer}
          </footer>
        )}
      </aside>
    </div>
  );
}

/**
 * Bevestigingsvenster. Met `requireReason` moet er een reden (min. 3 tekens)
 * worden ingevuld; die gaat mee naar `onConfirm` en komt in het moderatielog.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Bevestigen',
  danger = false,
  requireReason = false,
  reasonLabel = 'Reden (komt in het moderatielog)',
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  requireReason?: boolean;
  reasonLabel?: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  useEffect(() => {
    if (open) setReason('');
  }, [open]);
  const canConfirm = !busy && (!requireReason || reason.trim().length >= 3);

  return (
    <Modal
      open={open}
      title={title}
      description={message}
      onClose={() => !busy && onCancel()}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Annuleren
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            loading={busy}
            disabled={!canConfirm}
            onClick={() => canConfirm && onConfirm(reason.trim())}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {requireReason && (
        <Field label={reasonLabel} hint="Minimaal 3 tekens.">
          <textarea
            autoFocus
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            placeholder="Bijv. overtreding van de forumregels"
            className={textareaClass}
          />
        </Field>
      )}
      {error && (
        <p role="alert" className="mt-3 text-xs text-rose-600 dark:text-rose-300 break-words">
          {error}
        </p>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Grafieken
// ---------------------------------------------------------------------------
export function Sparkline({ values, className = 'text-[#a88bfa]' }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const w = 100;
  const h = 28;
  const step = w / (values.length - 1);
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * (h - 3) - 1.5).toFixed(1)}`);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cx('w-full h-7', className)} aria-hidden="true">
      <polygon points={`0,${h} ${points.join(' ')} ${w},${h}`} fill="currentColor" opacity="0.12" />
      <polyline points={points.join(' ')} fill="none" stroke="currentColor" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  spark,
  accent = 'text-[#a88bfa]',
  onClick,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  hint?: string;
  spark?: number[];
  accent?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className={cx('text-xs font-semibold', tone.muted)}>{label}</span>
        <Icon className={cx('w-4 h-4 shrink-0', accent)} />
      </div>
      <p className={cx('mt-2 text-3xl font-display font-extrabold tabular-nums tracking-tight', tone.strong)}>
        {typeof value === 'number' ? formatNumber(value) : value}
      </p>
      {hint && <p className={cx('text-xs mt-0.5', tone.faint)}>{hint}</p>}
      {spark && (
        <div className="mt-3">
          <Sparkline values={spark} className={accent} />
        </div>
      )}
    </>
  );
  const base = cx('rounded-xl border p-4 text-left', tone.border, tone.surface);
  return onClick ? (
    <button type="button" onClick={onClick} className={cx(base, 'cursor-pointer hover:border-[#a88bfa]/40 transition-colors w-full')}>
      {content}
    </button>
  ) : (
    <div className={base}>{content}</div>
  );
}

export interface BarSeries {
  key: string;
  label: string;
  color: string;
}

/** Gestapelde staafgrafiek per dag. */
export function StackedBarChart({
  data,
  series,
  labelFor,
}: {
  data: { label: string; values: Record<string, number> }[];
  series: BarSeries[];
  labelFor?: (index: number) => string;
}) {
  const totals = data.map((d) => series.reduce((sum, s) => sum + (d.values[s.key] ?? 0), 0));
  const max = Math.max(1, ...totals);
  return (
    <div>
      <div className="flex items-center gap-4 flex-wrap mb-3">
        {series.map((s) => (
          <span key={s.key} className={cx('inline-flex items-center gap-1.5 text-xs', tone.muted)}>
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="flex items-end gap-1 sm:gap-1.5 h-40">
        {data.map((d, index) => (
          <div
            key={d.label}
            className="flex-1 h-full flex flex-col justify-end group relative"
            title={`${d.label}: ${series.map((s) => `${s.label} ${d.values[s.key] ?? 0}`).join(', ')}`}
          >
            <div className="flex flex-col-reverse rounded-t-md overflow-hidden min-h-[2px] bg-slate-100 dark:bg-white/[0.04]" style={{ height: `${(totals[index] / max) * 100}%` }}>
              {series.map((s) => {
                const v = d.values[s.key] ?? 0;
                if (!v) return null;
                return <div key={s.key} style={{ height: `${(v / totals[index]) * 100}%`, backgroundColor: s.color }} />;
              })}
            </div>
            <span className={cx('pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-semibold tabular-nums opacity-0 group-hover:opacity-100 transition-opacity', tone.strong)}>
              {totals[index]}
            </span>
          </div>
        ))}
      </div>
      <div className="flex gap-1 sm:gap-1.5 mt-2">
        {data.map((d, index) => (
          <span key={d.label} className={cx('flex-1 text-center text-[10px] tabular-nums truncate', tone.faint)}>
            {labelFor ? labelFor(index) : d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Horizontale balk met percentage (voor peilingresultaten). */
export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs mb-1">
        <span className={cx('truncate', tone.body)}>{label}</span>
        <span className={cx('tabular-nums shrink-0', tone.muted)}>
          {value} · {pct}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
        <div className="h-full rounded-full bg-[#a88bfa]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
