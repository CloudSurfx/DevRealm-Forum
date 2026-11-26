import { useMemo, useState } from 'react';
import { Shield, Wrench, Bell, MessageSquare, Layers, BarChart2 } from 'lucide-react';
import type { AdminModuleProps, SiteSettingRow } from '../../types/admin';
import { fetchSettings, updateSetting, DEFAULT_SETTINGS } from './client';
import {
  AdminCard,
  Field,
  LoadingState,
  ModuleHeading,
  Toggle,
  cx,
  inputClass,
  textareaClass,
  tone,
  useAdminFetch,
  useToast,
} from './ui';

type SettingCategory = 'Algemeen' | 'Topics' | 'Reputatie' | 'Chat' | 'Galerij' | 'Peilingen' | 'Notificaties' | 'Moderatie';

const CATEGORY_ICONS: Record<SettingCategory, typeof Shield> = {
  Algemeen: Shield,
  Topics: MessageSquare,
  Reputatie: BarChart2,
  Chat: MessageSquare,
  Galerij: Layers,
  Peilingen: BarChart2,
  Notificaties: Bell,
  Moderatie: Wrench,
};

interface SettingsData {
  settings: SiteSettingRow[];
}

export function SettingsModule({ refreshKey }: AdminModuleProps) {
  const toast = useToast();
  const [activeCategory, setActiveCategory] = useState<SettingCategory>('Algemeen');
  const [saving, setSaving] = useState<Set<string>>(new Set());

  const { data, initialLoading, error, reload } = useAdminFetch<SettingsData>(async () => {
    const { data, error } = await fetchSettings();
    return { data: { settings: data ?? [] }, error };
  }, [refreshKey]);

  // Merge DB settings with defaults
  const allSettings = useMemo(() => {
    const dbSettings = new Map((data?.settings ?? []).map(s => [s.key, s]));
    return DEFAULT_SETTINGS.map(def => ({
      ...def,
      value: dbSettings.get(def.key)?.value ?? def.defaultValue,
      description: def.description,
      dbValue: dbSettings.get(def.key)?.value,
    }));
  }, [data]);

  const categories: SettingCategory[] = [
    'Algemeen', 'Topics', 'Reputatie', 'Chat', 'Galerij', 'Peilingen', 'Notificaties', 'Moderatie'
  ];

  const categorySettings = allSettings.filter(s => s.category === activeCategory);

  const handleSave = async (key: string, value: string) => {
    setSaving(prev => new Set(prev).add(key));
    try {
      await updateSetting(key, value);
      toast.success('Instelling opgeslagen.');
      reload();
    } catch (caught: unknown) {
      toast.error(caught);
    } finally {
      setSaving(prev => { const next = new Set(prev); next.delete(key); return next; });
    }
  };

  const renderInput = (setting: typeof allSettings[0]) => {
    const isSaving = saving.has(setting.key);
    const currentValue = setting.value ?? '';

    switch (setting.type) {
      case 'boolean':
        return (
          <Toggle
            checked={currentValue === 'true'}
            onChange={(v) => handleSave(setting.key, v.toString())}
            label={setting.label}
            description={setting.description}
            disabled={isSaving}
          />
        );
      case 'number':
        return (
          <Field label={setting.label} hint={setting.description}>
            <input
              type="number"
              key={currentValue}
              defaultValue={currentValue}
              onBlur={(e) => { if (e.target.value !== currentValue) void handleSave(setting.key, e.target.value); }}
              className={cx(inputClass, 'w-32')}
              disabled={isSaving}
            />
            {isSaving && <span className={cx('ml-2 text-xs', tone.muted)}>Opslaan...</span>}
          </Field>
        );
      case 'json':
        return (
          <Field label={setting.label} hint={setting.description}>
            <textarea
              key={currentValue}
              defaultValue={currentValue}
              onBlur={(e) => { if (e.target.value !== currentValue) void handleSave(setting.key, e.target.value); }}
              rows={4}
              className={cx(textareaClass, 'font-mono text-xs')}
              disabled={isSaving}
            />
            {isSaving && <span className={cx('ml-2 text-xs', tone.muted)}>Opslaan...</span>}
          </Field>
        );
      default: // string
        return (
          <Field label={setting.label} hint={setting.description}>
            <input
              type="text"
              key={currentValue}
              defaultValue={currentValue}
              onBlur={(e) => { if (e.target.value !== currentValue) void handleSave(setting.key, e.target.value); }}
              className={inputClass}
              disabled={isSaving}
            />
            {isSaving && <span className={cx('ml-2 text-xs', tone.muted)}>Opslaan...</span>}
          </Field>
        );
    }
  };

  if (initialLoading) {
    return (
      <div>
        <ModuleHeading title="Instellingen" description="Beheer alle forum-instellingen per categorie." />
        <AdminCard><LoadingState /></AdminCard>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <ModuleHeading title="Instellingen" description="Beheer alle forum-instellingen per categorie." />
        <AdminCard><p className="text-rose-600 dark:text-rose-400">Fout bij laden: {error}</p></AdminCard>
      </div>
    );
  }

  return (
    <div>
      <ModuleHeading title="Instellingen" description="Beheer alle forum-instellingen per categorie. Wijzigingen zijn direct actief." />

      <div className="grid lg:grid-cols-4 gap-4">
        {/* Sidebar met categorieën */}
        <AdminCard className="lg:col-span-1 h-fit sticky top-24">
          <nav aria-label="Instelling categorieën">
            <ul className="space-y-1">
              {categories.map(cat => {
                const Icon = CATEGORY_ICONS[cat];
                return (
                  <li key={cat}>
                    <button
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={cx(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                        activeCategory === cat
                          ? 'bg-[#a88bfa]/12 text-[#a88bfa] font-semibold'
                          : 'hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                      )}
                    >
                      <Icon className={cx('w-4 h-4 shrink-0', activeCategory === cat && 'text-[#a88bfa]')} />
                      <span className="truncate">{cat}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <p className={cx('text-xs mb-2', tone.muted)}>{activeCategory}</p>
            <p className={cx('text-xs', tone.faint)}>{categorySettings.length} instellingen</p>
          </div>
        </AdminCard>

        {/* Instellingen */}
        <div className="lg:col-span-3 space-y-4">
          {categorySettings.length === 0 ? (
            <AdminCard>
              <p className={cx('text-sm text-center py-8', tone.muted)}>Geen instellingen in deze categorie.</p>
            </AdminCard>
          ) : (
            categorySettings.map(setting => (
              <AdminCard key={setting.key}>
                {renderInput(setting)}
              </AdminCard>
            ))
          )}
        </div>
      </div>

      {/* Unsaved changes indicator */}
      {Array.from(saving).length > 0 && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={cx('rounded-xl border px-4 py-3 shadow-lg text-sm backdrop-blur', 'bg-white/95 dark:bg-[#13111c]/95', 'border-amber-500/30', 'text-amber-800 dark:text-amber-300')}>
            Instellingen opslaan...
          </div>
        </div>
      )}
    </div>
  );
}
