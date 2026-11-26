import { useMemo, useState } from 'react';
import { Heart, LayoutGrid, Trash2 } from 'lucide-react';
import type { AdminModuleProps, GalleryProjectRow } from '../../types/admin';
import { fetchPeople, mutateAndLog, supabase, type PeopleDirectory } from './client';
import {
  AdminCard,
  Avatar,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  ModuleHeading,
  Pagination,
  Pill,
  SearchInput,
  SelectInput,
  Toolbar,
  cx,
  formatNumber,
  formatRelative,
  tone,
  useAdminAction,
  useAdminFetch,
  usePaged,
  useToast,
} from './ui';

type SortKey = 'newest' | 'likes';

interface GalleryData {
  projects: GalleryProjectRow[];
  likes: Map<string, number>;
  people: PeopleDirectory;
}

export function GalleryModule({ currentUserId, role, refresh, refreshKey, navigate }: AdminModuleProps) {
  const toast = useToast();
  const action = useAdminAction();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [deleting, setDeleting] = useState<GalleryProjectRow | null>(null);

  const { data, initialLoading, error, reload } = useAdminFetch<GalleryData>(async () => {
    const [projects, likes, people] = await Promise.all([
      supabase
        .from('gallery_projects')
        .select('id, title, description, stack, author_id, author_name, preview_preset, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase.from('project_likes').select('project_id').limit(20000),
      fetchPeople(),
    ]);
    if (projects.error) return { data: null, error: projects.error };
    if (people.error || !people.data) return { data: null, error: people.error };
    const likeMap = new Map<string, number>();
    (likes.data ?? []).forEach((l) => likeMap.set(l.project_id, (likeMap.get(l.project_id) ?? 0) + 1));
    return { data: { projects: projects.data ?? [], likes: likeMap, people: people.data }, error: null };
  }, [refreshKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (data?.projects ?? []).filter(
      (p) => !q || p.title.toLowerCase().includes(q) || p.stack.toLowerCase().includes(q) || (p.author_name ?? '').toLowerCase().includes(q)
    );
    if (sort === 'likes') return [...list].sort((a, b) => (data?.likes.get(b.id) ?? 0) - (data?.likes.get(a.id) ?? 0));
    return list;
  }, [data, query, sort]);
  const paged = usePaged(filtered, 12, `${query}|${sort}`);

  const confirmDelete = async (reason: string) => {
    if (!deleting) return;
    const target = deleting;
    const ok = await action.run(() =>
      mutateAndLog(() => supabase.from('gallery_projects').delete().eq('id', target.id), {
        moderatorId: currentUserId,
        action: 'delete',
        targetTable: 'gallery_projects',
        targetId: target.id,
        reason: `${target.title} — ${reason}`,
      })
    );
    if (ok) {
      setDeleting(null);
      toast.success('Project verwijderd.');
      reload();
      refresh();
    }
  };

  return (
    <div>
      <ModuleHeading
        title="Galerij"
        description={
          role === 'admin'
            ? 'Alle projecten die leden hebben gedeeld. Verwijder projecten die niet in de galerij horen.'
            : 'Alle projecten die leden hebben gedeeld. Alleen admins kunnen projecten verwijderen.'
        }
      />

      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Zoek op titel, techniek of maker" />
        <SelectInput
          label="Sorteren"
          value={sort}
          onChange={setSort}
          options={[
            { value: 'newest', label: 'Nieuwste eerst' },
            { value: 'likes', label: 'Meeste likes' },
          ]}
        />
      </Toolbar>

      {error && <ErrorState message={error} onRetry={reload} />}
      {initialLoading && (
        <AdminCard>
          <LoadingState />
        </AdminCard>
      )}
      {!initialLoading && !error && filtered.length === 0 && (
        <AdminCard>
          <EmptyState icon={LayoutGrid} message={data?.projects.length ? 'Geen projecten gevonden.' : 'Nog geen projecten gedeeld.'} />
        </AdminCard>
      )}
      {!initialLoading && !error && data && filtered.length > 0 && (
        <>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {paged.pageItems.map((project) => {
              const person = project.author_id ? data.people.byId.get(project.author_id) : undefined;
              const name = person?.display_name ?? project.author_name ?? 'Onbekend';
              return (
                <AdminCard key={project.id} className="flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <Pill tone="accent">{project.stack || 'Project'}</Pill>
                    {role === 'admin' && (
                      <IconButton
                        label="Project verwijderen"
                        icon={Trash2}
                        tone="rose"
                        onClick={() => {
                          action.clearError();
                          setDeleting(project);
                        }}
                      />
                    )}
                  </div>
                  <h3 className={cx('text-sm font-bold mt-2', tone.strong)}>{project.title}</h3>
                  <p className={cx('text-xs mt-1 line-clamp-3 flex-1', tone.muted)}>{project.description || 'Geen beschrijving.'}</p>
                  <div className={cx('flex items-center gap-2 mt-4 pt-3 border-t', tone.border)}>
                    <button
                      type="button"
                      onClick={() => person && navigate('members', person.id)}
                      className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer text-left"
                    >
                      <Avatar name={name} url={person?.avatar_url} color={person?.avatar_color} size="sm" />
                      <span className={cx('text-xs font-semibold truncate', tone.body)}>{name}</span>
                    </button>
                    <span className={cx('inline-flex items-center gap-1 text-xs tabular-nums', tone.muted)}>
                      <Heart className="w-3.5 h-3.5 text-rose-400" /> {formatNumber(data.likes.get(project.id) ?? 0)}
                    </span>
                    <span className={cx('text-xs', tone.faint)}>{formatRelative(project.created_at)}</span>
                  </div>
                </AdminCard>
              );
            })}
          </div>
          <Pagination {...paged} onChange={paged.setPage} />
        </>
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Project verwijderen?"
        message={deleting ? `“${deleting.title}” en de likes worden definitief verwijderd.` : ''}
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
