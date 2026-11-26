import { Member } from '../types/forum';

export type BadgeActionType =
  | 'create_topic'
  | 'add_reply'
  | 'best_answer'
  | 'create_project'
  | 'send_chat'
  | 'link_socials'
  | 'support_forum'
  | 'vote_or_like';

export type BadgeTone =
  | 'gold'
  | 'violet'
  | 'emerald'
  | 'sky'
  | 'rose'
  | 'indigo'
  | 'slate'
  // Glanzende verloop-badges met een glinstering (zie .badge-shine in index.css)
  | 'founder'
  | 'admin'
  | 'moderator'
  | 'first'
  | 'builder';

export type BadgeIconKey =
  | 'crown'
  | 'trophy'
  | 'check'
  | 'rocket'
  | 'code'
  | 'calendar'
  | 'message'
  | 'zap'
  | 'heart'
  | 'link'
  | 'shield'
  | 'star'
  | 'sparkles';

export interface BadgeDefinition {
  id: string;
  label: string;
  shortLabel?: string;
  description: string;
  requirementText: string;
  icon: BadgeIconKey;
  tone: BadgeTone;
  minReputation?: number;
  actionTrigger?: BadgeActionType;
  priority: number;
}

export const BADGE_CATALOG: BadgeDefinition[] = [
  {
    id: 'Oprichter',
    label: 'Oprichter',
    shortLabel: 'Oprichter',
    description: 'Grondlegger van de community of bereikte 1.400+ reputatiepunten.',
    requirementText: '1.400+ rep of oprichter-status',
    icon: 'crown',
    tone: 'founder',
    minReputation: 1400,
    priority: 100,
  },
  {
    id: 'Admin',
    label: 'Admin',
    shortLabel: 'Admin',
    description: 'Beheert het forum: plaatst nieuws, beheert leden en houdt de community veilig.',
    requirementText: 'Beheerder van het forum',
    icon: 'shield',
    tone: 'admin',
    priority: 99,
  },
  {
    id: 'Moderator',
    label: 'Moderator',
    shortLabel: 'Mod',
    description: 'Houdt discussies op het forum overzichtelijk en constructief.',
    requirementText: 'Moderator van het forum',
    icon: 'shield',
    tone: 'moderator',
    priority: 98,
  },
  {
    id: 'Lid #001',
    label: 'Lid #001',
    shortLabel: '#001',
    description: 'Het allereerste lid van de community.',
    requirementText: 'Uitgedeeld door een beheerder',
    icon: 'star',
    tone: 'first',
    priority: 97,
  },
  {
    id: 'Bouwer',
    label: 'Bouwer',
    shortLabel: 'Bouwer',
    description: 'Heeft dit forum mee gebouwd.',
    requirementText: 'Uitgedeeld door een beheerder',
    icon: 'zap',
    tone: 'builder',
    priority: 96,
  },
  {
    id: 'Top Helper',
    label: 'Top Helper',
    shortLabel: 'Top Helper',
    description: 'Actieve vraagbaak met 500+ reputatie of meerdere geplaatste oplossingen.',
    requirementText: '500+ rep of 3+ nuttige reacties',
    icon: 'trophy',
    tone: 'gold',
    minReputation: 500,
    priority: 95,
  },
  {
    id: 'Code Mentor',
    label: 'Code Mentor',
    shortLabel: 'Code Mentor',
    description: 'Deelt hoogwaardige React-, Vue- en TypeScript-architectuur met de community.',
    requirementText: '900+ rep of code-oplossingen',
    icon: 'code',
    tone: 'violet',
    minReputation: 900,
    priority: 92,
  },
  {
    id: 'Project Pionier',
    label: 'Project Pionier',
    shortLabel: 'Project Pionier',
    description: 'Heeft een interactief project of live preview gepubliceerd in de Project-galerij.',
    requirementText: 'Deel een project in de galerij (+15 rep) of 600+ rep',
    icon: 'rocket',
    tone: 'sky',
    minReputation: 600,
    actionTrigger: 'create_project',
    priority: 90,
  },
  {
    id: 'Beste Antwoord',
    label: 'Beste Antwoord',
    shortLabel: 'Beste Antwoord',
    description: 'Gaf de winnende oplossing voor een hulpvraag in een forumtopic.',
    requirementText: 'Reactie gemarkeerd als Beste Antwoord (+15 rep)',
    icon: 'check',
    tone: 'emerald',
    actionTrigger: 'best_answer',
    priority: 88,
  },
  {
    id: 'Supporter',
    label: 'Supporter',
    shortLabel: 'Supporter',
    description: 'Draagt financieel bij aan de reclamevrije hosting van het forum.',
    requirementText: 'Steun het forum met een bijdrage',
    icon: 'heart',
    tone: 'rose',
    actionTrigger: 'support_forum',
    priority: 85,
  },
  {
    id: 'Actieve Helper',
    label: 'Actieve Helper',
    shortLabel: 'Helper',
    description: 'Denkt actief mee met andere leden door vragen te beantwoorden in topics.',
    requirementText: 'Plaats een reactie onder een topic (+5 rep) of 100+ rep',
    icon: 'message',
    tone: 'emerald',
    minReputation: 100,
    actionTrigger: 'add_reply',
    priority: 80,
  },
  {
    id: 'Topic Starter',
    label: 'Topic Starter',
    shortLabel: 'Topic Starter',
    description: 'Brengt nieuwe gesprekken en technische discussies op gang in /forum.',
    requirementText: 'Start een nieuw topic (+10 rep)',
    icon: 'sparkles',
    tone: 'rose',
    actionTrigger: 'create_topic',
    priority: 76,
  },
  {
    id: 'GitHub & Discord',
    label: 'GitHub & Discord',
    shortLabel: 'GitHub/Discord',
    description: 'Heeft een geverifieerde GitHub- of Discord-handle gekoppeld aan het profiel.',
    requirementText: 'Koppel GitHub of Discord in je profiel (+10 rep)',
    icon: 'link',
    tone: 'indigo',
    actionTrigger: 'link_socials',
    priority: 72,
  },
  {
    id: 'Live Chatter',
    label: 'Live Chatter',
    shortLabel: 'Chatter',
    description: 'Praat live mee met de community onderaan /forum.',
    requirementText: 'Stuur een bericht in de Live chat (+2 rep)',
    icon: 'zap',
    tone: 'violet',
    actionTrigger: 'send_chat',
    priority: 68,
  },
  {
    id: 'Lid sinds 2025',
    label: 'Lid sinds 2025',
    shortLabel: 'Sinds 2025',
    description: 'Vanaf het eerste uur actief lid van de community in 2025.',
    requirementText: 'Lid geworden in 2025',
    icon: 'calendar',
    tone: 'slate',
    priority: 65,
  },
  {
    id: 'Lid sinds 2026',
    label: 'Lid sinds 2026',
    shortLabel: 'Sinds 2026',
    description: ' Lid van de nieuwe generatie bouwers in 2026.',
    requirementText: 'Lid geworden in 2026',
    icon: 'calendar',
    tone: 'slate',
    priority: 64,
  },
];

const FALLBACK_BADGE_MAP: Record<string, Omit<BadgeDefinition, 'id'>> = {
  Moderator: {
    label: 'Moderator',
    shortLabel: 'Mod',
    description: 'Houdt discussies op het forum overzichtelijk en constructief.',
    requirementText: 'Community moderator',
    icon: 'shield',
    tone: 'gold',
    priority: 94,
  },
  'UI Bouwer': {
    label: 'UI Bouwer',
    shortLabel: 'UI Bouwer',
    description: 'Specialist in strakke interfaces, Tailwind en thema-design.',
    requirementText: 'Deel UI-showcases op het forum',
    icon: 'sparkles',
    tone: 'emerald',
    priority: 78,
  },
  'Vroege Vogel': {
    label: 'Vroege Vogel',
    shortLabel: 'Vroege Vogel',
    description: 'Een van de eerste leden die actief meebouwde aan het forum.',
    requirementText: 'Vroege deelnemer',
    icon: 'zap',
    tone: 'sky',
    priority: 70,
  },
  'React & Vue': {
    label: 'React & Vue',
    shortLabel: 'React & Vue',
    description: 'Bouwt hybride oplossingen en bruggen tussen React en Vue.',
    requirementText: 'Actief in de categorie React & Vue',
    icon: 'code',
    tone: 'sky',
    priority: 77,
  },
  'Snelle Starter': {
    label: 'Snelle Starter',
    shortLabel: 'Snelle Starter',
    description: 'Verzamelde in korte tijd meer dan 250 reputatiepunten.',
    requirementText: '250+ rep behaald',
    icon: 'rocket',
    tone: 'rose',
    priority: 74,
  },
  'Showcase Bouwer': {
    label: 'Project Pionier',
    shortLabel: 'Project Pionier',
    description: 'Heeft een interactief project toegevoegd aan de Project-galerij.',
    requirementText: 'Deel een project in de galerij',
    icon: 'rocket',
    tone: 'sky',
    priority: 90,
  },
  'Nieuw Lid': {
    label: 'Nieuw Lid',
    shortLabel: 'Nieuw Lid',
    description: 'Welkom bij de community! Klaar om mee te praten en te bouwen.',
    requirementText: 'Account aangemaakt',
    icon: 'sparkles',
    tone: 'violet',
    priority: 40,
  },
};

export function getBadgeDefinition(badgeName: string): BadgeDefinition {
  const catalogMatch = BADGE_CATALOG.find(
    (b) => b.id.toLowerCase() === badgeName.toLowerCase() || b.label.toLowerCase() === badgeName.toLowerCase()
  );
  if (catalogMatch) return catalogMatch;

  const fallback = FALLBACK_BADGE_MAP[badgeName];
  if (fallback) {
    return {
      id: badgeName,
      ...fallback,
    };
  }

  return {
    id: badgeName,
    label: badgeName,
    shortLabel: badgeName,
    description: `Community-badge verdiend voor betrokkenheid op het forum (${badgeName}).`,
    requirementText: 'Actieve deelname op het forum',
    icon: 'sparkles',
    tone: 'violet',
    priority: 50,
  };
}

export function deriveTenureBadge(joinedAt?: string): string {
  if (!joinedAt) return 'Lid sinds 2026';
  if (joinedAt.includes('2025')) return 'Lid sinds 2025';
  return 'Lid sinds 2026';
}

/**
 * Automatically evaluates and returns all badges a member qualifies for based on
 * their reputation score, tenure (`joinedAt`), social links, post count, and latest action.
 */
export function evaluateMemberBadges(
  member: Pick<
    Member,
    'reputation' | 'postsCount' | 'joinedAt' | 'githubHandle' | 'discordHandle' | 'role' | 'badges'
  >,
  action?: BadgeActionType,
  explicitBadge?: string
): string[] {
  const earned = new Set<string>(member.badges.map((b) => (b === 'Showcase Bouwer' ? 'Project Pionier' : b)));

  if (explicitBadge) {
    earned.add(explicitBadge === 'Showcase Bouwer' ? 'Project Pionier' : explicitBadge);
  }

  // Rol-badges: komen uit user_roles (via het rollabel op het lid).
  const role = (member.role ?? '').toLowerCase();
  if (role === 'beheerder' || role === 'admin') {
    earned.add('Admin');
  } else if (role === 'moderator') {
    earned.add('Moderator');
  }

  // Automatic tenure badge ('Lid sinds 2025' or 'Lid sinds 2026')
  earned.add(deriveTenureBadge(member.joinedAt));

  // Automatic action-based badges
  if (action === 'create_topic') {
    earned.add('Topic Starter');
  }
  if (action === 'add_reply') {
    earned.add('Actieve Helper');
    if (member.postsCount >= 4) {
      earned.add('Top Helper');
    }
  }
  if (action === 'best_answer') {
    earned.add('Beste Antwoord');
    earned.add('Top Helper');
  }
  if (action === 'create_project') {
    earned.add('Project Pionier');
  }
  if (action === 'send_chat') {
    earned.add('Live Chatter');
  }
  if (action === 'support_forum' || member.role.toLowerCase() === 'supporter') {
    earned.add('Supporter');
  }
  if (action === 'link_socials' || member.githubHandle || member.discordHandle) {
    earned.add('GitHub & Discord');
  }

  // Automatic reputation threshold badges
  if (member.reputation >= 100) {
    earned.add('Actieve Helper');
  }
  if (member.reputation >= 500) {
    earned.add('Top Helper');
  }
  if (member.reputation >= 600) {
    earned.add('Project Pionier');
  }
  if (member.reputation >= 900) {
    earned.add('Code Mentor');
  }
  if (member.reputation >= 1400) {
    earned.add('Oprichter');
  }

  return Array.from(earned).sort(
    (a, b) => getBadgeDefinition(b).priority - getBadgeDefinition(a).priority
  );
}
