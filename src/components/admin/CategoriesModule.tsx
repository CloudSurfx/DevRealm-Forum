import { useMemo, useState } from 'react';
import { Eye, Plus, Trash2 } from 'lucide-react';
import type { AdminModuleProps, CategoryRow } from '../../types/admin';
import { mutateAndLog, supabase } from './client';
import { slugify } from '../../lib/releasesApi';
import {
  AdminCard,
  Button,
  ConfirmDialog,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  LoadingState,
  ModuleHeading,
  SearchInput,
  Toolbar,
  cx,
  formatRelative,
  inputClass,
  table,
  tone,
  useAdminAction,
  useAdminFetch,
  useToast,
} from './ui';

interface CategoriesData {
  categories: CategoryRow[];
}

export function CategoriesModule({ currentUserId, refresh, refreshKey, role }: AdminModuleProps) {
  const toast = useToast();
  const action = useAdminAction();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<CategoryRow | 'new' | null>(null);
  const [deleting, setDeleting] = useState<CategoryRow | null>(null);

  const { data, initialLoading, error, reload } = useAdminFetch<CategoriesData>(async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) return { data: null, error };
    return { data: { categories: data ?? [] }, error: null };
  }, [refreshKey]);

  const categories = useMemo(() => data?.categories ?? [], [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories.filter((c) =>
      !q || c.name.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q)
    );
  }, [categories, query]);

  const confirmDelete = async (reason: string) => {
    if (!deleting) return;
    const target = deleting;
    const ok = await action.run(() =>
      mutateAndLog(() => supabase.from('categories').delete().eq('id', target.id), {
        moderatorId: currentUserId,
        action: 'delete',
        targetTable: 'categories',
        targetId: target.id,
        reason: `${target.name} — ${reason}`,
      })
    );
    if (ok) {
      setDeleting(null);
      toast.success('Categorie verwijderd.');
      reload();
      refresh();
    }
  };

  return (
    <div>
      <ModuleHeading title="Categorieën" description="Beheer forumcategorieën, hun volgorde en kleur.">
        <Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>
          Nieuwe categorie
        </Button>
      </ModuleHeading>

      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Zoek op naam of beschrijving" />
      </Toolbar>

      <AdminCard>
        {error && <ErrorState message={error} onRetry={reload} />}
        {initialLoading && <LoadingState />}
        {!initialLoading && !error && filtered.length === 0 && (
          <EmptyState
            icon={Eye}
            message={categories.length ? 'Geen categorieën gevonden.' : 'Nog geen categorieën.'}
            action={
              categories.length === 0 && (
                <Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>
                  Eerste categorie aanmaken
                </Button>
              )
            }
          />
        )}
        {!initialLoading && !error && data && filtered.length > 0 && (
          <>
            <div className={table.wrap}>
              <table className={cx(table.table, 'min-w-[720px]')}>
                <thead className={table.head}>
                  <tr>
                    <th className={cx(table.th, 'w-12')}>#</th>
                    <th className={table.th}>Categorie</th>
                    <th className={table.th}>Beschrijving</th>
                    <th className={table.th}>Kleur</th>
                    <th className={cx(table.th, 'text-right')}>Acties</th>
                  </tr>
                </thead>
                <tbody className={table.body}>
                  {filtered.map((cat) => (
                    <tr key={cat.id} className={table.row}>
                      <td className={cx(table.td, 'text-center text-sm font-mono', tone.muted)}>
                        {cat.sort_order + 1}
                      </td>
                      <td className={table.td}>
                        <button type="button" onClick={() => setEditing(cat)} className="text-left w-full cursor-pointer group">
                          <span className={cx('text-sm font-semibold flex items-center gap-1.5 group-hover:text-[#a88bfa] transition-colors', tone.strong)}>
                            {cat.name}
                          </span>
                          <span className={cx('text-xs', tone.muted)}>ID: {cat.id.slice(0, 8)}</span>
                        </button>
                      </td>
                      <td className={cx(table.td, 'text-sm max-w-[240px]', tone.body)}>
                        {cat.description || <span className={tone.faint}>Geen beschrijving</span>}
                      </td>
                      <td className={table.td}>
                        {cat.color ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="w-6 h-6 rounded border" style={{ backgroundColor: cat.color }} />
                            <span className="text-xs font-mono">{cat.color}</span>
                          </span>
                        ) : (
                          <span className={cx('text-xs', tone.faint)}>Geen kleur</span>
                        )}
                      </td>
                      <td className={cx(table.td, 'text-right')}>
                        <div className="flex items-center justify-end gap-1">
                          <IconButton label="Bewerken" icon={Eye} tone="accent" onClick={() => setEditing(cat)} />
                          {role === 'admin' && (
                            <IconButton
                              label="Verwijderen"
                              icon={Trash2}
                              tone="rose"
                              onClick={() => {
                                action.clearError();
                                setDeleting(cat);
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
          </>
        )}
      </AdminCard>

      {editing && (
        <CategoryDrawer
          category={editing === 'new' ? null : editing}
          currentUserId={currentUserId}
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
        title="Categorie verwijderen?"
        message={deleting ? `"${deleting.name}" wordt definitief verwijderd. Dit lukt alleen als er geen topics meer in staan.` : ''}
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

function CategoryDrawer({
  category,
  currentUserId,
  onClose,
  onSaved,
}: {
  category: CategoryRow | null;
  currentUserId: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const action = useAdminAction();
  const [name, setName] = useState(category?.name ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [color, setColor] = useState(category?.color ?? '#a88bfa');
  const [sortOrder, setSortOrder] = useState(category?.sort_order ?? 0);

  const errors = {
    name: name.trim().length < 2 ? 'Minimaal 2 tekens.' : null,
    color: color && !/^#[0-9a-fA-F]{6}$/.test(color) ? 'Kleur moet een hex code zijn (bijv. #a88bfa).' : null,
  };
  const valid = !errors.name && !errors.color && name.trim().length >= 2;

  const save = async () => {
    const fields = { name: name.trim(), description: description.trim(), color: color.trim() || null };
    const ok = await action.run(async () => {
      if (category) {
        await mutateAndLog(
          () => supabase.from('categories').update({ ...fields, sort_order: sortOrder }).eq('id', category.id),
          { moderatorId: currentUserId, action: 'edit', targetTable: 'categories', targetId: category.id, reason: fields.name }
        );
      } else {
        const { data: maxOrder, error: orderError } = await supabase.from('categories').select('sort_order').order('sort_order', { ascending: false }).limit(1);
        if (orderError) throw orderError;
        const id = slugify(fields.name).replace(/^release-/, 'categorie-'); // slugify valt bij korte namen terug op 'release-…'
        await mutateAndLog(
          () => supabase.from('categories').insert({ id, ...fields, sort_order: (maxOrder?.[0]?.sort_order ?? -1) + 1 }),
          { moderatorId: currentUserId, action: 'create', targetTable: 'categories', targetId: id, reason: fields.name }
        );
      }
    });
    if (ok) onSaved(category ? 'Categorie opgeslagen.' : 'Categorie aangemaakt.');
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={category ? 'Categorie bewerken' : 'Nieuwe categorie'}
      subtitle={category ? `Laatst gewijzigd ${formatRelative(category.created_at)}` : 'Voeg een nieuwe categorie toe aan het forum'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={action.busy}>Annuleren</Button>
          <Button variant="primary" disabled={!valid} loading={action.busy} onClick={() => void save()}>
            {category ? 'Opslaan' : 'Aanmaken'}
          </Button>
        </>
      }
    >
      <Field label="Naam" error={errors.name}>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={inputClass} placeholder="Bijv. React & Vue" autoFocus />
      </Field>
      <Field label="Beschrijving (optioneel)" hint="Wordt getoond in de categorie-overzichten.">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputClass.replace('h-9', 'min-h-[80px] py-2')} placeholder="Beschrijving van de categorie..." />
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Kleur (hex)" error={errors.color} hint="Bijv. #a88bfa. Laat leeg voor standaard.">
          <input value={color} onChange={(e) => setColor(e.target.value)} maxLength={7} className={cx(inputClass, 'font-mono text-xs')} placeholder="#a88bfa" />
        </Field>
        <Field label="Volgorde" hint="Lager = hoger in de lijst.">
          <input type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} className={cx(inputClass, 'w-24')} />
        </Field>
      </div>
      {action.error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-300 break-words">{action.error}</p>}
    </Drawer>
  );
}
