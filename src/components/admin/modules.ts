import {
  Ban,
  BarChart3,
  Boxes,
  ClipboardList,
  Flag,
  Layers,
  LayoutGrid,
  MessageCircle,
  MessageSquareText,
  Newspaper,
  Settings,
  Users,
  Vote,
} from 'lucide-react';
import type { AdminModule, ModuleGroup } from '../../types/admin';
import { BansModule } from './BansModule';
import { CategoriesModule } from './CategoriesModule';
import { ChatModule } from './ChatModule';
import { GalleryModule } from './GalleryModule';
import { MembersModule } from './MembersModule';
import { ModerationLogModule } from './ModerationLogModule';
import { ModulesModule } from './ModulesModule';
import { NewsModule } from './NewsModule';
import { OverviewModule } from './OverviewModule';
import { PollsModule } from './PollsModule';
import { ReportsModule } from './ReportsModule';
import { SettingsModule } from './SettingsModule';
import { TopicsModule } from './TopicsModule';

/** Volgorde van de groepen in de zijbalk. */
export const MODULE_GROUPS: ModuleGroup[] = ['Algemeen', 'Community', 'Inhoud', 'Systeem'];

/*
 * ---------------------------------------------------------------------------
 * NIEUWE MODULE TOEVOEGEN (in 3 stappen)
 * ---------------------------------------------------------------------------
 * 1. Maak src/components/admin/<Naam>Module.tsx met een component die
 *    \AdminModuleProps\ accepteert:
 *
 *      import type { AdminModuleProps } from '../../types/admin';
 *      export function ReportsModule({ currentUserId, role, refreshKey }: AdminModuleProps) { ... }
 *
 *    Gebruik \supabase\, \mutateAndLog\ en \etchPeople\ uit './client', de
 *    UI-bouwstenen uit './ui' (AdminCard, ModuleHeading, useAdminFetch, useToast,
 *    ConfirmDialog, Drawer, ...) en zet nieuwe tabellen in src/types/admin.ts.
 *    Geef \efreshKey\ mee als dependency aan useAdminFetch, zodat de knop
 *    \"Vernieuwen\" ook jouw module ververst.
 *
 * 2. Voeg hieronder een entry toe aan \dminModules\:
 *
 *      {
 *        id: 'reports',
 *        label: 'Rapporten',
 *        description: 'Korte uitleg...',
 *        group: 'Systeem',
 *        icon: FileBarChart,
 *        minRole: 'admin',          // optioneel: alleen voor admins
 *        Component: ReportsModule,
 *      },
 *
 * 3. Klaar. Het dashboard toont de nieuwe module automatisch in de zijbalk.
 * ---------------------------------------------------------------------------
 */
export const adminModules: AdminModule[] = [
  {
    id: 'overview',
    label: 'Overzicht',
    description: 'Cijfers, activiteit van de afgelopen twee weken en wat er recent gebeurde.',
    group: 'Algemeen',
    icon: BarChart3,
    Component: OverviewModule,
    hasNotifications: true,
  },
  {
    id: 'members',
    label: 'Leden',
    description: 'Leden zoeken, rollen, reputatie en badges beheren, schorsen.',
    group: 'Community',
    icon: Users,
    Component: MembersModule,
  },
  {
    id: 'bans',
    label: 'Schorsingen',
    description: 'Actieve en eerdere schorsingen; schorsingen opheffen.',
    group: 'Community',
    icon: Ban,
    Component: BansModule,
  },
  {
    id: 'chat',
    label: 'Live chat',
    description: 'Chatberichten live meelezen, zoeken en verwijderen.',
    group: 'Community',
    icon: MessageCircle,
    Component: ChatModule,
  },
  {
    id: 'reports',
    label: 'Rapporten',
    description: 'Gemelde content bekijken, behandelen, oplossen of afwijzen.',
    group: 'Community',
    icon: Flag,
    Component: ReportsModule,
    hasNotifications: true,
  },
  {
    id: 'topics',
    label: 'Topics',
    description: 'Topics vastmaken, sluiten, verplaatsen, als opgelost markeren of verwijderen.',
    group: 'Inhoud',
    icon: MessageSquareText,
    Component: TopicsModule,
  },
  {
    id: 'news',
    label: 'Nieuws',
    description: 'Nieuwsberichten schrijven, bewerken, publiceren en verwijderen.',
    group: 'Inhoud',
    icon: Newspaper,
    Component: NewsModule,
  },
  {
    id: 'polls',
    label: 'Peilingen',
    description: 'Peilingen maken, openen, sluiten en de uitslag bekijken.',
    group: 'Inhoud',
    icon: Vote,
    minRole: 'admin',
    Component: PollsModule,
  },
  {
    id: 'gallery',
    label: 'Galerij',
    description: 'Projecten in de galerij bekijken en verwijderen.',
    group: 'Inhoud',
    icon: LayoutGrid,
    Component: GalleryModule,
  },
  {
    id: 'categories',
    label: 'Categorieën',
    description: 'Forumcategorieën beheren, volgorde wijzigen, kleuren instellen.',
    group: 'Systeem',
    icon: Layers,
    minRole: 'admin',
    Component: CategoriesModule,
  },
  {
    id: 'moderation-log',
    label: 'Moderatielog',
    description: 'Alle moderatie-acties met reden, filteren en exporteren.',
    group: 'Systeem',
    icon: ClipboardList,
    Component: ModerationLogModule,
  },
  {
    id: 'settings',
    label: 'Instellingen',
    description: 'Forum-instellingen per categorie: algemeen, topics, reputatie, chat, enz.',
    group: 'Systeem',
    icon: Settings,
    minRole: 'admin',
    Component: SettingsModule,
  },
  {
    id: 'modules',
    label: 'Modules',
    description: 'Overzicht van de modules en uitleg om er zelf een toe te voegen.',
    group: 'Systeem',
    icon: Boxes,
    minRole: 'admin',
    Component: ModulesModule,
  },
];
