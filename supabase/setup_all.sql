-- ===========================================================================
-- ALLES-IN-ÉÉN: plak dit hele bestand in Supabase → SQL Editor en klik Run.
-- = migrations/0001 + 0002 + 0003 + 0004 + 0005 + 0006 (in die volgorde)
-- Veilig om opnieuw te draaien; bestaande data blijft staan.
-- ===========================================================================

-- ===========================================================================
-- Forum backend — schema, RLS, realtime, RPC's en seed-data
-- Uitvoeren in de Supabase SQL Editor (of via `supabase db push`).
-- Idempotent: mag meerdere keren gedraaid worden.
-- ===========================================================================

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text not null,
  handle text unique,
  initials text,
  avatar_color text,
  avatar_url text,
  bio text,
  status_text text,
  github_handle text,
  discord_handle text,
  theme_accent text,
  reputation integer not null default 0,
  posts_count integer not null default 0,
  badges text[] not null default '{}',
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'moderator', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id text primary key,
  name text not null,
  description text,
  color text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  excerpt text not null default '',
  body text not null default '',
  code_snippet jsonb,
  attachments jsonb not null default '[]'::jsonb,
  category text not null references public.categories (id) on delete restrict,
  author_id uuid references public.profiles (id) on delete set null,
  author_name text,
  author_initials text,
  author_color text,
  author_role text,
  views integer not null default 0,
  pinned boolean not null default false,
  locked boolean not null default false,
  solved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_activity timestamptz not null default now()
);

create table if not exists public.replies (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  author_name text,
  author_initials text,
  author_color text,
  author_role text,
  body text not null,
  code_snippet jsonb,
  attachments jsonb not null default '[]'::jsonb,
  is_best_answer boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.topic_votes (
  topic_id uuid not null references public.topics (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (topic_id, user_id)
);

create table if not exists public.reply_likes (
  reply_id uuid not null references public.replies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reply_id, user_id)
);

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  summary text not null default '',
  body text not null default '',
  category text not null default 'Community',
  cover_url text,
  read_time text,
  published boolean not null default true,
  author_id uuid references public.profiles (id) on delete set null,
  author_name text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles (id) on delete set null,
  author_name text,
  author_initials text,
  author_color text,
  author_role text,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.chat_reactions (
  message_id bigint not null references public.chat_messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create table if not exists public.gallery_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  stack text not null default '',
  author_id uuid references public.profiles (id) on delete set null,
  author_name text,
  author_initials text,
  author_color text,
  preview_preset text not null default 'custom-html',
  custom_markup text,
  code_snippet jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_likes (
  project_id uuid not null references public.gallery_projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  closes_in text,
  closes_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  label text not null,
  sort_order integer not null default 0
);

create table if not exists public.poll_votes (
  poll_id uuid not null references public.polls (id) on delete cascade,
  option_id uuid not null references public.poll_options (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid not null references public.profiles (id) on delete cascade,
  action text not null check (action in ('delete', 'edit', 'pin', 'lock', 'warn', 'ban', 'role_change')),
  target_table text not null,
  target_id text not null,
  reason text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexen
-- ---------------------------------------------------------------------------
create index if not exists topics_author_id_idx on public.topics (author_id);
create index if not exists topics_category_idx on public.topics (category);
create index if not exists topics_created_at_idx on public.topics (created_at desc);
create index if not exists replies_topic_id_idx on public.replies (topic_id, created_at);
create index if not exists replies_author_id_idx on public.replies (author_id);
create index if not exists topic_votes_user_id_idx on public.topic_votes (user_id);
create index if not exists reply_likes_user_id_idx on public.reply_likes (user_id);
create index if not exists news_published_idx on public.news (published, published_at desc);
create index if not exists chat_messages_created_at_idx on public.chat_messages (created_at desc);
create index if not exists chat_messages_user_id_idx on public.chat_messages (user_id);
create index if not exists gallery_projects_author_id_idx on public.gallery_projects (author_id);
create index if not exists project_likes_user_id_idx on public.project_likes (user_id);
create index if not exists moderation_actions_moderator_id_idx on public.moderation_actions (moderator_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Hulpfuncties (na de tabellen: SQL-functies worden bij aanmaken gecontroleerd)
-- ---------------------------------------------------------------------------
create or replace function private.has_role(required_role text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and (
        ur.role = required_role
        or (required_role = 'moderator' and ur.role = 'admin')
      )
  );
$$;

revoke all on function private.has_role(text) from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.has_role(text) to anon, authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- reputatie/badges mogen niet door de client zelf worden bepaald
create or replace function private.award_reputation(
  target_user_id uuid,
  delta integer,
  badge text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Not authenticated';
  end if;

  if target_user_id <> (select auth.uid())
     and not (select private.has_role('moderator')) then
    raise exception 'Not allowed';
  end if;

  update public.profiles p
  set
    reputation = greatest(0, p.reputation + coalesce(delta, 0)),
    badges = case
      when badge is not null and not (badge = any(p.badges))
        then array_append(p.badges, badge)
      else p.badges
    end
  where p.id = target_user_id;
end;
$$;

revoke all on function private.award_reputation(uuid, integer, text) from public;
grant execute on function private.award_reputation(uuid, integer, text) to authenticated;

-- PostgREST kan alleen functies in blootgestelde schemas aanroepen; deze dunne
-- wrapper is SECURITY INVOKER en delegeert naar de beveiligde private functie.
create or replace function public.award_reputation(
  target_user_id uuid,
  delta integer,
  badge text default null
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.award_reputation(target_user_id, delta, badge);
$$;

revoke all on function public.award_reputation(uuid, integer, text) from public, anon;
grant execute on function public.award_reputation(uuid, integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

drop trigger if exists user_roles_set_updated_at on public.user_roles;
create trigger user_roles_set_updated_at before update on public.user_roles
  for each row execute function private.set_updated_at();

drop trigger if exists topics_set_updated_at on public.topics;
create trigger topics_set_updated_at before update on public.topics
  for each row execute function private.set_updated_at();

drop trigger if exists replies_set_updated_at on public.replies;
create trigger replies_set_updated_at before update on public.replies
  for each row execute function private.set_updated_at();

drop trigger if exists news_set_updated_at on public.news;
create trigger news_set_updated_at before update on public.news
  for each row execute function private.set_updated_at();

drop trigger if exists gallery_projects_set_updated_at on public.gallery_projects;
create trigger gallery_projects_set_updated_at before update on public.gallery_projects
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Nieuwe auth-gebruiker -> profiel + rol
-- ---------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_name text;
begin
  base_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'user_name', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(split_part(new.email, '@', 1), ''),
    'lid'
  );

  insert into public.profiles (
    id, username, display_name, handle, initials, avatar_color, status_text
  )
  values (
    new.id,
    base_name || '-' || substr(new.id::text, 1, 8),
    base_name,
    '@' || base_name,
    upper(left(base_name, 2)),
    '#a88bfa',
    'Actief op /forum'
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'member')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS + grants
-- ---------------------------------------------------------------------------

-- profiles: publiek leesbaar, eigenaar mag alleen "veilige" velden wijzigen
alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to anon, authenticated;
grant update (display_name, handle, avatar_url, avatar_color, bio, status_text,
              github_handle, discord_handle, theme_accent, initials) on table public.profiles to authenticated;

drop policy if exists "Profiles are public" on public.profiles;
create policy "Profiles are public" on public.profiles
  for select to anon, authenticated using (true);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id or (select private.has_role('admin')))
  with check ((select auth.uid()) = id or (select private.has_role('admin')));

-- user_roles
alter table public.user_roles enable row level security;
revoke all on table public.user_roles from anon, authenticated;
grant select on table public.user_roles to authenticated;

drop policy if exists "Users read own role" on public.user_roles;
create policy "Users read own role" on public.user_roles
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_role('admin')));

drop policy if exists "Admins insert roles" on public.user_roles;
create policy "Admins insert roles" on public.user_roles
  for insert to authenticated with check ((select private.has_role('admin')));

drop policy if exists "Admins update roles" on public.user_roles;
create policy "Admins update roles" on public.user_roles
  for update to authenticated
  using ((select private.has_role('admin')))
  with check ((select private.has_role('admin')));

drop policy if exists "Admins delete roles" on public.user_roles;
create policy "Admins delete roles" on public.user_roles
  for delete to authenticated using ((select private.has_role('admin')));

-- categories: publiek leesbaar, alleen admin schrijft
alter table public.categories enable row level security;
revoke all on table public.categories from anon, authenticated;
grant select on table public.categories to anon, authenticated;

drop policy if exists "Categories are public" on public.categories;
create policy "Categories are public" on public.categories
  for select to anon, authenticated using (true);

-- topics
alter table public.topics enable row level security;
revoke all on table public.topics from anon, authenticated;
grant select on table public.topics to anon, authenticated;
grant insert, update, delete on table public.topics to authenticated;

drop policy if exists "Topics are public" on public.topics;
create policy "Topics are public" on public.topics
  for select to anon, authenticated using (true);

drop policy if exists "Users create topics" on public.topics;
create policy "Users create topics" on public.topics
  for insert to authenticated
  with check ((select auth.uid()) = author_id or ((select auth.uid()) is not null and author_id is null));

drop policy if exists "Authors and moderators update topics" on public.topics;
create policy "Authors and moderators update topics" on public.topics
  for update to authenticated
  using ((select auth.uid()) = author_id or (select private.has_role('moderator')))
  with check ((select auth.uid()) = author_id or (select private.has_role('moderator')));

drop policy if exists "Authors and admins delete topics" on public.topics;
create policy "Authors and admins delete topics" on public.topics
  for delete to authenticated
  using ((select auth.uid()) = author_id or (select private.has_role('admin')));

-- replies
alter table public.replies enable row level security;
revoke all on table public.replies from anon, authenticated;
grant select on table public.replies to anon, authenticated;
grant insert, update, delete on table public.replies to authenticated;

drop policy if exists "Replies are public" on public.replies;
create policy "Replies are public" on public.replies
  for select to anon, authenticated using (true);

drop policy if exists "Users create replies" on public.replies;
create policy "Users create replies" on public.replies
  for insert to authenticated
  with check ((select auth.uid()) = author_id or ((select auth.uid()) is not null and author_id is null));

drop policy if exists "Authors and moderators update replies" on public.replies;
create policy "Authors and moderators update replies" on public.replies
  for update to authenticated
  using ((select auth.uid()) = author_id or (select private.has_role('moderator')))
  with check ((select auth.uid()) = author_id or (select private.has_role('moderator')));

drop policy if exists "Authors and admins delete replies" on public.replies;
create policy "Authors and admins delete replies" on public.replies
  for delete to authenticated
  using ((select auth.uid()) = author_id or (select private.has_role('admin')));

-- topic_votes
alter table public.topic_votes enable row level security;
revoke all on table public.topic_votes from anon, authenticated;
grant select, insert, delete on table public.topic_votes to authenticated;

drop policy if exists "Votes are visible" on public.topic_votes;
create policy "Votes are visible" on public.topic_votes
  for select to authenticated using (true);

drop policy if exists "Users vote for themselves" on public.topic_votes;
create policy "Users vote for themselves" on public.topic_votes
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users remove own vote" on public.topic_votes;
create policy "Users remove own vote" on public.topic_votes
  for delete to authenticated using ((select auth.uid()) = user_id);

-- reply_likes
alter table public.reply_likes enable row level security;
revoke all on table public.reply_likes from anon, authenticated;
grant select, insert, delete on table public.reply_likes to authenticated;

drop policy if exists "Likes are visible" on public.reply_likes;
create policy "Likes are visible" on public.reply_likes
  for select to authenticated using (true);

drop policy if exists "Users like for themselves" on public.reply_likes;
create policy "Users like for themselves" on public.reply_likes
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users remove own like" on public.reply_likes;
create policy "Users remove own like" on public.reply_likes
  for delete to authenticated using ((select auth.uid()) = user_id);

-- news
alter table public.news enable row level security;
revoke all on table public.news from anon, authenticated;
grant select on table public.news to anon, authenticated;
grant insert, update, delete on table public.news to authenticated;

drop policy if exists "Published news are public" on public.news;
create policy "Published news are public" on public.news
  for select to anon, authenticated
  using (published or (select private.has_role('moderator')));

drop policy if exists "Moderators create news" on public.news;
create policy "Moderators create news" on public.news
  for insert to authenticated with check ((select private.has_role('moderator')));

drop policy if exists "Moderators update news" on public.news;
create policy "Moderators update news" on public.news
  for update to authenticated
  using ((select private.has_role('moderator')))
  with check ((select private.has_role('moderator')));

drop policy if exists "Admins delete news" on public.news;
create policy "Admins delete news" on public.news
  for delete to authenticated using ((select private.has_role('admin')));

-- chat_messages
alter table public.chat_messages enable row level security;
revoke all on table public.chat_messages from anon, authenticated;
grant select on table public.chat_messages to anon, authenticated;
grant insert, update, delete on table public.chat_messages to authenticated;

drop policy if exists "Chat is public" on public.chat_messages;
create policy "Chat is public" on public.chat_messages
  for select to anon, authenticated using (true);

drop policy if exists "Users send chat messages" on public.chat_messages;
create policy "Users send chat messages" on public.chat_messages
  for insert to authenticated
  with check ((select auth.uid()) = user_id or ((select auth.uid()) is not null and user_id is null));

drop policy if exists "Authors and moderators update chat" on public.chat_messages;
create policy "Authors and moderators update chat" on public.chat_messages
  for update to authenticated
  using ((select auth.uid()) = user_id or (select private.has_role('moderator')))
  with check ((select auth.uid()) = user_id or (select private.has_role('moderator')));

drop policy if exists "Authors and admins delete chat" on public.chat_messages;
create policy "Authors and admins delete chat" on public.chat_messages
  for delete to authenticated
  using ((select auth.uid()) = user_id or (select private.has_role('admin')));

-- chat_reactions
alter table public.chat_reactions enable row level security;
revoke all on table public.chat_reactions from anon, authenticated;
grant select, insert, delete on table public.chat_reactions to authenticated;

drop policy if exists "Reactions are visible" on public.chat_reactions;
create policy "Reactions are visible" on public.chat_reactions
  for select to authenticated using (true);

drop policy if exists "Users react for themselves" on public.chat_reactions;
create policy "Users react for themselves" on public.chat_reactions
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users remove own reaction" on public.chat_reactions;
create policy "Users remove own reaction" on public.chat_reactions
  for delete to authenticated using ((select auth.uid()) = user_id);

-- gallery_projects
alter table public.gallery_projects enable row level security;
revoke all on table public.gallery_projects from anon, authenticated;
grant select on table public.gallery_projects to anon, authenticated;
grant insert, update, delete on table public.gallery_projects to authenticated;

drop policy if exists "Projects are public" on public.gallery_projects;
create policy "Projects are public" on public.gallery_projects
  for select to anon, authenticated using (true);

drop policy if exists "Users create projects" on public.gallery_projects;
create policy "Users create projects" on public.gallery_projects
  for insert to authenticated
  with check ((select auth.uid()) = author_id or ((select auth.uid()) is not null and author_id is null));

drop policy if exists "Authors and moderators update projects" on public.gallery_projects;
create policy "Authors and moderators update projects" on public.gallery_projects
  for update to authenticated
  using ((select auth.uid()) = author_id or (select private.has_role('moderator')))
  with check ((select auth.uid()) = author_id or (select private.has_role('moderator')));

drop policy if exists "Authors and admins delete projects" on public.gallery_projects;
create policy "Authors and admins delete projects" on public.gallery_projects
  for delete to authenticated
  using ((select auth.uid()) = author_id or (select private.has_role('admin')));

-- project_likes
alter table public.project_likes enable row level security;
revoke all on table public.project_likes from anon, authenticated;
grant select, insert, delete on table public.project_likes to authenticated;

drop policy if exists "Project likes are visible" on public.project_likes;
create policy "Project likes are visible" on public.project_likes
  for select to authenticated using (true);

drop policy if exists "Users like projects for themselves" on public.project_likes;
create policy "Users like projects for themselves" on public.project_likes
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users remove own project like" on public.project_likes;
create policy "Users remove own project like" on public.project_likes
  for delete to authenticated using ((select auth.uid()) = user_id);

-- polls / options / votes
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;
revoke all on table public.polls from anon, authenticated;
revoke all on table public.poll_options from anon, authenticated;
revoke all on table public.poll_votes from anon, authenticated;
grant select on table public.polls to anon, authenticated;
grant select on table public.poll_options to anon, authenticated;
grant select, insert, delete on table public.poll_votes to authenticated;

drop policy if exists "Polls are public" on public.polls;
create policy "Polls are public" on public.polls
  for select to anon, authenticated using (true);

drop policy if exists "Poll options are public" on public.poll_options;
create policy "Poll options are public" on public.poll_options
  for select to anon, authenticated using (true);

drop policy if exists "Votes are visible" on public.poll_votes;
create policy "Votes are visible" on public.poll_votes
  for select to authenticated using (true);

drop policy if exists "Users vote once" on public.poll_votes;
create policy "Users vote once" on public.poll_votes
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users remove own poll vote" on public.poll_votes;
create policy "Users remove own poll vote" on public.poll_votes
  for delete to authenticated using ((select auth.uid()) = user_id);

-- moderation_actions
alter table public.moderation_actions enable row level security;
revoke all on table public.moderation_actions from anon, authenticated;
grant select, insert on table public.moderation_actions to authenticated;

drop policy if exists "Moderators read moderation log" on public.moderation_actions;
create policy "Moderators read moderation log" on public.moderation_actions
  for select to authenticated
  using ((select private.has_role('moderator')) or moderator_id = (select auth.uid()));

drop policy if exists "Moderators write moderation log" on public.moderation_actions;
create policy "Moderators write moderation log" on public.moderation_actions
  for insert to authenticated
  with check (moderator_id = (select auth.uid()) and (select private.has_role('moderator')));

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
-- Zodat UPDATE/DELETE-events ook de volledige oude rij bevatten.
alter table public.chat_messages replica identity full;

do $$
declare
  tbl text;
begin
  foreach tbl in array array['chat_messages', 'chat_reactions', 'topics', 'replies'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Seed-data (alleen als de tabellen nog leeg zijn)
-- ---------------------------------------------------------------------------
insert into public.categories (id, name, description, color, sort_order) values
  ('algemeen',  'Algemeen',      'Van alles en nog wat',       '#a88bfa', 0),
  ('react-vue', 'React & Vue',   'Framework-vragen en tips',   '#60a5fa', 1),
  ('showcase',  'Showcase',      'Laat je projecten zien',     '#34d399', 2),
  ('hulp',      'Hulp & Vragen', 'Stel je vragen hier',        '#f472b6', 3)
on conflict (id) do nothing;

-- Nieuws
insert into public.news (slug, title, summary, body, category, read_time, author_name, published_at)
values
  ('forum-verplaatst-badges-tabellen-bijlagen',
   'Forum verplaatst naar /forum + Badges, Tabellen & Bijlagen live',
   'De complete forum-homepage vind je nu onder /forum, inclusief reputatiebadges voor helpers, Markdown-tabellen en bestandsuploads.',
   'Vandaag hebben we drie grote verbeteringen doorgevoerd:\n\n1. Eigen /forum route: De forum-homepage met live chat onderaan zit voortaan op /forum in het linkermenu.\n2. Badges & Reputatie: Helpers verdienen punten bij topics, reacties, likes en het markeren van een Beste Antwoord.\n3. Markdown-tabellen & Bijlagen: Voeg overzichtelijke tabellen en afbeeldingen of bestanden direct toe aan je topics.',
   'Platform Update', '3 min leestijd', 'Sander Vermeer', now() - interval '1 day')
on conflict (slug) do nothing;

insert into public.news (slug, title, summary, body, category, read_time, author_name, published_at)
values
  ('globale-zoekbalk-achtergrondmeldingen',
   'Globale zoekbalk & achtergrondmeldingen voor Live chat toegevoegd',
   'Zoek direct met / of Ctrl+K door topics, nieuws en projecten én ontvang een browsermelding bij nieuwe chatberichten.',
   'Je hoeft niet meer handmatig per pagina te zoeken. In de bovenbalk zit nu een globale zoekbalk die direct resultaten toont uit topics, nieuwsartikelen en de Project-galerij.\n\nDaarnaast kun je in de Live chat meldingen aanzetten zodat je geen reactie mist wanneer de tab op de achtergrond staat.',
   'Platform Update', '2 min leestijd', 'Sander Vermeer', now() - interval '2 days')
on conflict (slug) do nothing;

insert into public.news (slug, title, summary, body, category, read_time, author_name, published_at)
values
  ('code-snippets-project-galerij',
   'Nieuw: Code-snippets & Project-galerij met live previews gelanceerd',
   'Deel voortaan syntax-highlighted React-, Vue- en TypeScript-code direct in topics én test elkaars componenten live in de galerij.',
   'Op basis van jullie stemmen zijn codeblokken met syntax highlighting en de interactieve Project-galerij beschikbaar voor alle leden.',
   'Tech & Stack', '3 min leestijd', 'Lotte de Vries', now() - interval '4 days')
on conflict (slug) do nothing;

insert into public.news (slug, title, summary, body, category, read_time, author_name, published_at)
values
  ('community-peiling-supporter-doelen',
   'Community Peiling & Supporter-doelen voor dit kwartaal',
   'Bepaal wekelijks mee welke functies we als eerste bouwen en zie transparant hoe hostingkosten gedekt worden.',
   'Elke week kiezen leden in de peiling op /forum welke verbetering prioriteit krijgt. Dankzij community-supporters is bijna 70% van de maandelijkse kosten gedekt.',
   'Community', '2 min leestijd', 'Nora Visser', now() - interval '6 days')
on conflict (slug) do nothing;

-- Topics (met fallback-auteurvelden, zodat seed ook zonder auth-gebruikers werkt)
do $$
begin
  if not exists (select 1 from public.topics) then
    insert into public.topics (title, excerpt, body, category, author_name, author_initials, author_color, author_role, views, pinned, created_at)
    values
      ('Welkom op het vernieuwde /forum — badges, tabellen & bijlagen staan live!',
       'De forum-homepage heeft nu zijn eigen plek op /forum in het menu, compleet met reputatiebadges, Markdown-tabellen en bestandsuploads.',
       'Welkom allemaal op de vernieuwde Forum-pagina (/forum)!\n\nDe afgelopen dagen hebben we op basis van jullie stemmen weer flinke stappen gezet:\n• De forum-homepage met live chat onderaan zit nu direct onder /forum in het menu.\n• Actieve helpers verdienen automatisch reputatiepunten en badges.\n• In topics en reacties kun je nu Markdown-tabellen en bestanden/afbeeldingen toevoegen.',
       'algemeen', 'Sander Vermeer', 'SV', '#a88bfa', 'Beheerder', 412, true, now() - interval '8 hours');

    insert into public.topics (title, excerpt, body, category, author_name, author_initials, author_color, author_role, views, created_at)
    values
      ('React + Vue combineren in één frontend: hoe houd je state synchroon?',
       'Ik draai een hybride setup met React voor de layout-shell en Vue voor interactieve widgets. Hier is een vergelijkingstabel van 3 opties.',
       'In ons huidige forumproject combineren we React en Vue naast elkaar. Zodra een gebruiker inlogt of van thema wisselt wil je dat beide frameworks dat direct oppikken.\n\n| Aanpak | Bundlegrootte | React + Vue support |\n| --- | --- | --- |\n| nanostores | ~0.9 KB | Officieel |\n| Custom DOM Events | 0 KB | Handmatig |\n| BroadcastChannel | 0 KB | Cross-tab |',
       'react-vue', 'Nora Visser', 'NV', '#60a5fa', 'Supporter', 265, now() - interval '6 hours');

    insert into public.topics (title, excerpt, body, category, author_name, author_initials, author_color, author_role, views, solved, created_at)
    values
      ('Websocket reconnect bij mobiel internet — beste retry-strategie?',
       'Als gebruikers op 4G wisselen naar Wi-Fi valt de live chat soms 5 seconden stil zonder melding. Hoe vangen jullie dat netjes op?',
       'Bij onze live chat valt het op dat mobiele browsers WebSockets pauzeren zodra het scherm kort vergrendeld wordt. Welke backoff-tijden gebruiken jullie?',
       'hulp', 'Mees Jansen', 'MJ', '#f472b6', 'Lid', 154, true, now() - interval '2 days');
  end if;
end $$;

-- Projecten
do $$
begin
  if not exists (select 1 from public.gallery_projects) then
    insert into public.gallery_projects (title, description, stack, preview_preset, author_name, author_initials, author_color, code_snippet)
    values
      ('React ↔ Vue State Bridge',
       'Synchroniseer teller- en gebruikersstatus realtime tussen een React-shell en een losse Vue 3-widget.',
       'React + Vue 3', 'state-bridge', 'Nora Visser', 'NV', '#60a5fa',
       '{"language":"tsx","filename":"StateBridge.tsx","code":"export function ReactShell() { return <span>React & Vue gesynchroniseerd</span>; }"}'::jsonb),
      ('Obsidian Violet Glow Card',
       'Interactieve CTA-kaart met de kenmerkende paarse hoekgloed en omschakelbare gouden accentkleur.',
       'Tailwind v4 · CSS', 'theme-card', 'Daan Bakker', 'DB', '#34d399',
       '{"language":"css","filename":"glow-card.css","code":".glow-card { background-image: radial-gradient(circle at 85% 85%, rgba(168,139,250,0.22), transparent 62%); }"}'::jsonb);
  end if;
end $$;

-- Chat
do $$
begin
  if not exists (select 1 from public.chat_messages) then
    insert into public.chat_messages (author_name, author_initials, author_color, author_role, body, created_at)
    values
      ('Sander Vermeer', 'SV', '#a88bfa', 'Beheerder', 'Goedemorgen! Het forum staat nu netjes op /forum en badges + Markdown-tabellen zijn geactiveerd.', now() - interval '12 minutes'),
      ('Lotte de Vries', 'LV', '#e8b353', 'Moderator', 'Ziet er superstrak uit! Vooral fijn dat helpers nu ook punten krijgen bij beste antwoorden.', now() - interval '9 minutes'),
      ('Daan Bakker', 'DB', '#34d399', 'Lid', 'Die vergelijkingstabel in het React + Vue topic van Nora leest echt tien keer makkelijker zo.', now() - interval '6 minutes');
  end if;
end $$;

-- Peiling
insert into public.polls (question, closes_in, closes_at)
select 'Wat bouwen we hierna? Kies de volgende functie voor het forum.', 'Sluit over 6 dagen', now() + interval '6 days'
where not exists (select 1 from public.polls);

insert into public.poll_options (poll_id, label, sort_order)
select p.id, v.label, v.sort_order
from public.polls p
cross join (values
  ('Privéberichten & directe @mentions met meldingen', 0),
  ('Bladwijzers & opgeslagen topics in je profiel', 1),
  ('Wekelijkse code-challenges met speciale badges', 2),
  ('Geavanceerd zoeken op tags, auteur en datum', 3)
) as v(label, sort_order)
where not exists (select 1 from public.poll_options po where po.poll_id = p.id);


-- ===========================================================================
-- Forum backend — reparaties & aanscherping bovenop 0001_forum_backend.sql
--
-- Uitvoeren NA 0001 in de Supabase SQL Editor (of via `supabase db push`).
-- Idempotent: mag meerdere keren gedraaid worden.
--
-- Wat dit oplost:
--  1. Registreren faalde als twee mensen hetzelfde e-mailbegin hadden
--     (bv. info@a.nl en info@b.nl) door een dubbele `handle`.
--  2. Rollen van andere leden waren onzichtbaar → iedereen leek "Lid".
--  3. Stemmen in de peiling faalde altijd (upsert had geen UPDATE-recht).
--  4. "Beste antwoord" markeren werkte alleen voor moderators.
--  5. `last_activity` van een topic werd niet bijgewerkt bij andermans reactie.
--  6. `posts_count` bleef altijd 0.
--  7. Beheer → Topics faalde (kolom `category_id` bestond niet).
--  8. Vastmaken/vergrendelen logde 'pinned'/'locked' → check-constraint fout.
--  9. Moderators konden chatberichten niet verwijderen (stil 0 rijen).
-- 10. Beveiliging: auteursnaam/rol worden server-side ingevuld (geen
--     impersonatie), leden kunnen eigen topics niet zelf vastmaken, en
--     reputatie die je jezelf geeft is begrensd.
-- 11. Stemmen/likes/reacties tellen nu ook mee voor niet-ingelogde bezoekers.
-- 12. Admins konden geen rollen wijzigen (ontbrekend UPDATE-recht op user_roles).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Nieuwe gebruiker → profiel + rol (unieke handle)
-- ---------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_name text;
  uname text;
begin
  -- Weergavenaam: wat de gebruiker bij registratie invulde (full_name).
  base_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'user_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'lid'
  );
  base_name := left(base_name, 40);

  -- username is uniek dankzij het id-achtervoegsel; handle volgt de username.
  uname := lower(regexp_replace(
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'user_name'), ''), base_name),
    '[^a-zA-Z0-9_]+', '', 'g'));
  uname := left(uname, 30);
  if uname = '' then
    uname := 'lid';
  end if;
  uname := uname || '-' || substr(new.id::text, 1, 8);

  insert into public.profiles (
    id, username, display_name, handle, initials, avatar_color, status_text
  )
  values (
    new.id,
    uname,
    base_name,
    '@' || uname,
    upper(left(base_name, 2)),
    '#a88bfa',
    'Actief op /forum'
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'member')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Eventuele bestaande auth-gebruikers zonder profiel/rol alsnog aanmaken
-- (bv. als je de tabellen opnieuw hebt aangemaakt in een bestaand project).
insert into public.profiles (id, username, display_name, handle, initials, avatar_color, status_text)
select
  u.id,
  'lid-' || substr(u.id::text, 1, 8),
  coalesce(nullif(split_part(coalesce(u.email, ''), '@', 1), ''), 'lid'),
  '@lid-' || substr(u.id::text, 1, 8),
  upper(left(coalesce(nullif(split_part(coalesce(u.email, ''), '@', 1), ''), 'lid'), 2)),
  '#a88bfa',
  'Actief op /forum'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict do nothing;

insert into public.user_roles (user_id, role)
select u.id, 'member'
from auth.users u
where not exists (select 1 from public.user_roles r where r.user_id = u.id)
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Rollen zijn openbaar leesbaar (nodig voor badges "Beheerder"/"Moderator")
-- ---------------------------------------------------------------------------
grant select on table public.user_roles to anon, authenticated;
-- Admins wijzigen rollen via Beheer → Leden; RLS beperkt dit tot admins.
grant insert, update, delete on table public.user_roles to authenticated;

drop policy if exists "Users read own role" on public.user_roles;
drop policy if exists "Roles are public" on public.user_roles;
create policy "Roles are public" on public.user_roles
  for select to anon, authenticated using (true);

-- Rollabel zoals de frontend het toont
create or replace function private.role_label(target_user_id uuid)
returns text
language sql
security definer
set search_path = ''
stable
as $$
  select case coalesce((select ur.role from public.user_roles ur where ur.user_id = target_user_id), 'member')
    when 'admin' then 'Beheerder'
    when 'moderator' then 'Moderator'
    else 'Lid'
  end;
$$;

revoke all on function private.role_label(uuid) from public;
grant execute on function private.role_label(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Peiling: van stem wisselen via upsert
-- ---------------------------------------------------------------------------
grant update on table public.poll_votes to authenticated;

drop policy if exists "Users change own poll vote" on public.poll_votes;
create policy "Users change own poll vote" on public.poll_votes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Een gekozen optie moet bij dezelfde peiling horen
create or replace function private.check_poll_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.poll_options po
    where po.id = new.option_id and po.poll_id = new.poll_id
  ) then
    raise exception 'Deze optie hoort niet bij deze peiling';
  end if;
  return new;
end;
$$;

drop trigger if exists poll_votes_check on public.poll_votes;
create trigger poll_votes_check before insert or update on public.poll_votes
  for each row execute function private.check_poll_vote();

-- ---------------------------------------------------------------------------
-- 4. Beste antwoord: topic-auteur mag dit markeren, maar verder niets wijzigen
-- ---------------------------------------------------------------------------
drop policy if exists "Topic authors mark best answer" on public.replies;
create policy "Topic authors mark best answer" on public.replies
  for update to authenticated
  using (exists (
    select 1 from public.topics t
    where t.id = topic_id and t.author_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.topics t
    where t.id = topic_id and t.author_id = (select auth.uid())
  ));

create or replace function private.guard_reply_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  is_mod boolean;
  is_topic_author boolean;
begin
  -- service_role / SQL Editor: geen beperkingen
  if uid is null then
    return new;
  end if;

  is_mod := private.has_role('moderator');
  if is_mod then
    return new;
  end if;

  select exists (
    select 1 from public.topics t where t.id = old.topic_id and t.author_id = uid
  ) into is_topic_author;

  if new.is_best_answer is distinct from old.is_best_answer and not is_topic_author then
    raise exception 'Alleen de topic-starter kan een beste antwoord kiezen';
  end if;

  if old.author_id is distinct from uid then
    -- Geen eigen reactie: alleen is_best_answer mag veranderen.
    if (new.body, new.code_snippet, new.attachments, new.topic_id, new.author_id,
        new.author_name, new.author_initials, new.author_color, new.author_role)
       is distinct from
       (old.body, old.code_snippet, old.attachments, old.topic_id, old.author_id,
        old.author_name, old.author_initials, old.author_color, old.author_role) then
      raise exception 'Je kunt alleen je eigen reacties bewerken';
    end if;
  else
    -- Eigen reactie: auteur en topic blijven vast.
    if new.author_id is distinct from old.author_id or new.topic_id is distinct from old.topic_id then
      raise exception 'Auteur of topic van een reactie kan niet worden gewijzigd';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists replies_guard_update on public.replies;
create trigger replies_guard_update before update on public.replies
  for each row execute function private.guard_reply_update();

-- Topics: alleen moderators mogen vastmaken/vergrendelen, auteur blijft vast
create or replace function private.guard_topic_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or private.has_role('moderator') then
    return new;
  end if;

  if new.pinned is distinct from old.pinned or new.locked is distinct from old.locked then
    raise exception 'Alleen moderators kunnen topics vastmaken of vergrendelen';
  end if;

  if new.author_id is distinct from old.author_id then
    raise exception 'De auteur van een topic kan niet worden gewijzigd';
  end if;

  return new;
end;
$$;

drop trigger if exists topics_guard_update on public.topics;
create trigger topics_guard_update before update on public.topics
  for each row execute function private.guard_topic_update();

-- Reageren op een vergrendeld topic kan alleen door moderators
create or replace function private.guard_reply_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
     and exists (select 1 from public.topics t where t.id = new.topic_id and t.locked)
     and not private.has_role('moderator') then
    raise exception 'Dit topic is vergrendeld';
  end if;
  return new;
end;
$$;

drop trigger if exists replies_guard_insert on public.replies;
create trigger replies_guard_insert before insert on public.replies
  for each row execute function private.guard_reply_insert();

-- ---------------------------------------------------------------------------
-- 5 + 6. last_activity en posts_count server-side bijhouden
-- ---------------------------------------------------------------------------
create or replace function private.after_reply_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.topics set last_activity = new.created_at where id = new.topic_id;
    if new.author_id is not null then
      update public.profiles set posts_count = posts_count + 1 where id = new.author_id;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.author_id is not null then
      update public.profiles set posts_count = greatest(0, posts_count - 1) where id = old.author_id;
    end if;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists replies_after_change on public.replies;
create trigger replies_after_change after insert or delete on public.replies
  for each row execute function private.after_reply_change();

create or replace function private.after_topic_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.author_id is not null then
      update public.profiles set posts_count = posts_count + 1 where id = new.author_id;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.author_id is not null then
      update public.profiles set posts_count = greatest(0, posts_count - 1) where id = old.author_id;
    end if;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists topics_after_change on public.topics;
create trigger topics_after_change after insert or delete on public.topics
  for each row execute function private.after_topic_change();

-- posts_count één keer goed zetten op basis van bestaande data
update public.profiles p
set posts_count = s.n
from (
  select pr.id,
         (select count(*) from public.topics t where t.author_id = pr.id)
       + (select count(*) from public.replies r where r.author_id = pr.id) as n
  from public.profiles pr
) s
where p.id = s.id
  and p.posts_count is distinct from s.n;

-- ---------------------------------------------------------------------------
-- 10. Auteursgegevens server-side invullen (geen "Beheerder" spelen)
-- ---------------------------------------------------------------------------
create or replace function private.stamp_author()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  prof record;
  has_profile boolean;
  label text;
begin
  -- Alleen voor ingelogde gebruikers; seed-data/SQL Editor blijft vrij.
  if uid is null then
    return new;
  end if;

  select display_name, initials, avatar_color into prof
  from public.profiles where id = uid;
  has_profile := found;

  label := private.role_label(uid);

  if tg_table_name = 'chat_messages' then
    new.user_id := uid;
  else
    new.author_id := uid;
  end if;

  if has_profile then
    new.author_name := prof.display_name;
    new.author_initials := coalesce(nullif(prof.initials, ''), upper(left(prof.display_name, 2)));
    new.author_color := coalesce(nullif(prof.avatar_color, ''), new.author_color, '#a88bfa');
  end if;

  if tg_table_name <> 'gallery_projects' then
    new.author_role := label;
  end if;

  -- Gewone leden kunnen een nieuw topic niet direct vastgemaakt/vergrendeld plaatsen.
  if tg_table_name = 'topics' and not private.has_role('moderator') then
    new.pinned := false;
    new.locked := false;
    new.views := 0;
  end if;

  return new;
end;
$$;

drop trigger if exists topics_stamp_author on public.topics;
create trigger topics_stamp_author before insert on public.topics
  for each row execute function private.stamp_author();

drop trigger if exists replies_stamp_author on public.replies;
create trigger replies_stamp_author before insert on public.replies
  for each row execute function private.stamp_author();

drop trigger if exists chat_messages_stamp_author on public.chat_messages;
create trigger chat_messages_stamp_author before insert on public.chat_messages
  for each row execute function private.stamp_author();

drop trigger if exists gallery_projects_stamp_author on public.gallery_projects;
create trigger gallery_projects_stamp_author before insert on public.gallery_projects
  for each row execute function private.stamp_author();

-- Reputatie die je jezelf geeft: max +15 per keer en alleen bekende badges.
-- Moderators/admins mogen vrij punten en badges toekennen.
create or replace function private.award_reputation(
  target_user_id uuid,
  delta integer,
  badge text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  is_mod boolean;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  is_mod := private.has_role('moderator');

  if target_user_id <> uid and not is_mod then
    raise exception 'Not allowed';
  end if;

  if not is_mod then
    if coalesce(delta, 0) < 0 or coalesce(delta, 0) > 15 then
      raise exception 'Ongeldige reputatiewijziging';
    end if;
    if badge is not null
       and badge not in ('Topic Starter', 'Actieve Helper', 'Live Chatter', 'Project Pionier') then
      raise exception 'Deze badge kun je niet zelf toekennen';
    end if;
  end if;

  update public.profiles p
  set
    reputation = greatest(0, p.reputation + coalesce(delta, 0)),
    badges = case
      when badge is not null and not (badge = any(p.badges))
        then array_append(p.badges, badge)
      else p.badges
    end
  where p.id = target_user_id;
end;
$$;

revoke all on function private.award_reputation(uuid, integer, text) from public;
grant execute on function private.award_reputation(uuid, integer, text) to authenticated;

-- reputation/badges/posts_count zijn nooit direct door de client te wijzigen
revoke update on table public.profiles from authenticated;
grant update (display_name, handle, avatar_url, avatar_color, bio, status_text,
              github_handle, discord_handle, theme_accent, initials, last_seen)
  on table public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Beheer → Topics verwacht `category_id`
-- ---------------------------------------------------------------------------
alter table public.topics
  add column if not exists category_id text generated always as (category) stored;

-- ---------------------------------------------------------------------------
-- 8. Moderatielog: alle acties die het dashboard gebruikt toestaan
-- ---------------------------------------------------------------------------
alter table public.moderation_actions drop constraint if exists moderation_actions_action_check;
alter table public.moderation_actions add constraint moderation_actions_action_check
  check (action in (
    'delete', 'edit', 'pin', 'unpin', 'pinned', 'lock', 'unlock', 'locked',
    'publish', 'unpublish', 'warn', 'ban', 'role_change'
  ));

-- ---------------------------------------------------------------------------
-- 9. Moderators mogen chatberichten verwijderen
-- ---------------------------------------------------------------------------
drop policy if exists "Authors and admins delete chat" on public.chat_messages;
drop policy if exists "Authors and moderators delete chat" on public.chat_messages;
create policy "Authors and moderators delete chat" on public.chat_messages
  for delete to authenticated
  using ((select auth.uid()) = user_id or (select private.has_role('moderator')));

-- ---------------------------------------------------------------------------
-- 11. Tellers zichtbaar voor bezoekers (alleen lezen)
-- ---------------------------------------------------------------------------
grant select on table public.topic_votes, public.reply_likes, public.project_likes,
                      public.poll_votes, public.chat_reactions to anon;

drop policy if exists "Votes are visible" on public.topic_votes;
create policy "Votes are visible" on public.topic_votes
  for select to anon, authenticated using (true);

drop policy if exists "Likes are visible" on public.reply_likes;
create policy "Likes are visible" on public.reply_likes
  for select to anon, authenticated using (true);

drop policy if exists "Project likes are visible" on public.project_likes;
create policy "Project likes are visible" on public.project_likes
  for select to anon, authenticated using (true);

drop policy if exists "Votes are visible" on public.poll_votes;
create policy "Votes are visible" on public.poll_votes
  for select to anon, authenticated using (true);

drop policy if exists "Reactions are visible" on public.chat_reactions;
create policy "Reactions are visible" on public.chat_reactions
  for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- Realtime: ook nieuws en peilingstemmen live
-- ---------------------------------------------------------------------------
do $$
declare
  tbl text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach tbl in array array['news', 'poll_votes', 'gallery_projects'] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = tbl
      ) then
        execute format('alter publication supabase_realtime add table public.%I', tbl);
      end if;
    end loop;
  end if;
end $$;

-- PostgREST de nieuwe kolommen/rechten direct laten zien
notify pgrst, 'reload schema';


-- ===========================================================================
-- Forum — voorbeeldteksten in gewone taal (minder "AI-praat")
--
-- Past ALLEEN de voorbeeld-rijen uit 0001 aan, en alleen als die nog precies
-- de oude tekst hebben. Eigen nieuws, topics en chat blijven onaangeroerd.
-- Idempotent: mag meerdere keren gedraaid worden.
-- ===========================================================================

-- Nieuws
update public.news set
  title = 'Het forum heeft een eigen plek gekregen',
  summary = 'Alles staat nu onder /forum. Ook nieuw: punten als je anderen helpt, en je kunt tabellen en plaatjes in je posts zetten.'
where slug = 'forum-verplaatst-badges-tabellen-bijlagen'
  and title = 'Forum verplaatst naar /forum + Badges, Tabellen & Bijlagen live';

update public.news set
  title = 'Zoeken werkt nu overal',
  summary = 'Druk op / of Ctrl+K en zoek in één keer door topics, nieuws en projecten. In de chat kun je nu ook meldingen aanzetten.'
where slug = 'globale-zoekbalk-achtergrondmeldingen'
  and title = 'Globale zoekbalk & achtergrondmeldingen voor Live chat toegevoegd';

update public.news set
  title = 'Je kunt nu code en projecten delen',
  summary = 'Plak code in je topic en het wordt netjes opgemaakt. In de galerij laat je zien wat je gemaakt hebt.'
where slug = 'code-snippets-project-galerij'
  and title = 'Nieuw: Code-snippets & Project-galerij met live previews gelanceerd';

update public.news set
  title = 'Jullie kiezen wat we hierna bouwen',
  summary = 'Elke week een korte peiling. Plus een eerlijke update over wat de server kost en hoeveel er al binnen is.'
where slug = 'community-peiling-supporter-doelen'
  and title = 'Community Peiling & Supporter-doelen voor dit kwartaal';

-- Welkomsttopic
update public.topics set
  title = 'Welkom! Lees dit even als je nieuw bent',
  excerpt = 'Hoe het forum werkt, waar je wat vindt en een paar huisregels. Kort, beloofd.',
  body = E'Hoi allemaal!\n\nLeuk dat je er bent. Een paar dingen om te weten:\n• Vragen stellen mag altijd, ook als je denkt dat het een domme vraag is.\n• Help je iemand, dan krijg je punten en soms een badge. Leuk, maar geen wedstrijd.\n• In je posts kun je code, tabellen en plaatjes zetten.\n\nStel je gerust even voor in de chat onderaan. Tot zo!\n\n— Sander'
where author_id is null
  and title = 'Welkom op het vernieuwde /forum — badges, tabellen & bijlagen staan live!';

-- Chat
update public.chat_messages set body = 'Goeiemorgen allemaal ☕ Het forum staat nu op /forum, laat maar weten als er iets raar doet.'
where user_id is null
  and body = 'Goedemorgen! Het forum staat nu netjes op /forum en badges + Markdown-tabellen zijn geactiveerd.';

update public.chat_messages set body = 'Ziet er goed uit! Fijn dat je nu ook punten krijgt als je iemand helpt.'
where user_id is null
  and body = 'Ziet er superstrak uit! Vooral fijn dat helpers nu ook punten krijgen bij beste antwoorden.';

update public.chat_messages set body = 'Die tabel in het topic van Nora leest echt een stuk makkelijker trouwens.'
where user_id is null
  and body = 'Die vergelijkingstabel in het React + Vue topic van Nora leest echt tien keer makkelijker zo.';

-- Peiling
update public.polls set question = 'Wat moeten we hierna bouwen?'
where question = 'Wat bouwen we hierna? Kies de volgende functie voor het forum.';

update public.poll_options set label = 'Privéberichten'
where label = 'Privéberichten & directe @mentions met meldingen';

update public.poll_options set label = 'Topics opslaan voor later'
where label = 'Bladwijzers & opgeslagen topics in je profiel';

update public.poll_options set label = 'Een wekelijkse code-uitdaging'
where label = 'Wekelijkse code-challenges met speciale badges';

update public.poll_options set label = 'Beter zoeken (op tag, auteur of datum)'
where label = 'Geavanceerd zoeken op tags, auteur en datum';


-- ===========================================================================
-- 0004 — Uitbreiding beheerdashboard
--
-- Uitvoeren NA 0001 t/m 0003 (of na setup_all.sql) in de Supabase SQL Editor.
-- Idempotent: mag meerdere keren gedraaid worden. Raakt bestaande data niet aan.
--
-- Wat dit toevoegt:
--  1. Schorsingen (member_bans): moderators schorsen leden tijdelijk of
--     permanent. Een geschorst lid kan geen topics, reacties, chatberichten of
--     projecten meer plaatsen. Schorsen en opheffen wordt automatisch gelogd.
--  2. Peilingen beheren: admins maken, openen, sluiten en verwijderen peilingen.
--     Er is altijd maar één actieve peiling.
--  3. Reputatie en badges aanpassen via public.admin_update_member (alleen admins,
--     wordt gelogd).
--  4. Activiteitsgrafiek: public.admin_activity(dagen) voor het dashboard.
--  5. Extra acties in het moderatielog (unban, solve, move, create, close, ...).
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. Moderatielog: nieuwe acties toestaan
-- ---------------------------------------------------------------------------
alter table public.moderation_actions drop constraint if exists moderation_actions_action_check;
alter table public.moderation_actions add constraint moderation_actions_action_check
  check (action in (
    'delete', 'edit', 'create',
    'pin', 'unpin', 'pinned', 'lock', 'unlock', 'locked',
    'solve', 'unsolve', 'move',
    'publish', 'unpublish',
    'open', 'close',
    'warn', 'ban', 'unban', 'role_change', 'edit_member'
  ));


-- ---------------------------------------------------------------------------
-- 2. Schorsingen
-- ---------------------------------------------------------------------------
create table if not exists public.member_bans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (char_length(btrim(reason)) between 3 and 500),
  banned_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz,                 -- leeg = permanent
  lifted_at timestamptz,                  -- gevuld = opgeheven
  lifted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists member_bans_user_idx on public.member_bans (user_id, created_at desc);
create index if not exists member_bans_active_idx on public.member_bans (created_at desc) where lifted_at is null;

-- Actieve schorsing van een lid (of niets).
create or replace function private.active_ban(target uuid)
returns public.member_bans
language sql
stable
security definer
set search_path = ''
as $$
  select b.*
  from public.member_bans b
  where b.user_id = target
    and b.lifted_at is null
    and (b.expires_at is null or b.expires_at > now())
  order by b.created_at desc
  limit 1;
$$;

revoke all on function private.active_ban(uuid) from public, anon, authenticated;

-- Wie mag wie schorsen: moderators schorsen leden, admins ook moderators.
-- Admins en jezelf schorsen kan niet. Schorser en tijdstip bepaalt de server.
create or replace function private.before_ban_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  target_role text;
begin
  new.created_at := now();
  new.lifted_at := null;
  new.lifted_by := null;
  new.reason := btrim(new.reason);

  if uid is null then
    return new;  -- SQL Editor / service_role
  end if;

  if not private.has_role('moderator') then
    raise exception 'Alleen moderators en admins kunnen leden schorsen.';
  end if;
  if new.user_id = uid then
    raise exception 'Je kunt jezelf niet schorsen.';
  end if;

  select role into target_role from public.user_roles where user_id = new.user_id;
  if target_role = 'admin' then
    raise exception 'Een admin kan niet worden geschorst. Verander eerst de rol.';
  end if;
  if target_role = 'moderator' and not private.has_role('admin') then
    raise exception 'Alleen admins kunnen een moderator schorsen.';
  end if;
  if new.expires_at is not null and new.expires_at <= now() then
    raise exception 'De einddatum van een schorsing moet in de toekomst liggen.';
  end if;
  if (private.active_ban(new.user_id)).id is not null then
    raise exception 'Dit lid is al geschorst. Hef de huidige schorsing eerst op.';
  end if;

  new.banned_by := uid;
  return new;
end;
$$;

-- Opheffen: alleen lifted_at mag veranderen; de server vult wie en wanneer.
create or replace function private.before_ban_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is not null then
    if old.lifted_at is not null then
      raise exception 'Deze schorsing is al opgeheven.';
    end if;
    new.user_id := old.user_id;
    new.reason := old.reason;
    new.banned_by := old.banned_by;
    new.expires_at := old.expires_at;
    new.created_at := old.created_at;
    if new.lifted_at is not null then
      new.lifted_at := now();
      new.lifted_by := uid;
    end if;
  end if;
  return new;
end;
$$;

-- Schorsen en opheffen komen automatisch in het moderatielog.
create or replace function private.log_ban_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid;
begin
  if tg_op = 'INSERT' then
    actor := coalesce(new.banned_by, (select auth.uid()));
    if actor is not null then
      insert into public.moderation_actions (moderator_id, action, target_table, target_id, reason)
      values (actor, 'ban', 'profiles', new.user_id::text,
              new.reason || case when new.expires_at is null then ' (permanent)'
                                 else ' (tot ' || to_char(new.expires_at at time zone 'Europe/Amsterdam', 'DD-MM-YYYY HH24:MI') || ')' end);
    end if;
  elsif tg_op = 'UPDATE' and old.lifted_at is null and new.lifted_at is not null then
    actor := coalesce(new.lifted_by, (select auth.uid()));
    if actor is not null then
      insert into public.moderation_actions (moderator_id, action, target_table, target_id, reason)
      values (actor, 'unban', 'profiles', new.user_id::text, 'Schorsing opgeheven');
    end if;
  end if;
  return null;
end;
$$;

revoke all on function private.before_ban_insert() from public, anon, authenticated;
revoke all on function private.before_ban_update() from public, anon, authenticated;
revoke all on function private.log_ban_change() from public, anon, authenticated;

drop trigger if exists member_bans_before_insert on public.member_bans;
create trigger member_bans_before_insert before insert on public.member_bans
  for each row execute function private.before_ban_insert();

drop trigger if exists member_bans_before_update on public.member_bans;
create trigger member_bans_before_update before update on public.member_bans
  for each row execute function private.before_ban_update();

drop trigger if exists member_bans_log on public.member_bans;
create trigger member_bans_log after insert or update on public.member_bans
  for each row execute function private.log_ban_change();

alter table public.member_bans enable row level security;
revoke all on table public.member_bans from anon, authenticated;
grant select on table public.member_bans to authenticated;
grant insert (user_id, reason, expires_at) on table public.member_bans to authenticated;
grant update (lifted_at) on table public.member_bans to authenticated;
grant delete on table public.member_bans to authenticated;

-- Moderators zien alle schorsingen; een lid ziet alleen zijn eigen.
drop policy if exists "Moderators and self read bans" on public.member_bans;
create policy "Moderators and self read bans" on public.member_bans
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_role('moderator')));

drop policy if exists "Moderators create bans" on public.member_bans;
create policy "Moderators create bans" on public.member_bans
  for insert to authenticated
  with check ((select private.has_role('moderator')));

drop policy if exists "Moderators lift bans" on public.member_bans;
create policy "Moderators lift bans" on public.member_bans
  for update to authenticated
  using ((select private.has_role('moderator')))
  with check ((select private.has_role('moderator')));

drop policy if exists "Admins delete bans" on public.member_bans;
create policy "Admins delete bans" on public.member_bans
  for delete to authenticated
  using ((select private.has_role('admin')));

-- Geschorste leden kunnen niets plaatsen (duidelijke melding in de site).
create or replace function private.block_banned_author()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  ban public.member_bans;
begin
  if uid is null then
    return new;
  end if;
  ban := private.active_ban(uid);
  if ban.id is not null then
    raise exception 'Je account is geschorst%. Reden: %',
      case when ban.expires_at is null then ''
           else ' tot ' || to_char(ban.expires_at at time zone 'Europe/Amsterdam', 'DD-MM-YYYY HH24:MI') end,
      ban.reason
      using errcode = 'P0001', hint = 'banned';
  end if;
  return new;
end;
$$;

revoke all on function private.block_banned_author() from public, anon, authenticated;

drop trigger if exists aa_block_banned on public.topics;
create trigger aa_block_banned before insert on public.topics
  for each row execute function private.block_banned_author();

drop trigger if exists aa_block_banned on public.replies;
create trigger aa_block_banned before insert on public.replies
  for each row execute function private.block_banned_author();

drop trigger if exists aa_block_banned on public.chat_messages;
create trigger aa_block_banned before insert on public.chat_messages
  for each row execute function private.block_banned_author();

drop trigger if exists aa_block_banned on public.gallery_projects;
create trigger aa_block_banned before insert on public.gallery_projects
  for each row execute function private.block_banned_author();

-- Voor de site: ben ik geschorst? (null = nee)
create or replace function public.my_active_ban()
returns table (reason text, expires_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select b.reason, b.expires_at
  from public.member_bans b
  where b.user_id = (select auth.uid())
    and b.lifted_at is null
    and (b.expires_at is null or b.expires_at > now())
  order by b.created_at desc
  limit 1;
$$;

revoke all on function public.my_active_ban() from public, anon;
grant execute on function public.my_active_ban() to authenticated;


-- ---------------------------------------------------------------------------
-- 3. Peilingen beheren (admins)
-- ---------------------------------------------------------------------------
grant insert, update, delete on table public.polls to authenticated;
grant insert, update, delete on table public.poll_options to authenticated;

drop policy if exists "Admins manage polls" on public.polls;
create policy "Admins manage polls" on public.polls
  for all to authenticated
  using ((select private.has_role('admin')))
  with check ((select private.has_role('admin')));

drop policy if exists "Admins manage poll options" on public.poll_options;
create policy "Admins manage poll options" on public.poll_options
  for all to authenticated
  using ((select private.has_role('admin')))
  with check ((select private.has_role('admin')));

-- Maximaal één actieve peiling: een peiling openen sluit de andere.
create or replace function private.single_active_poll()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.active then
    update public.polls set active = false where id <> new.id and active;
  end if;
  return null;
end;
$$;

revoke all on function private.single_active_poll() from public, anon, authenticated;

drop trigger if exists polls_single_active on public.polls;
create trigger polls_single_active after insert or update of active on public.polls
  for each row execute function private.single_active_poll();


-- ---------------------------------------------------------------------------
-- 4. Reputatie en badges aanpassen (admins, gelogd)
-- ---------------------------------------------------------------------------
create or replace function public.admin_update_member(
  target_user_id uuid,
  new_reputation integer,
  new_badges text[],
  reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  old_rep integer;
  old_badges text[];
  clean_badges text[];
begin
  if uid is null or not private.has_role('admin') then
    raise exception 'Alleen admins kunnen reputatie en badges aanpassen.';
  end if;
  if new_reputation is null or new_reputation < 0 or new_reputation > 1000000 then
    raise exception 'Reputatie moet tussen 0 en 1.000.000 liggen.';
  end if;

  select coalesce(array_agg(distinct btrim(b0) order by btrim(b0)), '{}'::text[])
    into clean_badges
  from unnest(coalesce(new_badges, '{}'::text[])) as t(b0)
  where char_length(btrim(b0)) between 2 and 40;
  if array_length(clean_badges, 1) > 30 then
    raise exception 'Maximaal 30 badges per lid.';
  end if;

  select reputation, badges into old_rep, old_badges
  from public.profiles where id = target_user_id;
  if not found then
    raise exception 'Dit lid bestaat niet (meer).';
  end if;

  update public.profiles
  set reputation = new_reputation, badges = clean_badges
  where id = target_user_id;

  insert into public.moderation_actions (moderator_id, action, target_table, target_id, reason)
  values (
    uid, 'edit_member', 'profiles', target_user_id::text,
    concat_ws(' · ',
      case when old_rep is distinct from new_reputation
           then 'Reputatie ' || old_rep || ' → ' || new_reputation end,
      case when old_badges is distinct from clean_badges
           then 'Badges: ' || coalesce(nullif(array_to_string(clean_badges, ', '), ''), 'geen') end,
      nullif(btrim(coalesce(reason, '')), ''))
  );
end;
$$;

revoke all on function public.admin_update_member(uuid, integer, text[], text) from public, anon;
grant execute on function public.admin_update_member(uuid, integer, text[], text) to authenticated;


-- ---------------------------------------------------------------------------
-- 5. Activiteit per dag (moderators en admins)
-- ---------------------------------------------------------------------------
create or replace function public.admin_activity(days integer default 14)
returns table (day date, topics bigint, replies bigint, chat bigint, signups bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  n integer := least(greatest(coalesce(days, 14), 1), 90);
  first_day date := (now() at time zone 'Europe/Amsterdam')::date - (n - 1);
begin
  if not private.has_role('moderator') then
    raise exception 'Alleen moderators en admins kunnen de activiteit bekijken.';
  end if;

  return query
  with d as (
    select generate_series(first_day, first_day + (n - 1), interval '1 day')::date as day
  )
  select
    d.day,
    (select count(*) from public.topics t
      where (t.created_at at time zone 'Europe/Amsterdam')::date = d.day),
    (select count(*) from public.replies r
      where (r.created_at at time zone 'Europe/Amsterdam')::date = d.day),
    (select count(*) from public.chat_messages c
      where (c.created_at at time zone 'Europe/Amsterdam')::date = d.day),
    (select count(*) from public.profiles p
      where (p.created_at at time zone 'Europe/Amsterdam')::date = d.day)
  from d
  order by d.day;
end;
$$;

revoke all on function public.admin_activity(integer) from public, anon;
grant execute on function public.admin_activity(integer) to authenticated;


-- ---------------------------------------------------------------------------
-- 6. Realtime: schorsingen live in het dashboard
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'member_bans'
     ) then
    alter publication supabase_realtime add table public.member_bans;
  end if;
end;
$$;


-- ===========================================================================
-- 0005 — Releases + nieuwe forumcategorieën (DevBest-stijl)
--
-- Uitvoeren NA 0001 t/m 0004 in de Supabase SQL Editor.
-- Idempotent: mag meerdere keren gedraaid worden. Raakt bestaande data niet aan.
--
-- Wat dit toevoegt:
--  1. Forumcategorieën Development, Tutorials en Requests; "Hulp & Vragen"
--     heet nu "Q&A / Hulp".
--  2. Labels op topics ([HULP], [DEVELOPMENT], [TUTORIAL], [REQUEST], ...).
--  3. Releases: leden publiceren hun project met beschrijving, screenshots,
--     links (GitHub/demo), licentie en tags.
--  4. Versies per release met changelog en een bestand (zip, max 25 MB) of
--     een downloadlink. Downloads worden geteld.
--  5. Sterren (favorieten) en reacties op releases.
--  6. Opslagmap "releases" in Supabase Storage: iedereen kan downloaden,
--     leden uploaden alleen in hun eigen map, alleen veilige bestandstypes.
--  7. Moderatie: releases uitlichten of verbergen (moderators), verwijderen.
--     Geschorste leden kunnen niets publiceren.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. Forumcategorieën
-- ---------------------------------------------------------------------------
insert into public.categories (id, name, description, color, sort_order) values
  ('development', 'Development', 'Laat zien waar je aan werkt en deel je voortgang', '#fb923c', 4),
  ('tutorials',   'Tutorials',   'Uitleg en handleidingen van leden',                '#22d3ee', 5),
  ('requests',    'Requests',    'Hulp, teamleden of een script zoeken',             '#facc15', 6)
on conflict (id) do nothing;

update public.categories
set name = 'Q&A / Hulp', description = 'Programmeervragen: stel ze hier'
where id = 'hulp' and name = 'Hulp & Vragen';


-- ---------------------------------------------------------------------------
-- 2. Labels op topics
-- ---------------------------------------------------------------------------
alter table public.topics add column if not exists prefix text;

alter table public.topics drop constraint if exists topics_prefix_check;
alter table public.topics add constraint topics_prefix_check
  check (prefix is null or prefix in (
    'HULP', 'DEVELOPMENT', 'TUTORIAL', 'REQUEST', 'RELEASE', 'SHOWCASE', 'DISCUSSIE'
  ));


-- ---------------------------------------------------------------------------
-- 3. Releases
-- ---------------------------------------------------------------------------
create table if not exists public.releases (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 80),
  title text not null check (char_length(title) between 3 and 80),
  tagline text not null default '' check (char_length(tagline) <= 160),
  description text not null default '' check (char_length(description) <= 20000),
  category text not null default 'tool'
    check (category in ('web', 'cms', 'game', 'bot', 'tool', 'library', 'design', 'overig')),
  tags text[] not null default '{}' check (cardinality(tags) <= 8),
  author_id uuid references public.profiles (id) on delete set null,
  author_name text,
  author_initials text,
  author_color text,
  author_role text,
  cover_path text check (cover_path is null or char_length(cover_path) <= 300),
  screenshots text[] not null default '{}' check (cardinality(screenshots) <= 6),
  github_url text check (github_url is null or (github_url ~ '^https://' and char_length(github_url) <= 300)),
  demo_url text check (demo_url is null or (demo_url ~ '^https://' and char_length(demo_url) <= 300)),
  license text check (license is null or char_length(license) <= 40),
  latest_version text,
  downloads_count integer not null default 0 check (downloads_count >= 0),
  stars_count integer not null default 0 check (stars_count >= 0),
  views integer not null default 0 check (views >= 0),
  featured boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists releases_created_idx on public.releases (created_at desc);
create index if not exists releases_author_idx on public.releases (author_id);
create index if not exists releases_category_idx on public.releases (category);

create table if not exists public.release_versions (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases (id) on delete cascade,
  version text not null check (version ~ '^[0-9A-Za-z][0-9A-Za-z.+-]{0,30}$'),
  changelog text not null default '' check (char_length(changelog) <= 5000),
  file_path text check (file_path is null or char_length(file_path) <= 300),
  file_name text check (file_name is null or char_length(file_name) <= 160),
  file_size bigint check (file_size is null or file_size between 0 and 26214400),
  external_url text check (external_url is null or (external_url ~ '^https://' and char_length(external_url) <= 300)),
  downloads_count integer not null default 0 check (downloads_count >= 0),
  created_at timestamptz not null default now(),
  unique (release_id, version),
  check (file_path is not null or external_url is not null)
);

create index if not exists release_versions_release_idx on public.release_versions (release_id, created_at desc);

create table if not exists public.release_stars (
  release_id uuid not null references public.releases (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (release_id, user_id)
);

create table if not exists public.release_comments (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  author_name text,
  author_initials text,
  author_color text,
  author_role text,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists release_comments_release_idx on public.release_comments (release_id, created_at);


-- ---------------------------------------------------------------------------
-- 4. Serverregels
-- ---------------------------------------------------------------------------

-- Is deze release zichtbaar voor de huidige gebruiker?
create or replace function private.release_visible(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.releases r
    where r.id = target
      and (not r.hidden
           or r.author_id = (select auth.uid())
           or private.has_role('moderator'))
  );
$$;

revoke all on function private.release_visible(uuid) from public;
grant execute on function private.release_visible(uuid) to anon, authenticated;

-- Is de huidige gebruiker de maker van deze release (of moderator)?
create or replace function private.owns_release(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.releases r
    where r.id = target and r.author_id = (select auth.uid())
  ) or private.has_role('moderator');
$$;

revoke all on function private.owns_release(uuid) from public;
grant execute on function private.owns_release(uuid) to anon, authenticated;

-- Nieuwe release: tellers op nul, uitlichten/verbergen alleen door moderators,
-- unieke slug, max 5 releases per dag, +20 reputatie en de badge "Project Pionier".
create or replace function private.before_release_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  base_slug text;
begin
  if uid is null then
    return new;  -- SQL Editor / seed-data
  end if;

  if (select count(*) from public.releases
      where author_id = uid and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Je hebt vandaag al 5 releases gepubliceerd. Probeer het morgen opnieuw.'
      using errcode = 'P0001', hint = 'rate_limited';
  end if;

  new.title := btrim(new.title);
  new.downloads_count := 0;
  new.stars_count := 0;
  new.views := 0;
  new.latest_version := null;
  new.created_at := now();
  new.updated_at := now();
  if not private.has_role('moderator') then
    new.featured := false;
    new.hidden := false;
  end if;

  -- Slug al in gebruik? Plak er een kort stukje achter.
  base_slug := left(new.slug, 74);
  while exists (select 1 from public.releases where slug = new.slug) loop
    new.slug := base_slug || '-' || substr(md5(random()::text), 1, 4);
  end loop;

  update public.profiles p
  set reputation = p.reputation + 20,
      badges = case when 'Project Pionier' = any(p.badges) then p.badges
                    else array_append(p.badges, 'Project Pionier') end,
      posts_count = p.posts_count + 1
  where p.id = uid;

  return new;
end;
$$;

-- Release aanpassen: tellers en maker blijven vast; uitlichten/verbergen alleen moderators.
create or replace function private.before_release_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    return new;
  end if;
  if not private.has_role('moderator') then
    if new.featured is distinct from old.featured or new.hidden is distinct from old.hidden then
      raise exception 'Alleen moderators kunnen releases uitlichten of verbergen';
    end if;
  end if;
  new.author_id := old.author_id;
  new.slug := old.slug;
  new.created_at := old.created_at;
  if (new.title, new.tagline, new.description, new.category, new.tags, new.cover_path,
      new.screenshots, new.github_url, new.demo_url, new.license)
     is distinct from
     (old.title, old.tagline, old.description, old.category, old.tags, old.cover_path,
      old.screenshots, old.github_url, old.demo_url, old.license) then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

-- Nieuwe versie: bestand moet in de eigen map staan; release krijgt de nieuwste versie.
create or replace function private.before_release_version_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  new.downloads_count := 0;
  new.created_at := now();
  if uid is not null and new.file_path is not null
     and split_part(new.file_path, '/', 1) <> uid::text
     and not private.has_role('moderator') then
    raise exception 'Je kunt alleen je eigen bestanden aan een release koppelen';
  end if;
  return new;
end;
$$;

create or replace function private.after_release_version_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.releases
  set latest_version = new.version, updated_at = now()
  where id = new.release_id;
  return null;
end;
$$;

-- Sterren tellen.
create or replace function private.on_release_star()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.releases set stars_count = stars_count + 1 where id = new.release_id;
  else
    update public.releases set stars_count = greatest(0, stars_count - 1) where id = old.release_id;
  end if;
  return null;
end;
$$;

revoke all on function private.before_release_insert() from public, anon, authenticated;
revoke all on function private.before_release_update() from public, anon, authenticated;
revoke all on function private.before_release_version_insert() from public, anon, authenticated;
revoke all on function private.after_release_version_insert() from public, anon, authenticated;
revoke all on function private.on_release_star() from public, anon, authenticated;

-- Volgorde: eerst schorsing controleren (aa_), dan auteur invullen, dan de rest.
drop trigger if exists aa_block_banned on public.releases;
create trigger aa_block_banned before insert on public.releases
  for each row execute function private.block_banned_author();

drop trigger if exists ab_stamp_author on public.releases;
create trigger ab_stamp_author before insert on public.releases
  for each row execute function private.stamp_author();

drop trigger if exists ac_release_insert on public.releases;
create trigger ac_release_insert before insert on public.releases
  for each row execute function private.before_release_insert();

drop trigger if exists release_update on public.releases;
create trigger release_update before update on public.releases
  for each row execute function private.before_release_update();

drop trigger if exists aa_block_banned on public.release_versions;
create trigger aa_block_banned before insert on public.release_versions
  for each row execute function private.block_banned_author();

drop trigger if exists release_version_insert on public.release_versions;
create trigger release_version_insert before insert on public.release_versions
  for each row execute function private.before_release_version_insert();

drop trigger if exists release_version_latest on public.release_versions;
create trigger release_version_latest after insert on public.release_versions
  for each row execute function private.after_release_version_insert();

drop trigger if exists release_star_count on public.release_stars;
create trigger release_star_count after insert or delete on public.release_stars
  for each row execute function private.on_release_star();

drop trigger if exists aa_block_banned on public.release_comments;
create trigger aa_block_banned before insert on public.release_comments
  for each row execute function private.block_banned_author();

drop trigger if exists ab_stamp_author on public.release_comments;
create trigger ab_stamp_author before insert on public.release_comments
  for each row execute function private.stamp_author();


-- Download tellen en het bestand of de link teruggeven (iedereen, ook zonder account).
create or replace function public.register_release_download(p_version uuid)
returns table (file_path text, external_url text, file_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.release_versions;
begin
  select * into v from public.release_versions where id = p_version;
  if v.id is null or not private.release_visible(v.release_id) then
    raise exception 'Deze download bestaat niet (meer)';
  end if;
  update public.release_versions set downloads_count = downloads_count + 1 where id = v.id;
  update public.releases set downloads_count = downloads_count + 1 where id = v.release_id;
  return query select v.file_path, v.external_url, v.file_name;
end;
$$;

revoke all on function public.register_release_download(uuid) from public;
grant execute on function public.register_release_download(uuid) to anon, authenticated;

-- Weergave tellen.
create or replace function public.register_release_view(p_release uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.releases set views = views + 1 where id = p_release and not hidden;
$$;

revoke all on function public.register_release_view(uuid) from public;
grant execute on function public.register_release_view(uuid) to anon, authenticated;


-- ---------------------------------------------------------------------------
-- 5. Toegangsregels (RLS) en rechten
-- ---------------------------------------------------------------------------
alter table public.releases enable row level security;
alter table public.release_versions enable row level security;
alter table public.release_stars enable row level security;
alter table public.release_comments enable row level security;

drop policy if exists "Releases are public" on public.releases;
create policy "Releases are public" on public.releases
  for select to anon, authenticated
  using (not hidden or author_id = (select auth.uid()) or (select private.has_role('moderator')));

drop policy if exists "Members publish releases" on public.releases;
create policy "Members publish releases" on public.releases
  for insert to authenticated
  with check (author_id = (select auth.uid()));

drop policy if exists "Authors and moderators update releases" on public.releases;
create policy "Authors and moderators update releases" on public.releases
  for update to authenticated
  using (author_id = (select auth.uid()) or (select private.has_role('moderator')))
  with check (author_id = (select auth.uid()) or (select private.has_role('moderator')));

drop policy if exists "Authors and moderators delete releases" on public.releases;
create policy "Authors and moderators delete releases" on public.releases
  for delete to authenticated
  using (author_id = (select auth.uid()) or (select private.has_role('moderator')));

drop policy if exists "Release versions are public" on public.release_versions;
create policy "Release versions are public" on public.release_versions
  for select to anon, authenticated
  using ((select private.release_visible(release_id)));

drop policy if exists "Authors add versions" on public.release_versions;
create policy "Authors add versions" on public.release_versions
  for insert to authenticated
  with check ((select private.owns_release(release_id)));

drop policy if exists "Authors delete versions" on public.release_versions;
create policy "Authors delete versions" on public.release_versions
  for delete to authenticated
  using ((select private.owns_release(release_id)));

drop policy if exists "Release stars are public" on public.release_stars;
create policy "Release stars are public" on public.release_stars
  for select to anon, authenticated using (true);

drop policy if exists "Members star releases" on public.release_stars;
create policy "Members star releases" on public.release_stars
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.release_visible(release_id)));

drop policy if exists "Members unstar releases" on public.release_stars;
create policy "Members unstar releases" on public.release_stars
  for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Release comments are public" on public.release_comments;
create policy "Release comments are public" on public.release_comments
  for select to anon, authenticated
  using ((select private.release_visible(release_id)));

drop policy if exists "Members comment on releases" on public.release_comments;
create policy "Members comment on releases" on public.release_comments
  for insert to authenticated
  with check (author_id = (select auth.uid()) and (select private.release_visible(release_id)));

drop policy if exists "Authors and moderators delete release comments" on public.release_comments;
create policy "Authors and moderators delete release comments" on public.release_comments
  for delete to authenticated
  using (author_id = (select auth.uid()) or (select private.has_role('moderator')));

revoke all on table public.releases from anon, authenticated;
grant select on table public.releases to anon, authenticated;
grant insert (slug, title, tagline, description, category, tags, cover_path, screenshots,
              github_url, demo_url, license, featured, hidden)
  on table public.releases to authenticated;
grant update (title, tagline, description, category, tags, cover_path, screenshots,
              github_url, demo_url, license, featured, hidden)
  on table public.releases to authenticated;
grant delete on table public.releases to authenticated;

revoke all on table public.release_versions from anon, authenticated;
grant select on table public.release_versions to anon, authenticated;
grant insert (release_id, version, changelog, file_path, file_name, file_size, external_url)
  on table public.release_versions to authenticated;
grant delete on table public.release_versions to authenticated;

revoke all on table public.release_stars from anon, authenticated;
grant select on table public.release_stars to anon, authenticated;
grant insert (release_id, user_id) on table public.release_stars to authenticated;
grant delete on table public.release_stars to authenticated;

revoke all on table public.release_comments from anon, authenticated;
grant select on table public.release_comments to anon, authenticated;
grant insert (release_id, author_id, body) on table public.release_comments to authenticated;
grant delete on table public.release_comments to authenticated;


-- ---------------------------------------------------------------------------
-- 6. Opslag: bucket "releases"
--    Pad: <jouw-user-id>/<release-slug>/<bestand>. Iedereen kan downloaden.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit)
    values ('releases', 'releases', true, 26214400)
    on conflict (id) do update set public = true, file_size_limit = 26214400;
  end if;

  if to_regclass('storage.objects') is not null then
    execute 'drop policy if exists "Release files are public" on storage.objects';
    execute $p$
      create policy "Release files are public" on storage.objects
        for select to anon, authenticated
        using (bucket_id = 'releases')
    $p$;

    execute 'drop policy if exists "Members upload release files" on storage.objects';
    execute $p$
      create policy "Members upload release files" on storage.objects
        for insert to authenticated
        with check (
          bucket_id = 'releases'
          and (storage.foldername(name))[1] = (select auth.uid())::text
          and lower(storage.extension(name)) in (
            'zip', 'rar', '7z', 'gz', 'tgz', 'tar', 'jar',
            'png', 'jpg', 'jpeg', 'webp', 'gif', 'pdf', 'txt', 'md'
          )
        )
    $p$;

    execute 'drop policy if exists "Members delete own release files" on storage.objects';
    execute $p$
      create policy "Members delete own release files" on storage.objects
        for delete to authenticated
        using (
          bucket_id = 'releases'
          and ((storage.foldername(name))[1] = (select auth.uid())::text
               or (select private.has_role('moderator')))
        )
    $p$;
  end if;
end;
$$;


-- ===========================================================================
-- Forum-instellingen voor het beheerdashboard (module "Instellingen").
-- Idempotent: mag meerdere keren gedraaid worden.
-- ===========================================================================

create table if not exists public.site_settings (
  key text primary key check (key ~ '^[a-z0-9_]{2,60}$'),
  value text check (value is null or char_length(value) <= 10000),
  description text,
  category text not null default 'Algemeen',
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;
-- Geen policies: lezen en schrijven alleen via de RPC's hieronder.

create or replace function public.admin_get_settings(category text default null)
returns setof public.site_settings
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_role('admin') then
    raise exception 'Alleen admins kunnen de instellingen bekijken.';
  end if;
  return query
  select * from public.site_settings s
  where admin_get_settings.category is null or s.category = admin_get_settings.category
  order by s.key;
end;
$$;

create or replace function public.admin_update_setting(key text, value text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null or not private.has_role('admin') then
    raise exception 'Alleen admins kunnen instellingen wijzigen.';
  end if;

  insert into public.site_settings as s (key, value, updated_at)
  values (admin_update_setting.key, admin_update_setting.value, now())
  on conflict on constraint site_settings_pkey
  do update set value = excluded.value, updated_at = now();

  insert into public.moderation_actions (moderator_id, action, target_table, target_id, reason)
  values (uid, 'edit', 'site_settings', admin_update_setting.key, left(admin_update_setting.value, 200));
end;
$$;

revoke all on function public.admin_get_settings(text) from public, anon;
grant execute on function public.admin_get_settings(text) to authenticated;
revoke all on function public.admin_update_setting(text, text) from public, anon;
grant execute on function public.admin_update_setting(text, text) to authenticated;
