import type { Release, ReleaseCategoryId } from '../types/forum';

export const RELEASE_CATEGORIES: { id: ReleaseCategoryId; label: string; color: string }[] = [
  { id: 'web', label: 'Website', color: '#60a5fa' },
  { id: 'cms', label: 'CMS', color: '#a88bfa' },
  { id: 'game', label: 'Game', color: '#34d399' },
  { id: 'bot', label: 'Bot', color: '#f472b6' },
  { id: 'tool', label: 'Tool', color: '#e8b353' },
  { id: 'library', label: 'Library', color: '#22d3ee' },
  { id: 'design', label: 'Design', color: '#fb923c' },
  { id: 'overig', label: 'Overig', color: '#94a3b8' },
];

export const RELEASE_LICENSES = ['MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause', 'Unlicense', 'Alle rechten voorbehouden'];

export const MAX_RELEASE_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const RELEASE_FILE_EXTENSIONS = ['zip', 'rar', '7z', 'gz', 'tgz', 'tar', 'jar', 'pdf', 'txt', 'md'];
export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif'];

export function releaseCategoryLabel(id: string): string {
  return RELEASE_CATEGORIES.find((c) => c.id === id)?.label ?? 'Overig';
}

export function releaseCategoryColor(id: string): string {
  return RELEASE_CATEGORIES.find((c) => c.id === id)?.color ?? '#94a3b8';
}

const iso = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString();

/** Voorbeeldreleases voor demo-modus (zonder Supabase). */
export const DEMO_RELEASES: Release[] = [
  {
    id: 'rel-1',
    slug: 'nova-cms',
    title: 'Nova CMS',
    tagline: 'Een lichtgewicht CMS in Next.js met live feed, nieuwsberichten en een beheerpaneel.',
    description:
      'Nova CMS is een klein maar compleet CMS voor community-sites.\n\n**Wat zit erin**\n- Nieuwsberichten met categorieën\n- Live activiteitenfeed\n- Beheerpaneel met rollen\n- Donker en licht thema\n\n| Onderdeel | Techniek |\n| --- | --- |\n| Frontend | Next.js 15 + Tailwind |\n| Database | Supabase (Postgres) |\n| Auth | Supabase Auth |\n\nInstalleren: pak de zip uit, kopieer `.env.example` naar `.env` en draai `npm install && npm run dev`.',
    category: 'cms',
    tags: ['nextjs', 'supabase', 'tailwind'],
    authorName: 'Sander Vermeer',
    authorInitials: 'SV',
    authorColor: '#a88bfa',
    authorRole: 'Beheerder',
    screenshotUrls: [],
    githubUrl: 'https://github.com/voorbeeld/nova-cms',
    demoUrl: 'https://nova-cms.voorbeeld.nl',
    license: 'MIT',
    latestVersion: '1.2.0',
    downloads: 214,
    stars: 31,
    starredByMe: false,
    views: 1480,
    featured: true,
    hidden: false,
    createdAt: '2 dagen geleden',
    createdAtIso: iso(2 * 24 * 60),
    updatedAt: '3 uur geleden',
    versions: [
      { id: 'v-1-3', version: '1.2.0', changelog: '- Nieuw: zoekfunctie in het beheerpaneel\n- Snellere live feed\n- Bugfix: datum in de verkeerde tijdzone', fileName: 'nova-cms-1.2.0.zip', fileSize: 4_820_000, downloads: 96, createdAt: '3 uur geleden', createdAtIso: iso(180) },
      { id: 'v-1-2', version: '1.1.0', changelog: '- Donker thema\n- Rollen: admin en moderator', fileName: 'nova-cms-1.1.0.zip', fileSize: 4_610_000, downloads: 71, createdAt: 'gisteren', createdAtIso: iso(26 * 60) },
      { id: 'v-1-1', version: '1.0.0', changelog: 'Eerste release.', fileName: 'nova-cms-1.0.0.zip', fileSize: 4_300_000, downloads: 47, createdAt: '2 dagen geleden', createdAtIso: iso(2 * 24 * 60) },
    ],
    comments: [
      { id: 'c-1', authorName: 'Lotte de Vries', authorInitials: 'LV', authorColor: '#e8b353', authorRole: 'Moderator', body: 'Draait meteen, top gedaan! De live feed is echt snel.', createdAt: '2 uur geleden' },
      { id: 'c-2', authorName: 'Daan Bakker', authorInitials: 'DB', authorColor: '#34d399', authorRole: 'Lid', body: 'Komt er ook een Docker-versie?', createdAt: '1 uur geleden' },
    ],
  },
  {
    id: 'rel-2',
    slug: 'pixel-bot',
    title: 'PixelBot',
    tagline: 'Discord-bot met levels, muziek en moderatiecommando’s.',
    description: 'PixelBot is een Discord-bot in Node.js.\n\n- `/level` en ranglijsten\n- Muziek uit YouTube en Spotify\n- Moderatie: `/warn`, `/mute`, `/ban`\n\nZet je bot-token in `config.json` en start met `npm start`.',
    category: 'bot',
    tags: ['discord', 'nodejs'],
    authorName: 'Daan Bakker',
    authorInitials: 'DB',
    authorColor: '#34d399',
    authorRole: 'Lid',
    screenshotUrls: [],
    githubUrl: 'https://github.com/voorbeeld/pixelbot',
    license: 'GPL-3.0',
    latestVersion: '2.0.1',
    downloads: 132,
    stars: 18,
    starredByMe: false,
    views: 640,
    featured: false,
    hidden: false,
    createdAt: '5 dagen geleden',
    createdAtIso: iso(5 * 24 * 60),
    updatedAt: 'gisteren',
    versions: [
      { id: 'v-2-2', version: '2.0.1', changelog: '- Muziek hapert niet meer bij lange nummers', externalUrl: 'https://github.com/voorbeeld/pixelbot/releases', downloads: 80, createdAt: 'gisteren', createdAtIso: iso(24 * 60) },
      { id: 'v-2-1', version: '2.0.0', changelog: '- Overgestapt op slash-commando’s', fileName: 'pixelbot-2.0.0.zip', fileSize: 1_200_000, downloads: 52, createdAt: '5 dagen geleden', createdAtIso: iso(5 * 24 * 60) },
    ],
    comments: [],
  },
  {
    id: 'rel-3',
    slug: 'retro-ui-kit',
    title: 'Retro UI Kit',
    tagline: 'Pixel-art knoppen, panelen en iconen voor je game of hotel.',
    description: 'Meer dan 120 pixel-art onderdelen als PNG en Figma-bestand. Vrij te gebruiken met naamsvermelding.',
    category: 'design',
    tags: ['pixelart', 'figma', 'ui'],
    authorName: 'Nora Visser',
    authorInitials: 'NV',
    authorColor: '#60a5fa',
    authorRole: 'Lid',
    screenshotUrls: [],
    license: 'Alle rechten voorbehouden',
    latestVersion: '1.0',
    downloads: 88,
    stars: 24,
    starredByMe: false,
    views: 512,
    featured: false,
    hidden: false,
    createdAt: '1 week geleden',
    createdAtIso: iso(8 * 24 * 60),
    updatedAt: '1 week geleden',
    versions: [
      { id: 'v-3-1', version: '1.0', changelog: 'Eerste versie met 120 onderdelen.', fileName: 'retro-ui-kit.zip', fileSize: 9_400_000, downloads: 88, createdAt: '1 week geleden', createdAtIso: iso(8 * 24 * 60) },
    ],
    comments: [],
  },
  {
    id: 'rel-4',
    slug: 'mini-orm',
    title: 'MiniORM',
    tagline: 'Een kleine TypeScript ORM voor SQLite en Postgres, zonder afhankelijkheden.',
    description: 'MiniORM maakt typesafe queries met een paar regels code.\n\n```ts\nconst users = await db.table("users").where("age", ">", 18).all();\n```\n\nWerkt met SQLite en Postgres.',
    category: 'library',
    tags: ['typescript', 'sql'],
    authorName: 'Lotte de Vries',
    authorInitials: 'LV',
    authorColor: '#e8b353',
    authorRole: 'Moderator',
    screenshotUrls: [],
    githubUrl: 'https://github.com/voorbeeld/miniorm',
    license: 'MIT',
    latestVersion: '0.4.0',
    downloads: 57,
    stars: 12,
    starredByMe: false,
    views: 301,
    featured: false,
    hidden: false,
    createdAt: '3 dagen geleden',
    createdAtIso: iso(3 * 24 * 60),
    updatedAt: '3 dagen geleden',
    versions: [
      { id: 'v-4-1', version: '0.4.0', changelog: '- Postgres-ondersteuning\n- Transacties', externalUrl: 'https://github.com/voorbeeld/miniorm/releases', downloads: 57, createdAt: '3 dagen geleden', createdAtIso: iso(3 * 24 * 60) },
    ],
    comments: [],
  },
];
