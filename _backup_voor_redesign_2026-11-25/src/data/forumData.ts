import {
  Category,
  ChatMessage,
  CommunityPoll,
  GalleryProject,
  Member,
  NewsItem,
  ThemeAccentId,
  Topic,
} from '../types/forum';

export interface ThemePresetPalette {
  id: ThemeAccentId;
  label: string;
  description: string;
  hex: string;
  hoverHex: string;
  rgb: string;
  darkCanvas: string;
  darkNav: string;
  darkSurface: string;
  darkElevated: string;
}

export const THEME_ACCENT_PRESETS: ThemePresetPalette[] = [
  {
    id: 'violet',
    label: 'Obsidian Violet',
    description: 'De originele paarse gloed & diepe obsidian-kaarten',
    hex: '#7c5cf0',
    hoverHex: '#8f72f3',
    rgb: '124, 92, 240',
    darkCanvas: '#0b0a12',
    darkNav: '#100e18',
    darkSurface: '#13111c',
    darkElevated: '#1a1726',
  },
  {
    id: 'gold',
    label: 'Warm Goud',
    description: 'Warme amber- en goudtinten met espresso-donkere kaarten',
    hex: '#e8b353',
    hoverHex: '#f2c166',
    rgb: '232, 179, 83',
    darkCanvas: '#100d09',
    darkNav: '#16120c',
    darkSurface: '#1a150f',
    darkElevated: '#231c14',
  },
  {
    id: 'emerald',
    label: 'Cyber Emerald',
    description: 'Frisse groene developer-gloed op donker bos-obsidian',
    hex: '#34d399',
    hoverHex: '#4ee0a8',
    rgb: '52, 211, 153',
    darkCanvas: '#08100e',
    darkNav: '#0c1613',
    darkSurface: '#0f1c18',
    darkElevated: '#152620',
  },
  {
    id: 'sky',
    label: 'Neon Sky',
    description: 'Heldere oceaan- en React-blauwe gloed op nachtblauw',
    hex: '#60a5fa',
    hoverHex: '#7bb5fc',
    rgb: '96, 165, 250',
    darkCanvas: '#080d15',
    darkNav: '#0c131e',
    darkSurface: '#101826',
    darkElevated: '#162133',
  },
  {
    id: 'rose',
    label: 'Sunset Rose',
    description: 'Warme magenta-roze accenten op diep fluweel-donker',
    hex: '#f472b6',
    hoverHex: '#f78bc3',
    rgb: '244, 114, 182',
    darkCanvas: '#110910',
    darkNav: '#170d15',
    darkSurface: '#1c1019',
    darkElevated: '#251521',
  },
];

export function buildCustomThemePalette(customHex: string): ThemePresetPalette {
  const clean = /^#[0-9a-fA-F]{6}$/.test(customHex.trim()) ? customHex.trim() : '#a88bfa';
  const r = parseInt(clean.slice(1, 3), 16);
  const g = parseInt(clean.slice(3, 5), 16);
  const b = parseInt(clean.slice(5, 7), 16);

  const lighten = (channel: number, amount: number) =>
    Math.min(255, Math.round(channel + (255 - channel) * amount));
  const mixDark = (base: number, channel: number, weight: number) =>
    Math.min(255, Math.round(base * (1 - weight) + channel * weight));
  const toHex = (rv: number, gv: number, bv: number) =>
    `#${[rv, gv, bv].map((v) => v.toString(16).padStart(2, '0')).join('')}`;

  return {
    id: 'custom',
    label: 'Eigen Kleur',
    description: `Aangepaste themakleur (${clean.toUpperCase()})`,
    hex: clean,
    hoverHex: toHex(lighten(r, 0.16), lighten(g, 0.16), lighten(b, 0.16)),
    rgb: `${r}, ${g}, ${b}`,
    darkCanvas: toHex(mixDark(10, r, 0.05), mixDark(10, g, 0.05), mixDark(15, b, 0.05)),
    darkNav: toHex(mixDark(14, r, 0.07), mixDark(14, g, 0.07), mixDark(20, b, 0.07)),
    darkSurface: toHex(mixDark(18, r, 0.09), mixDark(17, g, 0.09), mixDark(25, b, 0.09)),
    darkElevated: toHex(mixDark(24, r, 0.12), mixDark(23, g, 0.12), mixDark(33, b, 0.12)),
  };
}

export const CATEGORIES = [
  { id: 'all', label: 'Alles' },
  { id: 'algemeen', label: 'Algemeen' },
  { id: 'development', label: 'Development' },
  { id: 'hulp', label: 'Q&A / Hulp' },
  { id: 'tutorials', label: 'Tutorials' },
  { id: 'requests', label: 'Requests' },
  { id: 'react-vue', label: 'React & Vue' },
  { id: 'showcase', label: 'Showcase' },
] as const;

/** Korte uitleg per categorie (voor het topicformulier). */
export const CATEGORY_HINTS: Record<string, string> = {
  algemeen: 'Van alles en nog wat',
  development: 'Laat zien waar je aan werkt',
  hulp: 'Stel een programmeervraag',
  tutorials: 'Leg iets uit aan anderen',
  requests: 'Zoek hulp, een script of teamleden',
  'react-vue': 'Framework-vragen en tips',
  showcase: 'Laat een afgerond project zien',
};

/** Labels voor topics, met de categorie waar ze standaard bij horen. */
export const TOPIC_PREFIXES = [
  { id: 'HULP', label: 'Hulp', className: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30' },
  { id: 'DEVELOPMENT', label: 'Development', className: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30' },
  { id: 'TUTORIAL', label: 'Tutorial', className: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30' },
  { id: 'REQUEST', label: 'Request', className: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/30' },
  { id: 'RELEASE', label: 'Release', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  { id: 'SHOWCASE', label: 'Showcase', className: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30' },
  { id: 'DISCUSSIE', label: 'Discussie', className: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30' },
] as const;

/**
 * Klassieke board-index: dezelfde boards als CATEGORIES, gegroepeerd voor ForumIndex.tsx.
 * topicCount/postCount/lastPost staan hier op 0/undefined — ForumIndex berekent de echte
 * aantallen zelf vanuit de live topics en overschrijft deze placeholders.
 */
export const FORUM_CATEGORIES: Category[] = [
  {
    id: 'discussie',
    name: 'Discussie & Showcase',
    forums: [
      { id: 'algemeen', name: 'Algemeen', description: CATEGORY_HINTS.algemeen, topicCount: 0, postCount: 0 },
      { id: 'react-vue', name: 'React & Vue', description: CATEGORY_HINTS['react-vue'], topicCount: 0, postCount: 0 },
      { id: 'showcase', name: 'Showcase', description: CATEGORY_HINTS.showcase, topicCount: 0, postCount: 0 },
    ],
  },
  {
    id: 'development',
    name: 'Development & Hulp',
    forums: [
      { id: 'development', name: 'Development', description: CATEGORY_HINTS.development, topicCount: 0, postCount: 0 },
      { id: 'hulp', name: 'Q&A / Hulp', description: CATEGORY_HINTS.hulp, topicCount: 0, postCount: 0 },
      { id: 'tutorials', name: 'Tutorials', description: CATEGORY_HINTS.tutorials, topicCount: 0, postCount: 0 },
      { id: 'requests', name: 'Requests', description: CATEGORY_HINTS.requests, topicCount: 0, postCount: 0 },
    ],
  },
];

export const DEFAULT_PREFIX_FOR_CATEGORY: Record<string, string | undefined> = {
  development: 'DEVELOPMENT',
  hulp: 'HULP',
  tutorials: 'TUTORIAL',
  requests: 'REQUEST',
  showcase: 'SHOWCASE',
};

/** Eén rang in de klassieke forum-rangladder (zie UserRank.tsx). */
export interface UserRankDefinition {
  title: string;
  minPosts: number;
  color: string;
}

/**
 * Rangladder op basis van aantal posts, oplopend. getUserRank() geeft de
 * hoogste rang terug waarvoor de gebruiker genoeg posts heeft.
 */
export const USER_RANKS: UserRankDefinition[] = [
  { title: 'Nieuwkomer', minPosts: 0, color: '#8d87a4' },
  { title: 'Lid', minPosts: 10, color: '#6ba5e0' },
  { title: 'Actief Lid', minPosts: 50, color: '#5ec9a0' },
  { title: 'Senior Lid', minPosts: 150, color: '#e0b25e' },
  { title: 'Veteraan', minPosts: 350, color: '#e08a5e' },
  { title: 'Expert', minPosts: 750, color: '#d06bd8' },
  { title: 'Legende', minPosts: 1500, color: '#a88bfa' },
];

/** Geeft de hoogste rang terug die bij het gegeven aantal posts hoort. */
export function getUserRank(postsCount: number): UserRankDefinition {
  let current = USER_RANKS[0];
  for (const rank of USER_RANKS) {
    if (postsCount >= rank.minPosts) {
      current = rank;
    }
  }
  return current;
}

/** @deprecated Alleen nog als fallback wanneer Supabase niet geconfigureerd is. */
export const INITIAL_ONLINE_MEMBERS: Member[] = [
  {
    id: 'm-1',
    name: 'Sander Vermeer',
    handle: '@sander_v',
    role: 'Beheerder',
    initials: 'SV',
    avatarColor: '#a88bfa',
    themeAccent: 'violet',
    githubHandle: 'sandervermeer',
    discordHandle: 'sander.dev',
    statusText: 'React + Vue bridge aan het testen',
    isOnline: true,
    lastSeen: 'Nu actief · 1 min geleden',
    joinedAt: 'Jan 2025',
    postsCount: 342,
    reputation: 1480,
    badges: ['Oprichter', 'Code Mentor', 'Project Pionier', 'Lid sinds 2025'],
  },
  {
    id: 'm-2',
    name: 'Lotte de Vries',
    handle: '@lottedv',
    role: 'Moderator',
    initials: 'LV',
    avatarColor: '#e8b353',
    themeAccent: 'gold',
    githubHandle: 'lotte-devries',
    discordHandle: 'lottedv#4021',
    statusText: 'Bekijkt Project-galerij',
    isOnline: true,
    lastSeen: 'Nu actief · 2 min geleden',
    joinedAt: 'Mrt 2025',
    postsCount: 218,
    reputation: 1120,
    badges: ['Top Helper', 'Beste Antwoord', 'Moderator', 'Lid sinds 2025'],
  },
  {
    id: 'm-3',
    name: 'Daan Bakker',
    handle: '@daanb',
    role: 'Lid',
    initials: 'DB',
    avatarColor: '#34d399',
    themeAccent: 'emerald',
    githubHandle: 'daanbakker-ui',
    discordHandle: 'daan.ui',
    statusText: 'Actief in Live chat',
    isOnline: true,
    lastSeen: 'Nu actief · zojuist',
    joinedAt: 'Aug 2025',
    postsCount: 94,
    reputation: 640,
    badges: ['Project Pionier', 'Top Helper', 'UI Bouwer', 'Lid sinds 2025'],
  },
  {
    id: 'm-4',
    name: 'Nora Visser',
    handle: '@norav',
    role: 'Supporter',
    initials: 'NV',
    avatarColor: '#60a5fa',
    themeAccent: 'sky',
    githubHandle: 'noravisser',
    discordHandle: 'nora_v',
    statusText: 'Test nieuwe code-snippets',
    isOnline: true,
    lastSeen: 'Nu actief · 4 min geleden',
    joinedAt: 'Okt 2025',
    postsCount: 67,
    reputation: 535,
    badges: ['Top Helper', 'Project Pionier', 'Supporter', 'Lid sinds 2025'],
  },
  {
    id: 'm-5',
    name: 'Mees Jansen',
    handle: '@meesj',
    role: 'Lid',
    initials: 'MJ',
    avatarColor: '#f472b6',
    themeAccent: 'rose',
    githubHandle: 'meesjansen',
    statusText: 'Beantwoordt vragen in Hulp',
    isOnline: true,
    lastSeen: 'Laatst gezien om 18:42 (6 min geleden)',
    joinedAt: 'Feb 2026',
    postsCount: 41,
    reputation: 310,
    badges: ['Actieve Helper', 'Lid sinds 2026', 'Snelle Starter'],
  },
];

export const INITIAL_TOPICS: Topic[] = [
  {
    id: 't-1',
    title: 'Welkom! Lees dit even als je nieuw bent',
    excerpt:
      'Hoe het forum werkt, waar je wat vindt en een paar huisregels. Kort, beloofd.',
    body: `Hoi allemaal!\n\nLeuk dat je er bent. Een paar dingen om te weten:\n• Vragen stellen mag altijd, ook als je denkt dat het een domme vraag is.\n• Help je iemand, dan krijg je punten en soms een badge. Leuk, maar geen wedstrijd.\n• In je posts kun je code, **tabellen** en plaatjes zetten.\n\nStel je gerust even voor in de chat onderaan. Tot zo!\n\n— Sander`,
    category: 'algemeen',
    categoryLabel: 'Algemeen',
    authorName: 'Sander Vermeer',
    authorInitials: 'SV',
    authorColor: '#a88bfa',
    authorRole: 'Beheerder',
    createdAt: 'Vandaag, 09:15',
    lastActivity: '4 min geleden',
    votes: 48,
    views: 412,
    pinned: true,
    replies: [
      {
        id: 'r-101',
        authorName: 'Lotte de Vries',
        authorId: 'm-2',
        authorInitials: 'LV',
        authorColor: '#e8b353',
        authorRole: 'Moderator',
        content: 'Die paarse gloed op de kaarten en de vaste linker navbar op /forum werken echt heel fijn op desktop.',
        createdAt: '18 min geleden',
        likes: 9,
      },
      {
        id: 'r-102',
        authorName: 'Daan Bakker',
        authorId: 'm-3',
        authorInitials: 'DB',
        authorColor: '#34d399',
        authorRole: 'Lid',
        content: 'Eindelijk geen laadfout meer in de chat! Dat de chat onderaan in het midden staat maakt het veel levendiger.',
        createdAt: '4 min geleden',
        likes: 5,
      },
    ],
  },
  {
    id: 't-2',
    title: 'React + Vue combineren in één frontend: hoe houd je state synchroon?',
    excerpt:
      'Ik draai een hybride setup met React voor de layout-shell en Vue voor interactieve widgets. Hier is een vergelijkingstabel van 3 opties.',
    body: `In ons huidige forumproject combineren we **React** en **Vue** naast elkaar. Zodra een gebruiker inlogt of van thema wisselt wil je dat beide frameworks dat direct oppikken.\n\nIk heb de drie populairste aanpakken voor jullie naast elkaar gezet:\n\n| Aanpak | Bundlegrootte | React + Vue support | Reactiviteit |\n| --- | --- | --- | --- |\n| \`nanostores\` | ~0.9 KB | Officieel (@nanostores/react & vue) | Direct atomair |\n| Custom DOM Events | 0 KB | Handmatige listeners | Handmatig syncen |\n| BroadcastChannel | 0 KB | Cross-tab + cross-framework | Event-driven |\n\nHieronder hoe ik het nu met \`nanostores\` heb opgezet:`,
    codeSnippet: {
      language: 'ts',
      filename: 'src/stores/forumStore.ts',
      code: `import { atom } from 'nanostores';

export const $onlineCount = atom<number>(12);
export const $themeMode = atom<'dark' | 'light'>('dark');

export function incrementOnline() {
  $onlineCount.set($onlineCount.get() + 1);
}`,
    },
    category: 'react-vue',
    categoryLabel: 'React & Vue',
    authorName: 'Nora Visser',
    authorInitials: 'NV',
    authorColor: '#60a5fa',
    authorRole: 'Supporter',
    createdAt: 'Vandaag, 11:40',
    lastActivity: '11 min geleden',
    votes: 31,
    views: 265,
    replies: [
      {
        id: 'r-201',
        authorId: 'm-1',
        authorName: 'Sander Vermeer',
        authorInitials: 'SV',
        authorColor: '#a88bfa',
        authorRole: 'Beheerder',
        isBestAnswer: true,
        content:
          'Nanostores is hier echt ideaal voor! Je gebruikt dezelfde store direct in zowel je React-componenten als je Vue-widgets:',
        codeSnippet: {
          language: 'vue',
          filename: 'OnlineCounter.vue',
          code: `<script setup lang="ts">
import { useStore } from '@nanostores/vue';
import { $onlineCount } from '../stores/forumStore';

const online = useStore($onlineCount);
</script>

<template>
  <span>{{ online }} online</span>
</template>`,
        },
        createdAt: '11 min geleden',
        likes: 12,
      },
    ],
  },
  {
    id: 't-3',
    title: 'Showcase: Mijn donkere forum-thema in Tailwind v4 met subtiele gloed',
    excerpt:
      'Na flink tweaken aan de contrastwaarden en kaartdiepte heb ik mijn nieuwe UI klaar. Benieuwd naar jullie feedback op de typografie en leesbaarheid.',
    body: `Ik wilde af van drukke randen en felle neonkleuren en juist kiezen voor een rustig donker-violet canvas (\`#0b0a12\`) met warme gouden accenten voor de belangrijkste acties.\n\nDe gloed op de "Word lid!"-kaart werkt met één simpele CSS-utility:`,
    codeSnippet: {
      language: 'css',
      filename: 'src/index.css',
      code: `.forum-card-glow {
  background-image: radial-gradient(
    circle at 86% 88%,
    rgba(139, 92, 246, 0.24) 0%,
    rgba(139, 92, 246, 0.08) 38%,
    transparent 70%
  );
}`,
    },
    category: 'showcase',
    categoryLabel: 'Showcase',
    authorName: 'Daan Bakker',
    authorInitials: 'DB',
    authorColor: '#34d399',
    authorRole: 'Lid',
    createdAt: 'Gisteren, 20:10',
    lastActivity: '34 min geleden',
    votes: 27,
    views: 198,
    replies: [
      {
        id: 'r-301',
        authorId: 'm-5',
        authorName: 'Mees Jansen',
        authorInitials: 'MJ',
        authorColor: '#f472b6',
        authorRole: 'Lid',
        content: 'Super strak! Vooral die gouden Aanmelden-knop trekt direct de juiste aandacht zonder schreeuwerig te worden.',
        createdAt: '34 min geleden',
        likes: 4,
      },
    ],
  },
  {
    id: 't-4',
    title: 'Websocket reconnect bij mobiel internet — beste retry-strategie?',
    excerpt:
      'Als gebruikers op 4G wisselen naar Wi-Fi valt de live chat soms 5 seconden stil zonder melding. Hoe vangen jullie dat netjes op in de UI?',
    body: `Bij onze live chat valt het op dat mobiele browsers WebSockets pauzeren zodra het scherm kort vergrendeld wordt.\n\nWelke backoff-tijden gebruiken jullie voordat je een herverbindingsmelding toont?`,
    category: 'hulp',
    categoryLabel: 'Hulp & Vragen',
    authorName: 'Mees Jansen',
    authorInitials: 'MJ',
    authorColor: '#f472b6',
    authorRole: 'Lid',
    createdAt: 'Gisteren, 16:22',
    lastActivity: '1 uur geleden',
    votes: 19,
    views: 154,
    solved: true,
    replies: [
      {
        id: 'r-401',
        authorId: 'm-2',
        authorName: 'Lotte de Vries',
        authorInitials: 'LV',
        authorColor: '#e8b353',
        authorRole: 'Moderator',
        isBestAnswer: true,
        content:
          'Luister op `visibilitychange` en trigger direct een heartbeat-check met exponential backoff:',
        codeSnippet: {
          language: 'ts',
          filename: 'reconnect.ts',
          code: `const delay = Math.min(10000, 500 * Math.pow(2, attempt));
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') pingSocket();
});`,
        },
        createdAt: '1 uur geleden',
        likes: 8,
      },
    ],
  },
  {
    id: 't-5',
    title: 'Vrijdagmiddag Showcase: Waar bouw jij dit weekend aan?',
    excerpt:
      'Deel een screenshot, Git-repo of live preview in de project-galerij waar je deze week mee bezig bent. Klein of groot, alles is welkom!',
    body: `Het is bijna weekend! Tijd om te delen waar je aan knutselt.\n\nJe kunt vanaf vandaag ook bestanden en afbeeldingen direct uploaden bij je topic of je demo in de Project-galerij plaatsen.`,
    category: 'algemeen',
    categoryLabel: 'Algemeen',
    authorName: 'Lotte de Vries',
    authorInitials: 'LV',
    authorColor: '#e8b353',
    authorRole: 'Moderator',
    createdAt: '2 dagen geleden',
    lastActivity: '2 uur geleden',
    votes: 42,
    views: 389,
    replies: [
      {
        id: 'r-501',
        authorId: 'm-4',
        authorName: 'Nora Visser',
        authorInitials: 'NV',
        authorColor: '#60a5fa',
        authorRole: 'Supporter',
        content: 'Ik bouw een kleine CLI-tool om Vite-projecten sneller te deployen naar onze VPS.',
        createdAt: '2 uur geleden',
        likes: 6,
      },
    ],
  },
];

export const INITIAL_GALLERY_PROJECTS: GalleryProject[] = [
  {
    id: 'gp-bridge',
    title: 'React ↔ Vue State Bridge',
    description:
      'Synchroniseer teller- en gebruikersstatus realtime tussen een React-shell en een losse Vue 3-widget.',
    stack: 'React + Vue 3',
    authorName: 'Nora Visser',
    authorInitials: 'NV',
    authorColor: '#60a5fa',
    createdAt: 'Vandaag',
    likes: 24,
    previewPreset: 'state-bridge',
    codeSnippet: {
      language: 'tsx',
      filename: 'StateBridge.tsx',
      code: `import { useStore } from '@nanostores/react';
import { $bridgeCount, incrementBridge } from './store';

export function ReactShell() {
  const count = useStore($bridgeCount);
  return (
    <button onClick={incrementBridge}>
      React & Vue gesynchroniseerd: {count}
    </button>
  );
}`,
    },
  },
  {
    id: 'gp-theme',
    title: 'Obsidian Violet Glow Card',
    description:
      'Interactieve CTA-kaart met de kenmerkende paarse hoekgloed en omschakelbare gouden accentkleur.',
    stack: 'Tailwind v4 · CSS',
    authorName: 'Daan Bakker',
    authorInitials: 'DB',
    authorColor: '#34d399',
    createdAt: 'Gisteren',
    likes: 19,
    previewPreset: 'theme-card',
    codeSnippet: {
      language: 'css',
      filename: 'glow-card.css',
      code: `.glow-card {
  background-color: #13111c;
  background-image: radial-gradient(
    circle at 85% 85%,
    rgba(168, 139, 250, 0.22),
    transparent 62%
  );
}`,
    },
  },
  {
    id: 'gp-pulse',
    title: 'Live Chat Heartbeat Monitor',
    description:
      'Simuleert netwerkwissels tussen 4G en Wi-Fi en houdt het aantal actieve meelezers nauwkeurig bij.',
    stack: 'TypeScript · WS',
    authorName: 'Sander Vermeer',
    authorInitials: 'SV',
    authorColor: '#a88bfa',
    createdAt: '2 dagen geleden',
    likes: 31,
    previewPreset: 'chat-pulse',
    codeSnippet: {
      language: 'ts',
      filename: 'heartbeat.ts',
      code: `export function watchConnection(onStatus: (ok: boolean) => void) {
  window.addEventListener('online', () => onStatus(true));
  window.addEventListener('offline', () => onStatus(false));
}`,
    },
  },
];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'c-1',
    authorName: 'Sander Vermeer',
    authorInitials: 'SV',
    authorColor: '#a88bfa',
    authorRole: 'Beheerder',
    text: 'Goeiemorgen allemaal ☕ Het forum staat nu op /forum, laat maar weten als er iets raar doet.',
    timestamp: '18:38',
    reactions: [{ emoji: '🔥', count: 4 }],
  },
  {
    id: 'c-2',
    authorName: 'Lotte de Vries',
    authorInitials: 'LV',
    authorColor: '#e8b353',
    authorRole: 'Moderator',
    text: 'Ziet er goed uit! Fijn dat je nu ook punten krijgt als je iemand helpt.',
    timestamp: '18:41',
    reactions: [{ emoji: '💜', count: 3 }],
  },
  {
    id: 'c-3',
    authorName: 'Daan Bakker',
    authorInitials: 'DB',
    authorColor: '#34d399',
    text: 'Die tabel in het topic van Nora leest echt een stuk makkelijker trouwens.',
    timestamp: '18:44',
  },
  {
    id: 'c-4',
    authorName: 'Nora Visser',
    authorInitials: 'NV',
    authorColor: '#60a5fa',
    authorRole: 'Supporter',
    text: 'Haha ja, @nanostores werkt prima. Net mijn eerste beste antwoord gekregen 😄',
    timestamp: '18:46',
    reactions: [{ emoji: '👍', count: 2 }],
  },
];

export const INITIAL_NEWS: NewsItem[] = [
  {
    id: 'n-1',
    title: 'Het forum heeft een eigen plek gekregen',
    summary:
      'Alles staat nu onder /forum. Ook nieuw: punten als je anderen helpt, en je kunt tabellen en plaatjes in je posts zetten.',
    body: `Vandaag hebben we drie grote verbeteringen doorgevoerd:\n\n1. Eigen /forum route: De forum-homepage met live chat onderaan zit voortaan op /forum in het linkermenu, terwijl / als snelle startpagina dient.\n2. Badges & Reputatie: Helpers verdienen punten bij topics, reacties, likes en het markeren van een Beste Antwoord.\n3. Markdown-tabellen & Bijlagen: Voeg overzichtelijke tabellen en afbeeldingen of bestanden direct toe aan je topics.`,
    category: 'Platform Update',
    publishedAt: '18 nov 2026',
    author: 'Sander Vermeer',
    readTime: '3 min leestijd',
  },
  {
    id: 'n-2',
    title: 'Zoeken werkt nu overal',
    summary:
      'Druk op / of Ctrl+K en zoek in één keer door topics, nieuws en projecten. In de chat kun je nu ook meldingen aanzetten.',
    body: `Je hoeft niet meer handmatig per pagina te zoeken. In de bovenbalk zit nu een globale zoekbalk die direct resultaten toont uit topics, nieuwsartikelen en de Project-galerij.\n\nDaarnaast kun je in de Live chat meldingen aanzetten zodat je geen reactie mist wanneer de tab openstaat op de achtergrond.`,
    category: 'Platform Update',
    publishedAt: '17 nov 2026',
    author: 'Sander Vermeer',
    readTime: '2 min leestijd',
  },
  {
    id: 'n-3',
    title: 'Je kunt nu code en projecten delen',
    summary:
      'Plak code in je topic en het wordt netjes opgemaakt. In de galerij laat je zien wat je gemaakt hebt.',
    body: `Op basis van jullie stemmen zijn codeblokken met syntax highlighting en de interactieve Project-galerij beschikbaar voor alle leden.\n\nOf je nu een React-hook, Vue 3 composable of Tailwind v4 animatie bouwt: zet hem in de galerij en verzamel direct feedback.`,
    category: 'Tech & Stack',
    publishedAt: '15 nov 2026',
    author: 'Lotte de Vries',
    readTime: '3 min leestijd',
  },
  {
    id: 'n-4',
    title: 'Jullie kiezen wat we hierna bouwen',
    summary:
      'Elke week een korte peiling. Plus een eerlijke update over wat de server kost en hoeveel er al binnen is.',
    body: `Elke week kiezen leden in de peiling op /forum welke verbetering prioriteit krijgt. De afgelopen twee rondes leverden al code-snippets, de project-galerij, badges en Markdown-tabellen op.\n\nDankzij community-supporters is nu bijna 70% van de maandelijkse server- en databasekosten gedekt zonder ook maar één advertentie te tonen.`,
    category: 'Community',
    publishedAt: '13 nov 2026',
    author: 'Nora Visser',
    readTime: '2 min leestijd',
  },
  {
    id: 'n-5',
    title: 'Een paar tips voor showcase-posts',
    summary:
      'Vertel kort wat je gemaakt hebt, waarmee, en waar je feedback op wilt. Dan krijg je veel betere reacties.',
    body: `De categorie Showcase groeit hard. Gebruik gerust tabellen, code-snippets en bijlagen om je project helder te presenteren.\n\nEen goede Showcase-post benoemt kort het doel, de gebruikte stack en één specifieke vraag waar de community op mee kan denken.`,
    category: 'Richtlijnen',
    publishedAt: '11 nov 2026',
    author: 'Redactie',
    readTime: '2 min leestijd',
  },
  {
    id: 'n-6',
    title: 'Vrijdag 20:00: samen bouwen in de chat',
    summary:
      'Neem een klein project of een bug mee waar je al dagen op vastzit. Met een paar extra ogen lukt het vaak zo.',
    body: `Aanstaande vrijdag organiseren we weer een informele Build Night in de live chat. Neem een klein side-project of bug mee waar je al dagen op zit te staren — met vijf paar extra ogen is hij vaak binnen tien minuten opgelost.`,
    category: 'Community',
    publishedAt: '8 nov 2026',
    author: 'Lotte de Vries',
    readTime: '2 min leestijd',
  },
];

export const INITIAL_POLL: CommunityPoll = {
  id: 'poll-4',
  question: 'Wat moeten we hierna bouwen?',
  closesIn: 'Sluit over 6 dagen',
  options: [
    { id: 'o-1', label: 'Privéberichten', votes: 42 },
    { id: 'o-2', label: 'Topics opslaan voor later', votes: 29 },
    { id: 'o-3', label: 'Een wekelijkse code-uitdaging', votes: 25 },
    { id: 'o-4', label: 'Beter zoeken (op tag, auteur of datum)', votes: 19 },
  ],
};

export const SIMULATED_CHAT_REPLIES = [
  'Klinkt goed! Check trouwens ook even die nieuwe vergelijkingstabel in /forum.',
  'Helemaal mee eens, dat reputatiesysteem geeft meteen een leuk doel voor actieve helpers!',
  'Top dat je meepraat! Je kunt nu zelfs bestanden en tabellen aan je topics hangen.',
  'Nice, werkt /forum ook lekker op mobiel bij jullie? Hier scrolt alles super vloeiend.',
  'Goeie vraag, open anders een topic in /forum met een code-snippet en eventueel een screenshot erbij!',
];
