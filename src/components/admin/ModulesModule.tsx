import { PlusCircle } from 'lucide-react';
import type { AdminModuleProps } from '../../types/admin';
import { adminModules, MODULE_GROUPS } from './modules';
import { AdminCard, CardTitle, ModuleHeading, Pill, cx, tone } from './ui';

const STEPS = [
  'Maak een bestand in `src/components/admin/`, bijvoorbeeld `RapportenModule.tsx`, met een component dat `AdminModuleProps` krijgt.',
  'Haal data op met `useAdminFetch(…, [refreshKey])` en gebruik `supabase`, `mutateAndLog` en `fetchPeople` uit `./client`.',
  'Bouw de pagina met de onderdelen uit `./ui`: `ModuleHeading`, `AdminCard`, `Toolbar`, `ConfirmDialog`, `Drawer`, `useToast` en meer.',
  'Zet je module in `adminModules` in `src/components/admin/modules.ts` met een groep, icoon en eventueel `minRole: "admin"`.',
];

export function ModulesModule({ role }: AdminModuleProps) {
  return (
    <div>
      <ModuleHeading title="Modules" description="Welke onderdelen het dashboard heeft, wie ze kan zien, en hoe je er zelf een toevoegt." />

      <div className="space-y-3">
        {MODULE_GROUPS.map((group) => {
          const modules = adminModules.filter((m) => m.group === group);
          if (modules.length === 0) return null;
          return (
            <AdminCard key={group}>
              <CardTitle title={group} />
              <div className="grid sm:grid-cols-2 gap-2">
                {modules.map((module) => {
                  const Icon = module.icon;
                  return (
                    <div key={module.id} className={cx('flex items-start gap-3 rounded-lg p-3', tone.sunken)}>
                      <span className="w-9 h-9 rounded-lg bg-[#a88bfa]/12 text-[#a88bfa] flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <p className={cx('text-sm font-semibold flex items-center gap-2', tone.strong)}>
                          {module.label}
                          {module.minRole === 'admin' ? <Pill tone="accent">Alleen admins</Pill> : <Pill>Moderators</Pill>}
                        </p>
                        <p className={cx('text-xs mt-0.5', tone.muted)}>{module.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </AdminCard>
          );
        })}

        <AdminCard>
          <CardTitle icon={PlusCircle} title="Zelf een module toevoegen" />
          <ol className="space-y-3">
            {STEPS.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-[#a88bfa]/15 text-[#a88bfa] text-xs font-bold flex items-center justify-center shrink-0">
                  {index + 1}
                </span>
                <p className={cx('text-sm leading-relaxed', tone.body)}>{step}</p>
              </li>
            ))}
          </ol>
          <p className={cx('mt-4 text-xs', tone.muted)}>
            Je bent ingelogd als <span className="font-semibold">{role}</span>. Meer uitleg staat bovenaan{' '}
            <code className="font-mono text-[#a88bfa]">src/components/admin/modules.ts</code>.
          </p>
        </AdminCard>
      </div>
    </div>
  );
}
