import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';

/** Rollen zoals ze in user_roles staan. */
export type AdminRole = 'member' | 'moderator' | 'admin';

/** De twee rollen die het beheerdashboard mogen openen. */
export type ModuleRole = 'admin' | 'moderator';

/** Groepen in de zijbalk van het dashboard. */
export type ModuleGroup = 'Algemeen' | 'Inhoud' | 'Community' | 'Systeem';

/** Props die AdminDashboard aan elke module doorgeeft. */
export interface AdminModuleProps {
  currentUserId: string;
  role: ModuleRole;
  /** Vraag het dashboard (en daarmee alle modules) opnieuw data op te halen. */
  refresh: () => void;
  /** Teller die oploopt bij elke globale verversing (gebruik als fetch-dependency). */
  refreshKey: number;
  /** Open een andere module, optioneel met een zoekterm of id om te tonen. */
  navigate: (moduleId: string, focus?: string) => void;
  /** Zoekterm/id die via 
avigate is meegegeven (bijv. een lid-id). */
  focus?: string;
}

/** Eén tab in het beheerdashboard. Voeg hier een object toe om een module te registreren. */
export interface AdminModule {
  id: string;
  label: string;
  description: string;
  group: ModuleGroup;
  icon: LucideIcon;
  /** Minimale rol om de module te zien. Standaard: moderator. */
  minRole?: ModuleRole;
  Component: ComponentType<AdminModuleProps>;
  /** Optionele badge met aantal (bijv. openstaande rapporten) */
  badge?: number | null;
  /** Of deze module een notificatie-indicator heeft */
  hasNotifications?: boolean;
}

// ---------------------------------------------------------------------------
// Database-rijen (gelijk aan supabase/setup_all.sql + 0004). Gebruik type
// aliases (geen interfaces): Supabase's generic Database-type verwacht dat
// elke Row toewijsbaar is aan Record<string, unknown>.
// ---------------------------------------------------------------------------

export type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  handle: string | null;
  initials: string | null;
  avatar_color: string | null;
  avatar_url: string | null;
  bio: string | null;
  status_text: string | null;
  github_handle: string | null;
  discord_handle: string | null;
  theme_accent: string | null;
  reputation: number;
  posts_count: number;
  badges: string[];
  last_seen: string;
  created_at: string;
  updated_at: string;
};

export type UserRoleRow = {
  user_id: string;
  role: AdminRole;
  created_at: string;
  updated_at: string;
};

export type CategoryRow = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  sort_order: number;
  created_at: string;
};

export type TopicRow = {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  /** Gegenereerd uit category (alleen-lezen). */
  category_id: string | null;
  author_id: string | null;
  author_name: string | null;
  author_role: string | null;
  views: number;
  pinned: boolean;
  locked: boolean;
  solved: boolean;
  created_at: string;
  updated_at: string;
  last_activity: string;
};

export type ReplyRow = {
  id: string;
  topic_id: string;
  author_id: string | null;
  author_name: string | null;
  author_role: string | null;
  body: string;
  is_best_answer: boolean;
  created_at: string;
  updated_at: string;
};

export type NewsRow = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  body: string;
  category: string;
  cover_url: string | null;
  read_time: string | null;
  published: boolean;
  author_id: string | null;
  author_name: string | null;
  published_at: string;
  created_at: string;
  updated_at: string;
};

export type ChatMessageRow = {
  /** bigint in Postgres; PostgREST levert dit als JSON-nummer terug. */
  id: number;
  user_id: string | null;
  author_name: string | null;
  author_role: string | null;
  body: string;
  created_at: string;
};

export type GalleryProjectRow = {
  id: string;
  title: string;
  description: string;
  stack: string;
  author_id: string | null;
  author_name: string | null;
  preview_preset: string;
  created_at: string;
  updated_at: string;
};

export type ProjectLikeRow = {
  project_id: string;
  user_id: string;
  created_at: string;
};

export type PollRow = {
  id: string;
  question: string;
  closes_in: string | null;
  closes_at: string | null;
  active: boolean;
  created_at: string;
};

export type PollOptionRow = {
  id: string;
  poll_id: string;
  label: string;
  sort_order: number;
};

export type PollVoteRow = {
  poll_id: string;
  option_id: string;
  user_id: string;
  created_at: string;
};

export type MemberBanRow = {
  id: string;
  user_id: string;
  reason: string;
  banned_by: string | null;
  expires_at: string | null;
  lifted_at: string | null;
  lifted_by: string | null;
  created_at: string;
};

export type ReportRow = {
  id: string;
  reporter_id: string;
  reporter_name: string | null;
  target_table: string;
  target_id: string;
  target_type: 'topic' | 'reply' | 'chat' | 'project' | 'profile';
  reason: string;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  moderator_id: string | null;
  moderator_name: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

export type WarningRow = {
  id: string;
  user_id: string;
  moderator_id: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  expires_at: string | null;
  created_at: string;
};

export type SiteSettingRow = {
  key: string;
  value: string | null;
  description: string | null;
  category: string;
  updated_at: string;
};

export type ModerationActionRow = {
  id: string;
  moderator_id: string;
  action: string;
  target_table: string;
  target_id: string;
  reason: string | null;
  created_at: string;
};

export type ActivityRow = {
  day: string;
  topics: number;
  replies: number;
  chat: number;
  signups: number;
};

type TableDef<Row extends Record<string, unknown>, Required extends keyof Row = never> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

/**
 * Lokale beschrijving van de tabellen en functies die het dashboard gebruikt.
 * src/lib/supabase.ts is bewust ongetypeerd; in components/admin/client.ts
 * maken we hier een getypeerde view van.
 */
export interface AdminDatabase {
  public: {
    Tables: {
      profiles: TableDef<ProfileRow, 'id' | 'username' | 'display_name'>;
      user_roles: TableDef<UserRoleRow, 'user_id'>;
      categories: TableDef<CategoryRow, 'id' | 'name'>;
      topics: TableDef<TopicRow, 'title'>;
      replies: TableDef<ReplyRow, 'topic_id' | 'body'>;
      news: TableDef<NewsRow, 'title' | 'slug'>;
      chat_messages: TableDef<ChatMessageRow, 'body'>;
      gallery_projects: TableDef<GalleryProjectRow, 'title'>;
      project_likes: TableDef<ProjectLikeRow, 'project_id' | 'user_id'>;
      polls: TableDef<PollRow, 'question'>;
      poll_options: TableDef<PollOptionRow, 'poll_id' | 'label'>;
      poll_votes: TableDef<PollVoteRow, 'poll_id' | 'option_id' | 'user_id'>;
      member_bans: TableDef<MemberBanRow, 'user_id' | 'reason'>;
      moderation_actions: TableDef<
        ModerationActionRow,
        'moderator_id' | 'action' | 'target_table' | 'target_id'
      >;
    };
    Views: Record<string, never>;
    Functions: {
      admin_get_reports: {
        Args: { status_filter?: string; limit?: number };
        Returns: ReportRow[];
      };
      admin_resolve_report: {
        Args: { report_id: string; resolution: string; dismiss?: boolean };
        Returns: undefined;
      };
      admin_get_warnings: {
        Args: { target_user_id: string };
        Returns: WarningRow[];
      };
      admin_add_warning: {
        Args: { target_user_id: string; reason: string; severity: string; expires_days: number | null };
        Returns: undefined;
      };
      admin_get_settings: {
        Args: { category?: string };
        Returns: SiteSettingRow[];
      };
      admin_update_setting: {
        Args: { key: string; value: string };
        Returns: undefined;
      };
      admin_activity: {
        Args: { days?: number };
        Returns: ActivityRow[];
      };
      admin_update_member: {
        Args: {
          target_user_id: string;
          new_reputation: number;
          new_badges: string[];
          reason?: string | null;
        };
        Returns: undefined;
      };
    };
  };
}
