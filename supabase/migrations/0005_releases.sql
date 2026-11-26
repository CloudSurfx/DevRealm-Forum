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
