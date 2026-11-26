import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Github,
  Heart,
  Megaphone,
  MessageSquare,
  Trophy,
  UserPlus,
  X,
} from 'lucide-react';
import { Member, NavTab, NewsItem } from '../types/forum';
import { UserBadges } from './UserBadges';

interface RightSidebarProps {
  currentUser: Member | null;
  onlineMembers: Member[];
  news: NewsItem[];
  supportRaised: number;
  supportGoal: number;
  onOpenAuth: (mode: 'register' | 'login') => void;
  onNavigate: (tab: NavTab) => void;
  onSelectNews: (item: NewsItem) => void;
  onOpenSupport: () => void;
}

function getRankStyle(index: number): string {
  if (index === 0) {
    return 'bg-[#e8b353]/20 text-[#d99b26] dark:text-[#e8b353] border-[#e8b353]/40';
  }
  if (index === 1) {
    return 'bg-slate-200/80 dark:bg-white/[0.1] text-slate-700 dark:text-slate-200 border-slate-300 dark:border-white/[0.16]';
  }
  if (index === 2) {
    return 'bg-amber-700/15 text-amber-700 dark:text-amber-300 border-amber-600/30';
  }
  return 'bg-slate-100 dark:bg-[#191625] text-slate-500 dark:text-[#86809e] border-slate-200/80 dark:border-white/[0.06]';
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  currentUser,
  onlineMembers,
  news,
  supportRaised,
  supportGoal,
  onOpenAuth,
  onNavigate,
  onSelectNews,
  onOpenSupport,
}) => {
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  const supportPercentage = Math.min(100, Math.round((supportRaised / supportGoal) * 100));

  const topContributors = useMemo(
    () => [...onlineMembers].sort((a, b) => b.reputation - a.reputation),
    [onlineMembers]
  );

  const topScore = topContributors[0]?.reputation || 1;
  const currentUserRank = currentUser
    ? topContributors.findIndex((m) => m.id === currentUser.id || m.name === currentUser.name) + 1
    : null;

  useEffect(() => {
    if (!leaderboardOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLeaderboardOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [leaderboardOpen]);

  return (
    <>
      <aside className="space-y-4" aria-label="Community zijbalk">
        {/* 1. Word lid! card (exact match to screenshot glow & gold CTA) */}
        {currentUser ? (
          <div className="bg-white dark:bg-[#13111c] forum-card-glow border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-[#0f0c18] shrink-0"
                style={{ backgroundColor: currentUser.avatarColor }}
              >
                {currentUser.initials}
              </div>
              <div className="min-w-0">
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-white truncate">
                  Welkom, {currentUser.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#8d87a4] truncate">
                  {currentUser.handle} · {currentUser.role}
                </p>
              </div>
            </div>

            <div className="mt-2.5">
              <UserBadges member={currentUser} maxVisible={3} />
            </div>

            {(currentUser.githubHandle || currentUser.discordHandle) && (
              <div className="flex items-center flex-wrap gap-1.5 mt-3">
                {currentUser.githubHandle && (
                  <a
                    href={`https://github.com/${currentUser.githubHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#1b1828] hover:bg-slate-200 dark:hover:bg-[#252038] text-[11px] font-mono text-slate-700 dark:text-[#d5d0e6] transition-colors"
                  >
                    <Github className="w-3 h-3 shrink-0" />
                    <span>{currentUser.githubHandle}</span>
                  </a>
                )}
                {currentUser.discordHandle && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#5865F2]/15 text-[11px] font-mono text-[#4752C4] dark:text-[#b9c0ff]">
                    <MessageSquare className="w-3 h-3 shrink-0" />
                    <span>{currentUser.discordHandle}</span>
                  </span>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-white/[0.07]">
              <div>
                <div className="text-xs text-slate-500 dark:text-[#8d87a4]">Bijdragen</div>
                <div className="font-display font-bold text-lg text-slate-900 dark:text-white tabular-nums mt-0.5">
                  {currentUser.postsCount}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-[#8d87a4]">Reputatie</div>
                <div className="font-display font-bold text-lg text-[#d99b26] dark:text-[#e8b353] tabular-nums mt-0.5">
                  {currentUser.reputation} rep
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="mt-4 w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-[#1c1829] hover:bg-slate-200 dark:hover:bg-[#241f35] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>Bekijk profiel</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#13111c] forum-card-glow forum-card-glow--moving border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5">
            <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white tracking-tight">
              Word lid!
            </h3>
            <p className="text-sm text-slate-600 dark:text-[#9c96b2] leading-relaxed mt-2">
              Een account is gratis en zo gemaakt. Daarna kun je meepraten in de chat en op het
              forum.
            </p>
            <button
              type="button"
              onClick={() => onOpenAuth('register')}
              className="mt-5 px-4 py-2.5 rounded-xl bg-[#e8b353] hover:bg-[#f0be63] text-[#141008] text-sm font-bold inline-flex items-center gap-2 transition-colors duration-150 cursor-pointer shadow-xs whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" />
              <span>Aanmelden</span>
            </button>
          </div>
        )}

        {/* 2. Nieuws card */}
        <div className="bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5">
          <div className="flex items-center justify-between gap-2 mb-3.5">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[#e8b353]" />
              <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white">
                Nieuws
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('news')}
              className="text-xs font-semibold text-violet-600 dark:text-[#a88bfa] hover:underline cursor-pointer whitespace-nowrap"
            >
              Alles
            </button>
          </div>

          <div className="divide-y divide-slate-200/80 dark:divide-white/[0.06]">
            {news.slice(0, 3).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectNews(item)}
                className="w-full text-left py-2.5 first:pt-0 last:pb-0 group cursor-pointer block"
              >
                <div className="text-sm font-medium text-slate-800 dark:text-[#e4e0f2] group-hover:text-violet-600 dark:group-hover:text-[#a88bfa] transition-colors line-clamp-2 leading-snug">
                  {item.title}
                </div>
                <div className="text-xs text-slate-400 dark:text-[#756f8c] mt-1 flex items-center gap-1.5">
                  <span>{item.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{item.publishedAt}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Top Contributors leaderboard card */}
        <div className="bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5">
          <div className="flex items-center justify-between gap-2 mb-3.5">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#e8b353]" />
              <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white">
                Ranglijst
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setLeaderboardOpen(true)}
              className="text-xs font-semibold text-violet-600 dark:text-[#a88bfa] hover:underline cursor-pointer whitespace-nowrap"
            >
              Alles
            </button>
          </div>

          <div className="space-y-3">
            {topContributors.slice(0, 4).map((member, index) => {
              const barWidth = Math.max(12, Math.round((member.reputation / topScore) * 100));
              const isMe = currentUser?.id === member.id || currentUser?.name === member.name;

              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setLeaderboardOpen(true)}
                  className="w-full text-left group cursor-pointer block"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-6 h-6 rounded-md border text-[11px] font-mono font-bold tabular-nums flex items-center justify-center shrink-0 ${getRankStyle(
                        index
                      )}`}
                    >
                      #{index + 1}
                    </span>

                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-[#0f0c18] shrink-0"
                      style={{ backgroundColor: member.avatarColor }}
                    >
                      {member.initials}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-slate-800 dark:text-[#e4e0f2] group-hover:text-violet-600 dark:group-hover:text-[#a88bfa] transition-colors truncate">
                          {member.name}
                          {isMe ? ' (jij)' : ''}
                        </span>
                        <span className="text-xs font-mono font-semibold tabular-nums text-[#d99b26] dark:text-[#e8b353] shrink-0">
                          {member.reputation} rep
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1 flex-1 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#a88bfa] to-[#e8b353] transition-all duration-300"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <UserBadges
                          member={member}
                          maxVisible={1}
                          showOverflowCount={false}
                        />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between gap-2 text-xs">
            <span className="text-slate-500 dark:text-[#86809e]">
              {currentUserRank
                ? `Jouw positie: #${currentUserRank} van ${topContributors.length}`
                : 'Verdien rep met topics & hulp'}
            </span>
            <button
              type="button"
              onClick={() => setLeaderboardOpen(true)}
              className="font-semibold text-violet-600 dark:text-[#a88bfa] hover:underline cursor-pointer whitespace-nowrap"
            >
              Hoe verdien ik punten?
            </button>
          </div>
        </div>

        {/* 4. Wie is er online card */}
        <div className="bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5">
          <div className="flex items-center justify-between gap-2 mb-3.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
              </span>
              <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white">
                Wie is er online
              </h3>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-400 dark:text-[#756f8c]">
              {onlineMembers.length}
            </span>
          </div>

          <div className="space-y-3">
            {onlineMembers.slice(0, 5).map((member) => {
              const lastSeenLabel = member.lastSeen ?? 'Nu actief · zojuist';
              return (
                <div key={member.id} className="flex items-center gap-2.5">
                  {/* Avatar with pulsing status-dot */}
                  <div className="relative shrink-0">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-[#0f0c18]"
                      style={{ backgroundColor: member.avatarColor }}
                    >
                      {member.initials}
                    </div>
                    <span
                      className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center"
                      title={member.isOnline ? `Online — ${lastSeenLabel}` : `Offline — ${lastSeenLabel}`}
                    >
                      {member.isOnline && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      )}
                      <span
                        className={`relative inline-flex rounded-full h-2.5 w-2.5 ring-2 ring-white dark:ring-[#13111c] ${
                          member.isOnline ? 'bg-emerald-400' : 'bg-slate-400 dark:bg-slate-500'
                        }`}
                      />
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      {/* Hoverable member name with 'Laatst gezien' timestamp tooltip + inline badge */}
                      <div className="relative group/member min-w-0 inline-flex items-center gap-1.5">
                        <span
                          tabIndex={0}
                          title={`Laatst gezien: ${lastSeenLabel}`}
                          className="text-sm font-medium text-slate-800 dark:text-[#e4e0f2] group-hover/member:text-violet-600 dark:group-hover/member:text-[#a88bfa] transition-colors truncate cursor-default focus:outline-none"
                        >
                          {member.name}
                        </span>

                        <UserBadges
                          member={member}
                          maxVisible={1}
                          showOverflowCount={false}
                        />

                        {/* Styled hover tooltip showing 'Laatst gezien' timestamp */}
                        <div
                          role="tooltip"
                          className="pointer-events-none opacity-0 group-hover/member:opacity-100 group-focus-within/member:opacity-100 transition-opacity duration-150 absolute left-0 bottom-full mb-1.5 z-30 px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-[#1e1a2d] border border-slate-700/80 dark:border-white/[0.12] text-[11px] font-mono text-white shadow-lg w-max max-w-[min(16rem,calc(100vw-5rem))] flex items-center gap-1.5"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              member.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                            }`}
                          />
                          <span>Laatst gezien: {lastSeenLabel}</span>
                        </div>
                      </div>

                      <span className="text-[11px] font-mono tabular-nums text-[#d99b26] dark:text-[#e8b353] shrink-0">
                        {member.reputation} rep
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-[#86809e] truncate">
                      {member.statusText}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. STEUN HET FORUM card */}
        <div className="bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white">
              Steun het forum
            </h3>
          </div>

          <p className="text-sm text-slate-600 dark:text-[#9c96b2] leading-relaxed mt-2">
            Het forum draait op een gehuurde server. Wil je meebetalen aan de rekening? Elke euro helpt echt.
          </p>

          {/* Hosting goal progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-500 dark:text-[#86809e]">Maanddoel hosting</span>
              <span className="font-mono tabular-nums font-medium text-slate-800 dark:text-slate-200">
                €{supportRaised} / €{supportGoal} ({supportPercentage}%)
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-white/[0.07] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#a88bfa] to-[#e8b353] transition-all duration-300"
                style={{ width: `${supportPercentage}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenSupport}
            className="mt-4 w-full py-2 px-3.5 rounded-xl bg-slate-100 dark:bg-[#1b1828] hover:bg-slate-200 dark:hover:bg-[#231f33] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Heart className="w-3.5 h-3.5 text-[#e8b353]" />
            <span>Bijdragen</span>
          </button>
        </div>
      </aside>

      {/* Top Contributors Full Leaderboard Modal */}
      {leaderboardOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs forum-modal-overlay"
          onClick={() => setLeaderboardOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Top Contributors Klassement"
            className="w-full max-w-xl max-h-[88vh] flex flex-col bg-white dark:bg-[#13111c] forum-card-glow border border-slate-200 dark:border-white/[0.1] rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.07] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Trophy className="w-5 h-5 text-[#e8b353]" />
                <div>
                  <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                    Ranglijst
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-[#86809e]">
                    Wie het meest helpt, staat bovenaan.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setLeaderboardOpen(false)}
                aria-label="Sluiten"
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#1c1829] hover:bg-slate-200 dark:hover:bg-[#262138] text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Leaderboard list */}
              <div className="divide-y divide-slate-200 dark:divide-white/[0.06] border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
                {topContributors.map((member, index) => {
                  const isMe =
                    currentUser?.id === member.id || currentUser?.name === member.name;
                  return (
                    <div
                      key={member.id}
                      className={`p-3.5 flex items-center justify-between gap-3 ${
                        isMe
                          ? 'bg-[#a88bfa]/10 dark:bg-[#a88bfa]/[0.08]'
                          : 'bg-white dark:bg-[#13111c]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-7 h-7 rounded-lg border text-xs font-mono font-bold tabular-nums flex items-center justify-center shrink-0 ${getRankStyle(
                            index
                          )}`}
                        >
                          #{index + 1}
                        </span>

                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-[#0f0c18] shrink-0"
                          style={{ backgroundColor: member.avatarColor }}
                        >
                          {member.initials}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center flex-wrap gap-1.5">
                            <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                              {member.name}
                              {isMe ? ' (jij)' : ''}
                            </span>
                            <span className="text-xs text-violet-600 dark:text-[#a88bfa] font-medium shrink-0">
                              {member.role}
                            </span>
                          </div>
                          <div className="mt-1">
                            <UserBadges member={member} maxVisible={3} variant="full" />
                          </div>
                          <div className="text-xs text-slate-500 dark:text-[#86809e] flex items-center flex-wrap gap-1.5 mt-1">
                            <span className="tabular-nums">{member.postsCount} bijdragen</span>
                          </div>
                          {(member.githubHandle || member.discordHandle) && (
                            <div className="flex items-center flex-wrap gap-1.5 mt-1">
                              {member.githubHandle && (
                                <a
                                  href={`https://github.com/${member.githubHandle}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#1b1828] text-[10px] font-mono text-slate-600 dark:text-[#c7c2da] hover:underline"
                                >
                                  <Github className="w-2.5 h-2.5 shrink-0" />
                                  <span>{member.githubHandle}</span>
                                </a>
                              )}
                              {member.discordHandle && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#5865F2]/12 text-[10px] font-mono text-[#4752C4] dark:text-[#b9c0ff]">
                                  <MessageSquare className="w-2.5 h-2.5 shrink-0" />
                                  <span>{member.discordHandle}</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-sm tabular-nums text-[#d99b26] dark:text-[#e8b353]">
                          {member.reputation} rep
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-[#756f8c]">
                          Sinds {member.joinedAt}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Point incentives breakdown */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#181524] border border-slate-200/80 dark:border-white/[0.06]">
                <div className="text-xs font-semibold text-slate-900 dark:text-white mb-2">
                  Zo verdien je punten:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-[#9c96b2]">
                  <div className="flex items-center justify-between">
                    <span>Beste Antwoord / Showcase project</span>
                    <span className="font-mono font-semibold text-[#d99b26] dark:text-[#e8b353]">
                      +15 rep
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Nieuw topic starten</span>
                    <span className="font-mono font-semibold text-[#d99b26] dark:text-[#e8b353]">
                      +10 rep
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Reactie onder een topic</span>
                    <span className="font-mono font-semibold text-[#d99b26] dark:text-[#e8b353]">
                      +5 rep
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Live chat bericht of like</span>
                    <span className="font-mono font-semibold text-[#d99b26] dark:text-[#e8b353]">
                      +2 rep
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-white/[0.07] bg-slate-50 dark:bg-[#110f19] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setLeaderboardOpen(false);
                  onNavigate('profile');
                }}
                className="text-xs font-semibold text-violet-600 dark:text-[#a88bfa] hover:underline cursor-pointer"
              >
                Naar profiel & badges
              </button>

              <button
                type="button"
                onClick={() => setLeaderboardOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-[#a88bfa] hover:bg-[#b79dff] text-[#0f0c18] text-xs font-semibold cursor-pointer"
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

