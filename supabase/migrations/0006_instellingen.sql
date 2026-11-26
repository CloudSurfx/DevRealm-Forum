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
