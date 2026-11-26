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
