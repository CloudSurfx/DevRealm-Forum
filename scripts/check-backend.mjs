// Controleert of de Supabase-backend van het forum klaarstaat.
// Gebruik:  npm run check:backend
//
// Leest VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY uit .env.local of .env
// en test met dezelfde publieke sleutel als de website.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const env = { ...process.env };
  for (const file of ['.env', '.env.local']) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      let value = match[2];
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      env[match[1]] = value; // .env.local overschrijft .env
    }
  }
  return env;
}

const ok = (msg) => console.log(`  ✅ ${msg}`);
const bad = (msg) => console.log(`  ❌ ${msg}`);
const warn = (msg) => console.log(`  ⚠️  ${msg}`);

const env = loadEnv();
const url = (env.VITE_SUPABASE_URL ?? '').trim();
const key = (env.VITE_SUPABASE_ANON_KEY ?? '').trim();

console.log('\nForum backend-check\n');

if (!url || !key || url.includes('jouw-project') || key.includes('jouw_key')) {
  bad('VITE_SUPABASE_URL en/of VITE_SUPABASE_ANON_KEY ontbreken in .env.');
  console.log('\n  Zet ze in .env (Supabase → Project Settings → API Keys) en draai dit opnieuw.\n');
  process.exit(1);
}
if (key.startsWith('sb_secret_') || /service_role/.test(Buffer.from(key.split('.')[1] ?? '', 'base64').toString())) {
  bad('De sleutel in VITE_SUPABASE_ANON_KEY is een GEHEIME sleutel. Gebruik de publishable/anon key!');
  process.exit(1);
}
ok(`Project: ${url}`);

const supabase = createClient(url, key, { auth: { persistSession: false } });

// 1. Bereikbaarheid + sleutel
const auth = await supabase.auth.getSession().catch((e) => ({ error: e }));
if (auth.error) {
  bad(`Supabase Auth reageert niet: ${auth.error.message ?? auth.error}`);
}

const tables = [
  'profiles', 'user_roles', 'categories', 'topics', 'replies', 'topic_votes', 'reply_likes',
  'news', 'chat_messages', 'chat_reactions', 'gallery_projects', 'project_likes',
  'polls', 'poll_options', 'poll_votes',
];

let missing = 0;
let networkError = false;
for (const table of tables) {
  // Geen HEAD-request: daarbij geeft een ontbrekende tabel geen foutmelding terug.
  const { count, error } = await supabase.from(table).select('*', { count: 'exact' }).range(0, 0);
  if (error) {
    const msg = `${error.message ?? ''} ${error.code ?? ''}`.trim();
    if (/fetch failed|ENOTFOUND|ECONNREFUSED|network/i.test(msg)) {
      networkError = true;
      bad(`${table}: Supabase niet bereikbaar (${msg}). Is het project gepauzeerd of verwijderd?`);
      break;
    }
    if (/invalid api key|unregistered api key|JWT/i.test(msg) || error.code === '401') {
      bad(`De API-sleutel wordt geweigerd: ${msg}`);
      process.exit(1);
    }
    if (error.code === 'PGRST205' || error.code === '42P01' || /does not exist|Could not find the table/i.test(msg)) {
      missing += 1;
      bad(`${table}: tabel ontbreekt`);
    } else {
      bad(`${table}: ${msg || 'onbekende fout'}`);
    }
  } else {
    ok(`${table} (${count ?? 0} rijen)`);
  }
}

if (networkError) {
  console.log('\n  Open https://supabase.com/dashboard en controleer of het project bestaat en actief is.');
  console.log('  Gepauzeerd? Klik "Restore project". Verwijderd? Maak een nieuw project en volg README → "Backend opzetten".\n');
  process.exit(1);
}

// 2. Reparaties uit 0002 aanwezig?
const fixes = await supabase.from('topics').select('category_id').limit(1);
if (fixes.error) {
  warn('Migratie 0002_backend_fixes.sql lijkt nog niet gedraaid (kolom topics.category_id ontbreekt).');
} else if (!missing) {
  ok('Migratie 0002 (reparaties) is actief');
}

const cats = await supabase.from('categories').select('id', { count: 'exact' }).range(0, 0);
if (!cats.error && (cats.count ?? 0) === 0) {
  warn('Er zijn geen categorieën: draai supabase/setup_all.sql opnieuw voor de seed-data.');
}

console.log('');
if (missing) {
  console.log(`  ${missing} tabel(len) ontbreken. Plak supabase/setup_all.sql in de Supabase SQL Editor en klik Run.\n`);
  process.exit(1);
}
console.log('  Backend is klaar. Start de site met: npm run dev\n');
