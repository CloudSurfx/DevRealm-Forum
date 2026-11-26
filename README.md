<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Forum — community, discussies, nieuws & live chat

React/Vite-frontend met een Supabase-backend voor authenticatie, data en realtime chat.

## Lokaal starten

**Vereisten:** Node.js 20+ en een Supabase-project.

1. Installeer dependencies: `npm install`
2. Kopieer `.env.example` naar `.env` en vul je eigen Supabase-URL en publishable/anon key in.
   Gebruik nooit een `service_role`/secret key in de browser.
3. Zet de backend op (zie hieronder) en controleer met `npm run check:backend`.
4. Start de app: `npm run dev` (poort 3000).

In VS Code is Git Bash ingesteld als standaardshell. In een UCRT64/Git-Bash-terminal
moet je eerst naar de projectmap:

```bash
cd /c/Users/duime/OneDrive/Desktop/forum
npm run dev
```

Zonder Supabase-configuratie draait de app in demo-modus met de statische data uit
`src/data/forumData.ts`; er wordt dan niets opgeslagen.

## Backend opzetten (nieuw of opnieuw)

1. Ga naar [supabase.com/dashboard](https://supabase.com/dashboard).
   - Project **gepauzeerd**? Klik *Restore project* en ga door naar stap 3.
   - Project **weg**? Klik *New project*, kies een regio dichtbij (bv. Frankfurt) en wacht tot hij klaar is.
2. Kopieer onder **Project Settings → API Keys** de *Project URL* en de *publishable key*
   naar `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY` in `.env`.
3. Open **SQL Editor → New query**, plak de hele inhoud van
   [`supabase/setup_all.sql`](supabase/setup_all.sql) en klik **Run**.
   Dit is 0001 t/m 0006 samen; je mag het gerust vaker draaien, bestaande data blijft staan.
4. Zet onder **Authentication → Sign In / Providers → Email** *Confirm email* uit als je
   zonder bevestigingsmail wilt kunnen inloggen tijdens het testen.
5. Draai `npm run check:backend`. Alles groen? Start met `npm run dev`.
6. Registreer jezelf op de site en maak jezelf admin (zie hieronder).

## Eerste beheerder

Na registratie krijgt een gebruiker automatisch de rol `member`. Om jezelf admin te maken:

```sql
update public.user_roles
set role = 'admin'
where user_id = (select id from auth.users where email = 'jij@voorbeeld.nl');
```

Een admin krijgt in de zijbalk een **Beheer**-knop. Het dashboard is modulair opgebouwd:
module-registratie staat in `src/components/admin/modules.ts`.

## Beheerdashboard

Heb je de database al eerder opgezet? Draai dan eenmalig
[`supabase/migrations/0004_beheer_uitbreiding.sql`](supabase/migrations/0004_beheer_uitbreiding.sql)
in de SQL Editor (in `setup_all.sql` zit hij al). Zonder 0004 werkt het dashboard ook,
maar dan ontbreken schorsingen, de activiteitsgrafiek en reputatie/badges aanpassen.

| Module | Wie | Wat je kunt doen |
| --- | --- | --- |
| Overzicht | moderator, admin | Cijfers met trend, activiteit van 14 dagen, nieuwe leden, top-reputatie, laatste moderatie |
| Leden | moderator, admin | Zoeken, filteren op rol, sorteren; per lid: statistieken, rol wijzigen*, reputatie en badges*, schorsen |
| Schorsingen | moderator, admin | Actieve en eerdere schorsingen, opheffen, nieuw lid schorsen (1 uur t/m permanent) |
| Live chat | moderator, admin | Chat live meelezen, zoeken, per lid filteren, verwijderen met reden, direct schorsen |
| Topics | moderator, admin | Zoeken en filteren, vastmaken, sluiten, opgelost, verplaatsen, reacties bekijken; verwijderen* |
| Nieuws | moderator, admin | Berichten schrijven en bewerken (concept of direct online), publiceren; verwijderen* |
| Peilingen | admin | Peiling maken (2–6 antwoorden, einddatum), openen, sluiten, uitslag, verwijderen |
| Galerij | moderator, admin | Projecten bekijken met likes; verwijderen* |
| Moderatielog | moderator, admin | Alles wat moderators doen, filteren op actie/moderator/periode, exporteren als CSV |
| Modules | admin | Overzicht en uitleg om zelf modules toe te voegen |

\* alleen admins. De database controleert alle rechten zelf; het dashboard verbergt alleen
knoppen die je toch niet mag gebruiken.

**Schorsen**: een geschorst lid kan nog meelezen, maar geen topics, reacties, chatberichten
of projecten plaatsen; het ziet de reden en de einddatum als het het probeert. Moderators
schorsen leden, admins ook moderators. Admins kun je niet schorsen.

## Wat de backend doet

- **Auth**: Supabase Auth (e-mail + wachtwoord), sessieherstel, profiel en rol via triggers.
- **Discussies**: topics, replies, stemmen, likes, beste antwoord en weergaven.
- **Nieuws**: publicatiebeheer via het dashboard.
- **Live chat**: Realtime `postgres_changes` op `chat_messages`, presence voor online/typen.
- **Galerij & peiling**: projecten, likes en stemmen (één stem per gebruiker).
- **Moderatie**: rollen, pin/lock/verwijderen met reden en een auditlog.
- **Server-side regels**: auteursnaam en rol worden door de database ingevuld, alleen de
  topic-starter kiest het beste antwoord, `posts_count`/`last_activity` via triggers,
  reacties op vergrendelde topics geblokkeerd en zelf-toegekende reputatie begrensd.
- **Beveiliging**: RLS op alle tabellen, expliciete grants, rolcontrole via
  `private.has_role()` en server-side reputatie via `public.award_reputation()`.

## Projectstructuur

| Pad | Doel |
| --- | --- |
| `src/lib/supabase.ts` | Supabase-client (publishable key) |
| `src/lib/forumApi.ts` | Alle queries, mutaties en realtime-abonnementen |
| `src/components/AdminDashboard.tsx` | Beheerdashboard met toegangscontrole |
| `src/components/admin/modules.ts` | Uitbreidbare module-registry |
| `src/components/admin/ui.tsx` | Gedeelde dashboard-onderdelen (knoppen, tabellen, vensters, grafieken, meldingen) |
| `src/components/admin/client.ts` | Getypeerde client, moderatielog en hulpfuncties voor leden en schorsingen |
| `supabase/migrations/0001_forum_backend.sql` | Schema, RLS, realtime en seed-data |
| `supabase/migrations/0002_backend_fixes.sql` | Reparaties: peiling, beste antwoord, rollen, beheer, beveiliging |
| `supabase/migrations/0003_menselijke_teksten.sql` | Voorbeeldteksten in gewone taal (raakt eigen content niet aan) |
| `supabase/migrations/0004_beheer_uitbreiding.sql` | Schorsingen, peilingbeheer, reputatie/badges en activiteit voor het dashboard |
| `supabase/migrations/0006_instellingen.sql` | Tabel en RPC's voor de module Instellingen in het dashboard |
| `supabase/setup_all.sql` | 0001 t/m 0006 in één bestand voor de SQL Editor |
| `scripts/check-backend.mjs` | `npm run check:backend`: test verbinding, sleutel en tabellen |

## Overig

- `npm run build` maakt een productiebuild; `npm run preview` serveert die lokaal.
- `npm run lint` draait TypeScript-controle.
- `docker compose up --build` serveert de build via nginx op poort 8080.
- `GEMINI_API_KEY` is server-only en wordt door de frontend niet gebruikt.
