import React from 'react';
import {
  Calendar,
  CheckCircle2,
  Code2,
  Crown,
  Heart,
  Link2,
  MessageSquare,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Zap,
} from 'lucide-react';
import { Member } from '../types/forum';
import {
  BadgeIconKey,
  BadgeTone,
  evaluateMemberBadges,
  getBadgeDefinition,
} from '../utils/badgeSystem';

export function renderBadgeIcon(icon: BadgeIconKey, className = 'w-3 h-3 shrink-0') {
  switch (icon) {
    case 'crown':
      return <Crown className={className} />;
    case 'trophy':
      return <Trophy className={className} />;
    case 'check':
      return <CheckCircle2 className={className} />;
    case 'rocket':
      return <Rocket className={className} />;
    case 'code':
      return <Code2 className={className} />;
    case 'calendar':
      return <Calendar className={className} />;
    case 'message':
      return <MessageSquare className={className} />;
    case 'zap':
      return <Zap className={className} />;
    case 'heart':
      return <Heart className={className} />;
    case 'link':
      return <Link2 className={className} />;
    case 'shield':
      return <ShieldCheck className={className} />;
    case 'star':
      return <Star className={className} fill="currentColor" />;
    case 'sparkles':
    default:
      return <Sparkles className={className} />;
  }
}

export function getBadgeToneClasses(tone: BadgeTone): string {
  switch (tone) {
    case 'founder':
      return 'badge-shine badge-shine--founder';
    case 'admin':
      return 'badge-shine badge-shine--admin';
    case 'moderator':
      return 'badge-shine badge-shine--moderator';
    case 'first':
      return 'badge-shine badge-shine--first';
    case 'builder':
      return 'badge-shine badge-shine--builder';
    case 'gold':
      return 'bg-[#e8b353]/16 text-amber-800 dark:text-[#f2c46d] border-[#e8b353]/35';
    case 'emerald':
      return 'bg-emerald-500/14 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    case 'sky':
      return 'bg-sky-500/14 text-sky-700 dark:text-sky-300 border-sky-500/30';
    case 'rose':
      return 'bg-rose-500/14 text-rose-700 dark:text-rose-300 border-rose-500/30';
    case 'indigo':
      return 'bg-indigo-500/14 text-indigo-700 dark:text-indigo-300 border-indigo-500/30';
    case 'slate':
      return 'bg-slate-200/75 dark:bg-white/[0.07] text-slate-700 dark:text-[#c7c2da] border-slate-300/80 dark:border-white/[0.12]';
    case 'violet':
    default:
      return 'bg-[#a88bfa]/15 text-violet-700 dark:text-[#d5c6ff] border-[#a88bfa]/35';
  }
}

interface UserBadgesProps {
  badges?: string[];
  member?: Member | null;
  authorName?: string;
  onlineMembers?: Member[];
  maxVisible?: number;
  variant?: 'inline' | 'icon-only' | 'full';
  showOverflowCount?: boolean;
}

export const UserBadges: React.FC<UserBadgesProps> = ({
  badges,
  member,
  authorName,
  onlineMembers,
  maxVisible = 2,
  variant = 'inline',
  showOverflowCount = true,
}) => {
  const resolvedMember =
    member ??
    (authorName && onlineMembers
      ? onlineMembers.find((m) => m.name.toLowerCase() === authorName.toLowerCase()) ?? null
      : null);

  const rawBadgeList =
    badges ??
    (resolvedMember ? evaluateMemberBadges(resolvedMember) : []);

  if (rawBadgeList.length === 0) return null;

  const sortedDefinitions = rawBadgeList
    .map((b) => getBadgeDefinition(b))
    .sort((a, b) => b.priority - a.priority);

  const visible = sortedDefinitions.slice(0, maxVisible);
  const remaining = sortedDefinitions.slice(maxVisible);

  return (
    <span className="inline-flex items-center flex-wrap gap-1 align-middle">
      {visible.map((def) => {
        const toneClasses = getBadgeToneClasses(def.tone);
        const tooltipText = `${def.label} — ${def.description} (${def.requirementText})`;

        if (variant === 'icon-only') {
          return (
            <span
              key={def.id}
              title={tooltipText}
              aria-label={def.label}
              className={`inline-flex items-center justify-center w-4 h-4 rounded-md border ${toneClasses} shrink-0`}
            >
              {renderBadgeIcon(def.icon, 'w-2.5 h-2.5')}
            </span>
          );
        }

        return (
          <span
            key={def.id}
            title={tooltipText}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-semibold leading-none whitespace-nowrap ${toneClasses}`}
          >
            {renderBadgeIcon(def.icon, 'w-2.5 h-2.5 shrink-0')}
            <span>{variant === 'inline' ? def.shortLabel ?? def.label : def.label}</span>
          </span>
        );
      })}

      {showOverflowCount && remaining.length > 0 && (
        <span
          title={`Extra badges: ${remaining.map((r) => r.label).join(', ')}`}
          className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.09] text-[10px] font-mono font-medium text-slate-500 dark:text-[#9c96b2] leading-none"
        >
          +{remaining.length}
        </span>
      )}
    </span>
  );
};
