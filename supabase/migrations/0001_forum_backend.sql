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
