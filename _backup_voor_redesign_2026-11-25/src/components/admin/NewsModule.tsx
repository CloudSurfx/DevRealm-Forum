import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Newspaper, Pencil, Plus, Trash2 } from 'lucide-react';
import type { AdminModuleProps, NewsRow } from '../../types/admin';
import { fetchPeople, mutateAndLog, supabase, type PeopleDirectory } from './client';
import {
  AdminCard,
  Button,
  ConfirmDialog,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  FilterChips,
  IconButton,
  LoadingState,
  ModuleHeading,
  Pagination,
  Pill,
  SearchInput,
  Toggle,
  Toolbar,
  cx,
  formatDate,
  formatRelative,
  inputClass,
  slugify,
  table,
  textareaClass,
  tone,
  useAdminAction,
  useAdminFetch,
  usePaged,
  useToast,
} from './ui';

type StatusFilter = 'all' | 'published' | 'draft';

interface NewsData {
  items: NewsRow[];
  people: PeopleDirectory;
}

export function NewsModule({ currentUserId, role, refresh, refreshKey }: AdminModuleProps) {
  const toast = useToast();
  const action = useAdminAction();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [editing, setEditing] = useState<NewsRow | 'new' | null>(null);
  const [deleting, setDeleting] = useState<NewsRow | null>(null);

  const { data, initialLoading, error, reload } = useAdminFetch<NewsData>(async () => {
    const [news, people] = await Promise.all([
      supabase.from('news').select('*').order('published_at', { ascending: false }).limit(500),
      fetchPeople(),
    ]);
    if (news.error) return { data: null, error: news.error };
    if (people.error || !people.data) return { data: null, error: people.error };
    return { data: { items: news.data ?? [], people: people.data }, error: null };
  }, [refreshKey]);

  const items = useMemo(() => data?.items ?? [], [data]);
  const counts = {
    all: items.length,
    published: items.filter((n) => n.published).length,
    draft: items.filter((n) => !n.published).length,
  };
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((n) => {
      if (status === 'published' && !n.published) return false;
      if (status === 'draft' && n.published) return false;
      return !q || n.title.toLowerCase().includes(q) || n.category.toLowerCase().includes(q);
    });
  }, [items, query, status]);
  const paged = usePaged(filtered, 20, `${query}|${status}`);
  const categories = useMemo(() => [...new Set(items.map((n) => n.category).filter(Boolean))].sort(), [items]);

  const togglePublished = async (item: NewsRow) => {
    const next = !item.published;
    const ok = await action.run(
      () =>
        mutateAndLog(
          () =>
            supabase
              .from('news')
              .update({ published: next, ...(next ? { published_at: new Date().toISOString() } : {}) })
              .eq('id', item.id),
          {
            moderatorId: currentUserId,
            action: next ? 'publish' : 'unpublish',
            targetTable: 'news',
            targetId: item.id,
            reason: item.title,
          }
        ),
      { toast: true }
    );
    if (ok) {
      toast.success(next ? `“${item.title}” staat nu online.` : `“${item.title}” is teruggezet naar concept.`);
      reload();
      refresh();
    }
  };

  const confirmDelete = async (reason: string) => {
    if (!deleting) return;
    const target = deleting;
    const ok = await action.run(() =>
      mutateAndLog(() => supabase.from('news').delete().eq('id', target.id), {
        moderatorId: currentUserId,
        action: 'delete',
        targetTable: 'news',
        targetId: target.id,
        reason: `${target.title} — ${reason}`,
      })
    );
    if (ok) {
      setDeleting(null);
      toast.success('Nieuwsbericht verwijderd.');
      reload();
      refresh();
    }
  };

  return (
    <div>
      <ModuleHeading title="Nieuws" description="Schrijf en bewerk nieuwsberichten. Concepten zie je alleen hier; gepubliceerde berichten staan op de site.">
        <Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>
          Nieuw bericht
        </Button>
      </ModuleHeading>

      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Zoek op titel of categorie" />
        <FilterChips
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'Alle', count: counts.all },
            { value: 'published', label: 'Online', count: counts.published },
            { value: 'draft', label: 'Concept', count: counts.draft },
          ]}
        />
      </Toolbar>

      <AdminCard>
        {error && <ErrorState message={error} onRetry={reload} />}
        {initialLoading && <LoadingState />}
        {!initialLoading && !error && filtered.length === 0 && (
          <EmptyState
            icon={Newspaper}
            message={items.length ? 'Geen berichten gevonden met deze filters.' : 'Nog geen nieuwsberichten.'}
            action={
              items.length === 0 && (
                <Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>
                  Eerste bericht schrijven
                </Button>
              )
            }
          />
        )}
        {!initialLoading && !error && data && filtered.length > 0 && (
          <>
            <div className={table.wrap}>
              <table className={cx(table.table, 'min-w-[760px]')}>
                <thead className={table.head}>
                  <tr>
                    <th className={table.th}>Bericht</th>
                    <th className={table.th}>Categorie</th>
                    <th className={table.th}>Status</th>
                    <th className={table.th}>Datum</th>
                    <th className={cx(table.th, 'text-right')}>Acties</th>
                  </tr>
                </thead>
                <tbody className={table.body}>
                  {paged.pageItems.map((item) => (
                    <tr key={item.id} className={table.row}>
                      <td className={cx(table.td, 'max-w-[360px]')}>
                        <button type="button" onClick={() => setEditing(item)} className="text-left w-full cursor-pointer group">
                          <span className={cx('block text-sm font-semibold truncate group-hover:text-[#a88bfa] transition-colors', tone.strong)}>
                            {item.title}
                          </span>
                          <span className={cx('block text-xs truncate', tone.muted)}>
                            {item.summary || 'Geen samenvatting'} · {data.people.name(item.author_id, item.author_name ?? 'Redactie')}
                          </span>
                        </button>
                      </td>
                      <td className={table.td}>
                        <Pill tone="accent">{item.category}</Pill>
                      </td>
                      <td className={table.td}>
                        {item.published ? <Pill tone="emerald">Online</Pill> : <Pill tone="amber">Concept</Pill>}
                      </td>
                      <td className={cx(table.td, 'text-xs whitespace-nowrap', tone.muted)} title={formatDate(item.published_at)}>
                        {formatRelative(item.published_at)}
                      </td>
                      <td className={table.td}>
                        <div className="flex items-center justify-end gap-0.5">
                          <IconButton label="Bewerken" icon={Pencil} tone="accent" onClick={() => setEditing(item)} />
                          <IconButton
                            label={item.published ? 'Offline halen' : 'Publiceren'}
                            icon={item.published ? EyeOff : Eye}
                            tone="emerald"
                            disabled={action.busy}
                            onClick={() => void togglePublished(item)}
                          />
                          {role === 'admin' && (
                            <IconButton
                              label="Verwijderen"
                              icon={Trash2}
                              tone="rose"
                              onClick={() => {
                                action.clearError();
                                setDeleting(item);
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

      {editing && (
        <NewsEditor
          item={editing === 'new' ? null : editing}
          categories={categories}
          currentUserId={currentUserId}
          authorName={data?.people.name(currentUserId, 'Redactie') ?? 'Redactie'}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            toast.success(message);
            reload();
            refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Nieuwsbericht verwijderen?"
        message={deleting ? `“${deleting.title}” wordt definitief verwijderd.` : ''}
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

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------
function readTime(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min leestijd`;
}

function NewsEditor({
  item,
  categories,
  currentUserId,
  authorName,
  onClose,
  onSaved,
}: {
  item: NewsRow | null;
  categories: string[];
  currentUserId: string;
  authorName: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const action = useAdminAction();
  const [title, setTitle] = useState(item?.title ?? '');
  const [slug, setSlug] = useState(item?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!item);
  const [category, setCategory] = useState(item?.category ?? 'Community');
  const [summary, setSummary] = useState(item?.summary ?? '');
  const [body, setBody] = useState(item?.body ?? '');
  const [coverUrl, setCoverUrl] = useState(item?.cover_url ?? '');
  const [published, setPublished] = useState(item?.published ?? false);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(title));
  }, [title, slugTouched]);

  const errors = {
    title: title.trim().length < 3 ? 'Minimaal 3 tekens.' : null,
    slug: !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? 'Alleen kleine letters, cijfers en streepjes.' : null,
    summary: summary.length > 300 ? 'Maximaal 300 tekens.' : null,
    cover: coverUrl && !/^https?:\/\//.test(coverUrl) ? 'Moet beginnen met http:// of https://' : null,
  };
  const valid = !errors.title && !errors.slug && !errors.summary && !errors.cover && category.trim().length >= 2;

  const save = async () => {
    const payload = {
      title: title.trim(),
      slug,
      category: category.trim(),
      summary: summary.trim(),
      body: body.trim(),
      cover_url: coverUrl.trim() || null,
      read_time: readTime(body),
      published,
    };
    const ok = await action.run(async () => {
      if (item) {
        const publishNow = published && !item.published;
        await mutateAndLog(
          () =>
            supabase
              .from('news')
              .update({ ...payload, ...(publishNow ? { published_at: new Date().toISOString() } : {}) })
              .eq('id', item.id),
          {
            moderatorId: currentUserId,
            action: publishNow ? 'publish' : 'edit',
            targetTable: 'news',
            targetId: item.id,
            reason: payload.title,
          }
        );
      } else {
        const { data: created, error } = await supabase
          .from('news')
          .insert({
            ...payload,
            author_id: currentUserId,
            author_name: authorName,
            published_at: new Date().toISOString(),
          })
          .select('id')
          .single();
        if (error) {
          if ((error as { code?: string }).code === '23505') throw new Error('Er bestaat al een bericht met dit webadres (slug). Kies een ander.');
          throw error;
        }
        await mutateAndLog(async () => ({ error: null }), {
          moderatorId: currentUserId,
          action: 'create',
          targetTable: 'news',
          targetId: created.id,
          reason: payload.title,
        });
      }
    });
    if (ok) onSaved(item ? 'Wijzigingen opgeslagen.' : published ? 'Bericht gepubliceerd.' : 'Concept opgeslagen.');
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={item ? 'Bericht bewerken' : 'Nieuw bericht'}
      subtitle={item ? `Laatst gewijzigd ${formatRelative(item.updated_at)}` : 'Schrijf een update voor de community'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={action.busy}>
            Annuleren
          </Button>
          <Button variant="primary" disabled={!valid} loading={action.busy} onClick={() => void save()}>
            {item ? 'Opslaan' : published ? 'Publiceren' : 'Concept opslaan'}
          </Button>
        </>
      }
    >
      <Field label="Titel" error={title && errors.title}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} className={inputClass} placeholder="Bijv. Nieuwe badges zijn live" autoFocus />
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Webadres (slug)" error={slug && errors.slug} hint="Wordt automatisch gemaakt uit de titel.">
          <input
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
            className={cx(inputClass, 'font-mono text-xs')}
          />
        </Field>
        <Field label="Categorie">
          <input list="admin-news-categories" value={category} onChange={(e) => setCategory(e.target.value)} maxLength={40} className={inputClass} />
          <datalist id="admin-news-categories">
            {[...new Set(['Community', 'Platform Update', 'Evenement', ...categories])].map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
      </div>
      <Field label={`Samenvatting (${summary.length}/300)`} error={errors.summary} hint="Verschijnt in de nieuwslijst op de site.">
        <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} className={textareaClass} />
      </Field>
      <Field label="Bericht" hint={`${readTime(body)} · Markdown en witregels blijven behouden.`}>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} className={cx(textareaClass, 'min-h-[240px]')} />
      </Field>
      <Field label="Omslagafbeelding (optioneel)" error={errors.cover}>
        <input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://…" className={inputClass} />
      </Field>
      <div className={cx('rounded-lg border p-4', tone.border)}>
        <Toggle
          checked={published}
          onChange={setPublished}
          label="Gepubliceerd"
          description={published ? 'Iedereen ziet dit bericht op de site.' : 'Alleen moderators en admins zien dit concept.'}
        />
      </div>
      {action.error && (
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-300 break-words">
          {action.error}
        </p>
      )}
    </Drawer>
  );
}
