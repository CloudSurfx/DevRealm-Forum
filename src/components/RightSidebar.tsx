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
    return 'bg-[var(--color-warning-muted)] text-[var(--color-warning)] dark:text-[var(--color-warning)] border-[var(--color-warning)]/40';
  }
  if (index === 1) {
    return 'bg-[var(--forum-border)]/80 text-[var(--color-text)] dark:text-[var(--color-text)] border-[var(--forum-border)]';
  }
  if (index === 2) {
    return 'bg-amber-700/15 text-amber-700 dark:text-amber-300 border-amber-600/30';
  }
  return 'bg-[var(--forum-bg-elevated)] text-[var(--color-text-dim)] dark:text-[var(--color-text-dim)] border-[var(--forum-border)]/80';
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
          <div className="surface">
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-[var(--color-text-inverse)] shrink-0"
                  style={{ backgroundColor: currentUser.avatarColor }}
                >
                  {currentUser.initials}
                </div>
                <div className="min-w-0">
                  <h3 className="font-display font-bold text-base text-[var(--color-text)] truncate">
                    Welkom, {currentUser.name}
                  </h3>
                  <p className="text-xs text-[var(--color-text-dim)] truncate">
                    {currentUser.handle} · {currentUser.role}
                  </p>
                </div>
              </div>

              <div>
                <UserBadges member={currentUser} maxVisible={3} />
              </div>

              {(currentUser.githubHandle || currentUser.discordHandle) && (
                <div className="flex items-center flex-wrap gap-1.5">
                  {currentUser.githubHandle && (
                    <a
                      href={`https://github.com/${currentUser.githubHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--forum-bg-elevated)] hover:bg-[var(--color-bg-hover)] text-[11px] font-mono text-[var(--color-text-dim)] transition-colors"
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

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[var(--forum-border)]">
                <div>
                  <div className="text-xs text-[var(--color-text-dim)]">Bijdragen</div>
                  <div className="font-display font-bold text-lg text-[var(--color-text)] tabular-nums mt-0.5">
                    {currentUser.postsCount}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[var(--color-text-dim)]">Reputatie</div>
                  <div className="font-display font-bold text-lg text-[var(--forum-accent-hover)] tabular-nums mt-0.5">
                    {currentUser.reputation} rep
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('profile')}
                className="w-full py-2.5 px-4 rounded-xl bg-[var(--forum-bg-elevated)] hover:bg-[var(--color-bg-hover)] border border-[var(--forum-border)] text-[var(--color-text)] text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>Bekijk profiel</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="surface surface-hover">
            <div className="p-5 space-y-4">
              <h3 className="font-display font-bold text-xl text-[var(--color-text)] tracking-tight">
                Word lid!
              </h3>
              <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                Een account is gratis en zo gemaakt. Daarna kun je meepraten in de chat en op het
                forum.
              </p>
              <button
                type="button"
                onClick={() => onOpenAuth('register')}
                className="px-4 py-2.5 rounded-xl bg-[var(--forum-accent)] hover:bg-[var(--forum-accent-hover)] text-[var(--color-text-inverse)] text-sm font-bold inline-flex items-center gap-2 transition-colors duration-150 cursor-pointer whitespace-nowrap"
              >
                <UserPlus className="w-4 h-4" />
                <span>Aanmelden</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. Nieuws card */}
        <div className="surface">
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-[var(--forum-accent-hover)]" />
                <h3 className="font-display font-bold text-sm text-[var(--color-text)]">
                  Nieuws
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('news')}
                className="text-xs font-semibold text-[var(--forum-accent)] hover:underline cursor-pointer whitespace-nowrap"
              >
                Alles
              </button>
            </div>

            <div className="divide-y divide-[var(--forum-border)]">
              {news.slice(0, 3).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectNews(item)}
                  className="w-full text-left py-2.5 first:pt-0 last:pb-0 group cursor-pointer block"
                >
                  <div className="text-sm font-medium text-[var(--color-text)] group-hover:text-[var(--forum-accent)] transition-colors line-clamp-2 leading-snug">
                    {item.title}
                  </div>
                  <div className="text-xs text-[var(--color-text-dim)] mt-1 flex items-center gap-1.5">
                    <span>{item.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.publishedAt}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Top Contributors leaderboard card */}
        <div className="surface">
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[var(--forum-accent-hover)]" />
                <h3 className="font-display font-bold text-sm text-[var(--color-text)]">
                  Ranglijst
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLeaderboardOpen(true)}
                className="text-xs font-semibold text-[var(--forum-accent)] hover:underline cursor-pointer whitespace-nowrap"
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
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-[var(--color-text-inverse)] shrink-0"
                        style={{ backgroundColor: member.avatarColor }}
                      >
                        {member.initials}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-[var(--color-text)] group-hover:text-[var(--forum-accent)] transition-colors truncate">
                            {member.name}
                            {isMe ? ' (jij)' : ''}
                          </span>
                          <span className="text-xs font-mono font-semibold tabular-nums text-[var(--forum-accent-hover)] shrink-0">
                            {member.reputation} rep
                          </span>
                        </div>

                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1 flex-1 rounded-full bg-[var(--forum-border)] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[var(--forum-accent)] to-[var(--forum-accent-hover)] transition-all duration-300"
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

            <div className="pt-3 border-t border-[var(--forum-border)] flex items-center justify-between gap-2 text-xs">
              <span className="text-[var(--color-text-dim)]">
                {currentUserRank
                  ? `Jouw positie: #${currentUserRank} van ${topContributors.length}`
                  : 'Verdien rep met topics & hulp'}
              </span>
              <button
                type="button"
                onClick={() => setLeaderboardOpen(true)}
                className="font-semibold text-[var(--forum-accent)] hover:underline cursor-pointer whitespace-nowrap"
              >
                Hoe verdien ik punten?
              </button>
            </div>
          </div>
        </div>

        {/* 4. Wie is er online card */}
        <div className="surface">
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-success)] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--color-success)]" />
                </span>
                <h3 className="font-display font-bold text-sm text-[var(--color-text)]">
                  Wie is er online
                </h3>
              </div>
              <span className="text-xs font-mono tabular-nums text-[var(--color-text-dim)]">
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
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-[var(--color-text-inverse)]"
                        style={{ backgroundColor: member.avatarColor }}
                      >
                        {member.initials}
                      </div>
                      <span
                        className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center"
                        title={member.isOnline ? `Online — ${lastSeenLabel}` : `Offline — ${lastSeenLabel}`}
                      >
                        {member.isOnline && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-success)] opacity-75" />
                        )}
                        <span
                          className={`relative inline-flex rounded-full h-2.5 w-2.5 ring-2 ring-[var(--forum-bg)] dark:ring-[var(--forum-bg)] ${
                            member.isOnline ? 'bg-[var(--color-success)]' : 'bg-slate-400 dark:bg-slate-500'
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
                            className="text-sm font-medium text-[var(--color-text)] group-hover/member:text-[var(--forum-accent)] transition-colors truncate cursor-default focus:outline-none"
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
                            className="pointer-events-none opacity-0 group-hover/member:opacity-100 group-focus-within/member:opacity-100 transition-opacity duration-150 absolute left-0 bottom-full mb-1.5 z-[var(--z-tooltip)] px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-[#1e1a2d] border border-slate-700/80 dark:border-white/[0.12] text-[11px] font-mono text-white shadow-lg w-max max-w-[min(16rem,calc(100vw-5rem))] flex items-center gap-1.5"
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                member.isOnline ? 'bg-[var(--color-success)] animate-pulse' : 'bg-slate-400'
                              }`}
                            />
                            <span>Laatst gezien: {lastSeenLabel}</span>
                          </div>
                        </div>

                        <span className="text-[11px] font-mono tabular-nums text-[var(--forum-accent-hover)] shrink-0">
                          {member.reputation} rep
                        </span>
                      </div>
                      <p className="text-xs text-[var(--color-text-dim)] truncate">
                        {member.statusText}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 5. STEUN HET FORUM card */}
        <div className="surface">
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display font-bold text-sm text-[var(--color-text)]">
                Steun het forum
              </h3>
            </div>

            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
              Het forum draait op een gehuurde server. Wil je meebetalen aan de rekening? Elke euro helpt echt.
            </p>

            {/* Hosting goal progress */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-[var(--color-text-dim)]">Maanddoel hosting</span>
                <span className="font-mono tabular-nums font-medium text-[var(--color-text)]">
                  €{supportRaised} / €{supportGoal} ({supportPercentage}%)
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[var(--forum-border)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--forum-accent)] to-[var(--forum-accent-hover)] transition-all duration-300"
                  style={{ width: `${supportPercentage}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenSupport}
              className="w-full py-2 px-3.5 rounded-xl bg-[var(--forum-bg-elevated)] hover:bg-[var(--color-bg-hover)] border border-[var(--forum-border)] text-[var(--color-text)] text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Heart className="w-3.5 h-3.5 text-[var(--forum-accent-hover)]" />
              <span>Bijdragen</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Top Contributors Full Leaderboard Modal */}
      {leaderboardOpen && (
        <div
          className="fixed inset-0 z-[var(--z-modal-backdrop)] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs forum-modal-overlay"
          onClick={() => setLeaderboardOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Top Contributors Klassement"
            className="w-full max-w-xl max-h-[88vh] flex flex-col surface shadow-[var(--shadow-xl)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[var(--forum-border)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Trophy className="w-5 h-5 text-[var(--forum-accent-hover)]" />
                <div>
                  <h2 className="font-display font-bold text-lg text-[var(--color-text)]">
                    Ranglijst
                  </h2>
                  <p className="text-xs text-[var(--color-text-dim)]">
                    Wie het meest helpt, staat bovenaan.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setLeaderboardOpen(false)}
                aria-label="Sluiten"
                className="w-8 h-8 rounded-lg bg-[var(--forum-bg-elevated)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-dim)] flex items-center justify-center cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Leaderboard list */}
              <div className="divide-y divide-[var(--forum-border)] border border-[var(--forum-border)] rounded-xl overflow-hidden">
                {topContributors.map((member, index) => {
                  const isMe =
                    currentUser?.id === member.id || currentUser?.name === member.name;
                  return (
                    <div
                      key={member.id}
                      className={`p-3.5 flex items-center justify-between gap-3 ${
                        isMe
                          ? 'bg-[var(--color-brand-muted)]'
                          : 'bg-[var(--forum-bg-card)]'
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
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-[var(--color-text-inverse)] shrink-0"
                          style={{ backgroundColor: member.avatarColor }}
                        >
                          {member.initials}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center flex-wrap gap-1.5">
                            <span className="text-sm font-semibold text-[var(--color-text)] truncate">
                              {member.name}
                              {isMe ? ' (jij)' : ''}
                            </span>
                            <span className="text-xs text-[var(--forum-accent)] font-medium shrink-0">
                              {member.role}
                            </span>
                          </div>
                          <div className="mt-1">
                            <UserBadges member={member} maxVisible={3} variant="full" />
                          </div>
                          <div className="text-xs text-[var(--color-text-dim)] flex items-center flex-wrap gap-1.5 mt-1">
                            <span className="tabular-nums">{member.postsCount} bijdragen</span>
                          </div>
                          {(member.githubHandle || member.discordHandle) && (
                            <div className="flex items-center flex-wrap gap-1.5 mt-1">
                              {member.githubHandle && (
                                <a
                                  href={`https://github.com/${member.githubHandle}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--forum-bg-elevated)] text-[10px] font-mono text-[var(--color-text-dim)] hover:underline"
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
                        <div className="font-mono font-bold text-sm tabular-nums text-[var(--forum-accent-hover)]">
                          {member.reputation} rep
                        </div>
                        <div className="text-[11px] text-[var(--color-text-dim)]">
                          Sinds {member.joinedAt}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Point incentives breakdown */}
              <div className="p-4 rounded-xl bg-[var(--forum-bg-elevated)] border border-[var(--forum-border)]">
                <div className="text-xs font-semibold text-[var(--color-text)] mb-2">
                  Zo verdien je punten:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[var(--color-text-muted)]">
                  <div className="flex items-center justify-between">
                    <span>Beste Antwoord / Showcase project</span>
                    <span className="font-mono font-semibold text-[var(--forum-accent-hover)]">
                      +15 rep
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Nieuw topic starten</span>
                    <span className="font-mono font-semibold text-[var(--forum-accent-hover)]">
                      +10 rep
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Reactie onder een topic</span>
                    <span className="font-mono font-semibold text-[var(--forum-accent-hover)]">
                      +5 rep
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Live chat bericht of like</span>
                    <span className="font-mono font-semibold text-[var(--forum-accent-hover)]">
                      +2 rep
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[var(--forum-border)] bg-[var(--forum-bg-elevated)] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setLeaderboardOpen(false);
                  onNavigate('profile');
                }}
                className="text-xs font-semibold text-[var(--forum-accent)] hover:underline cursor-pointer"
              >
                Naar profiel & badges
              </button>

              <button
                type="button"
                onClick={() => setLeaderboardOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-[var(--forum-accent)] hover:bg-[var(--forum-accent-hover)] text-[var(--color-text-inverse)] text-xs font-semibold cursor-pointer"
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