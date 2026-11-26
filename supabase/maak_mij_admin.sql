-- ===========================================================================
-- Maak mijn account beheerder (alle admin-rechten)
--
-- 1. Registreer eerst op de site (en bevestig je e-mail als dat aan staat).
-- 2. Vul hieronder op de regel met ← jouw e-mailadres in.
-- 3. Supabase → SQL Editor → New query → plak dit → Run.
--
-- Wat het doet:
--   * zet je rol in user_roles op 'admin' (ook als je nog geen rol had)
--     → toegang tot het Beheer-dashboard, rollen wijzigen, topics vastmaken,
--       vergrendelen en verwijderen, nieuws beheren, chat modereren, auditlog
--   * werkt het rollabel bij op berichten die je al had geplaatst ("Beheerder")
--   * geeft je profiel de badge 'Oprichter'
-- Veilig om vaker te draaien.
-- ===========================================================================
do $$
declare
  v_email text := 'jij@voorbeeld.nl';   -- ← jouw e-mailadres
  v_id    uuid;
begin
  select id into v_id from auth.users where lower(email) = lower(btrim(v_email));
  if v_id is null then
    raise exception 'Geen account gevonden met e-mailadres "%". Registreer eerst op de site en controleer het adres.', v_email;
  end if;

  insert into public.user_roles (user_id, role)
  values (v_id, 'admin')
  on conflict (user_id) do update set role = 'admin';

  update public.topics        set author_role = 'Beheerder' where author_id = v_id;
  update public.replies       set author_role = 'Beheerder' where author_id = v_id;
  update public.chat_messages set author_role = 'Beheerder' where user_id   = v_id;

  update public.profiles
  set badges = array_append(badges, 'Oprichter')
  where id = v_id and not ('Oprichter' = any(badges));

  raise notice 'Klaar: % is nu beheerder.', v_email;
end $$;

-- Controle: dit zou je account met rol 'admin' moeten tonen.
select u.email, p.display_name, r.role, p.badges
from auth.users u
join public.user_roles r on r.user_id = u.id
left join public.profiles p on p.id = u.id
where r.role = 'admin';
