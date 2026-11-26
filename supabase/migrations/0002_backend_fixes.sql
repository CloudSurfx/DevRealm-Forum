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
