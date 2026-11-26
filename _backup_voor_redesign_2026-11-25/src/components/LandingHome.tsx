import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Award,
  Layers,
  Megaphone,
  MessageSquareText,
  Palette,
} from 'lucide-react';
import {
  CommunityPoll,
  GalleryProject,
  Member,
  NavTab,
  NewsItem,
  Topic,
} from '../types/forum';
import { UserBadges } from './UserBadges';

interface LandingHomeProps {
  topics: Topic[];
  galleryProjects: GalleryProject[];
  news: NewsItem[];
  members: Member[];
  poll: CommunityPoll;
  selectedPollOption: string | null;
  onVotePoll: (optionId: string) => void;
  onNavigate: (tab: NavTab) => void;
  onOpenTopicInForum: (topicId: string) => void;
}

export const LandingHome: React.FC<LandingHomeProps> = ({
  topics,
  galleryProjects,
  news,
  members,
  poll,
  selectedPollOption,
  onVotePoll,
  onNavigate,
  onOpenTopicInForum,
}) => {
  const topHelpers = useMemo(
    () => [...members].sort((a, b) => b.reputation - a.reputation).slice(0, 4),
    [members]
  );

  const totalPollVotes = useMemo(
    () => poll.options.reduce((sum, opt) => sum + opt.votes, 0),
    [poll.options]
  );

  const [animatedPollPcts, setAnimatedPollPcts] = useState<Record<string, number>>(() =>
    Object.fromEntries(poll.options.map((opt) => [opt.id, 0]))
  );
  const currentAnimatedPctsRef = useRef<Record<string, number>>(
    Object.fromEntries(poll.options.map((opt) => [opt.id, 0]))
  );

  useEffect(() => {
    if (!selectedPollOption) {
      const zeroMap = Object.fromEntries(poll.options.map((opt) => [opt.id, 0]));
      currentAnimatedPctsRef.current = zeroMap;
      setAnimatedPollPcts(zeroMap);
      return;
    }

    const startMap: Record<string, number> = {};
    const targetMap: Record<string, number> = {};
    poll.options.forEach((opt) => {
      startMap[opt.id] = currentAnimatedPctsRef.current[opt.id] ?? 0;
      targetMap[opt.id] =
        totalPollVotes > 0 ? Math.round((opt.votes / totalPollVotes) * 100) : 0;
    });

    const durationMs = 680;
    const startTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);

      const nextMap: Record<string, number> = {};
      poll.options.forEach((opt) => {
        const from = startMap[opt.id];
        const to = targetMap[opt.id];
        nextMap[opt.id] = Math.round(from + (to - from) * eased);
      });

      currentAnimatedPctsRef.current = nextMap;
      setAnimatedPollPcts(nextMap);

      if (t < 1) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [selectedPollOption, poll.options, totalPollVotes]);

  return (
    <div className="space-y-6">
      {/* Main Platform Startpagina Hero */}
      <section className="bg-white dark:bg-[#13111c] forum-hero-glow border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 sm:p-8">
        <div className="max-w-2xl">
          <h1 className="font-display font-extrabold text-2xl sm:text-4xl text-slate-900 dark:text-white tracking-tight text-balance">
            Hoi! Fijn dat je er bent.
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-[#9c96b2] leading-relaxed mt-3">
            Een klein forum voor mensen die graag dingen bouwen. Stel je vraag, laat zien waar je
            mee bezig bent of kom gewoon even kletsen in de chat hieronder.
          </p>

          <div className="flex items-center flex-wrap gap-3 mt-6">
            <button
              type="button"
              onClick={() => onNavigate('forum')}
              className="px-5 py-2.5 rounded-xl bg-[#e8b353] hover:bg-[#f0be63] text-[#141008] text-sm font-bold inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>Naar het forum</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#1b1828] hover:bg-slate-200 dark:hover:bg-[#231f33] border border-slate-200 dark:border-white/[0.09] text-slate-800 dark:text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Palette className="w-4 h-4 text-[#a88bfa]" />
              <span>Mijn profiel</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('gallery')}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#1b1828] hover:bg-slate-200 dark:hover:bg-[#231f33] border border-slate-200 dark:border-white/[0.09] text-slate-800 dark:text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Layers className="w-4 h-4 text-[#a88bfa]" />
              <span>Projecten</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3 Quick Navigation Portal Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('forum')}
          className="text-left bg-white dark:bg-[#13111c] hover:border-[#a88bfa]/50 border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 transition-colors group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <MessageSquareText className="w-5 h-5 text-[#a88bfa]" />
          </div>
          <h2 className="font-display font-bold text-base text-slate-900 dark:text-white mt-3 group-hover:text-violet-600 dark:group-hover:text-[#a88bfa]">
            Forum
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-[#9690ab] mt-1 leading-relaxed">
            {topics.length} topics. Vragen, tips en af en toe een flinke discussie.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('gallery')}
          className="text-left bg-white dark:bg-[#13111c] hover:border-[#a88bfa]/50 border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 transition-colors group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <Layers className="w-5 h-5 text-[#e8b353]" />
          </div>
          <h2 className="font-display font-bold text-base text-slate-900 dark:text-white mt-3 group-hover:text-violet-600 dark:group-hover:text-[#a88bfa]">
            Projecten
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-[#9690ab] mt-1 leading-relaxed">
            {galleryProjects.length} dingen die leden gemaakt hebben. Klik erop en probeer ze uit.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('news')}
          className="text-left bg-white dark:bg-[#13111c] hover:border-[#a88bfa]/50 border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 transition-colors group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <Megaphone className="w-5 h-5 text-emerald-400" />
          </div>
          <h2 className="font-display font-bold text-base text-slate-900 dark:text-white mt-3 group-hover:text-violet-600 dark:group-hover:text-[#a88bfa]">
            Nieuws
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-[#9690ab] mt-1 leading-relaxed">
            {news.length} berichten over wat er verandert op het forum en wat we van plan zijn.
          </p>
        </button>
      </section>

      {/* Split Snapshot: Recent Discussions + Top Helpers with Automatic Badges */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">
              Laatste topics
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('forum')}
              className="text-xs font-semibold text-violet-600 dark:text-[#a88bfa] hover:underline cursor-pointer"
            >
              Alles bekijken
            </button>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-white/[0.06]">
            {topics.slice(0, 3).map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => onOpenTopicInForum(topic.id)}
                className="w-full text-left py-3 first:pt-1 last:pb-1 group cursor-pointer block"
              >
                <div className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-[#a88bfa] transition-colors line-clamp-1">
                  {topic.title}
                </div>
                <div className="text-xs text-slate-500 dark:text-[#86809e] mt-1.5 flex items-center flex-wrap gap-1.5">
                  <span className="font-medium text-slate-700 dark:text-[#cfc9e6]">
                    {topic.authorName}
                  </span>
                  <UserBadges
                    authorName={topic.authorName}
                    onlineMembers={members}
                    maxVisible={2}
                    showOverflowCount={false}
                  />
                  <span aria-hidden="true">·</span>
                  <span className="text-violet-600 dark:text-[#a88bfa]">
                    {topic.categoryLabel}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{topic.replies.length} reacties</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-[#e8b353]" />
              <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">
                Behulpzaamste leden
              </h2>
            </div>
          </div>

          <div className="space-y-3">
            {topHelpers.map((helper, idx) => (
              <div key={helper.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xs font-mono tabular-nums text-slate-400 dark:text-[#6e6885] w-4">
                    {idx + 1}.
                  </span>
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-[#0f0c18] shrink-0"
                    style={{ backgroundColor: helper.avatarColor }}
                  >
                    {helper.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center flex-wrap gap-1.5">
                      <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {helper.name}
                      </span>
                    </div>
                    <div className="mt-0.5">
                      <UserBadges member={helper} maxVisible={2} />
                    </div>
                  </div>
                </div>

                <span className="text-xs font-mono font-semibold tabular-nums text-[#d99b26] dark:text-[#e8b353] shrink-0">
                  {helper.reputation} rep
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Interactive Poll with Smooth Rising Bar Animation also accessible directly on / */}
      <section className="bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3.5">
          <div>
            <span className="text-xs font-semibold text-[#d99b26] dark:text-[#e8b353]">
              Peiling van de week
            </span>
            <h3 className="font-display font-bold text-sm sm:text-base text-slate-900 dark:text-white mt-0.5">
              {poll.question}
            </h3>
          </div>
          <span className="text-xs text-slate-400 dark:text-[#756f8c] tabular-nums shrink-0">
            {totalPollVotes} stemmen · {poll.closesIn}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {poll.options.map((option) => {
            const pct = totalPollVotes > 0 ? Math.round((option.votes / totalPollVotes) * 100) : 0;
            const displayPct = selectedPollOption ? (animatedPollPcts[option.id] ?? pct) : 0;
            const isSelected = selectedPollOption === option.id;
            const hasVoted = Boolean(selectedPollOption);

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onVotePoll(option.id)}
                aria-pressed={isSelected}
                className={`group relative overflow-hidden text-left px-3.5 py-3 rounded-xl border transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? 'border-[#a88bfa]/65 bg-[#a88bfa]/[0.07] shadow-xs'
                    : 'border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-[#181524] hover:border-slate-300 dark:hover:border-white/[0.15]'
                }`}
              >
                <div
                  className={`poll-result-bar pointer-events-none absolute inset-y-0 left-0 ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#a88bfa]/28 via-[#a88bfa]/20 to-[#e8b353]/20'
                      : 'bg-slate-200/75 dark:bg-white/[0.05]'
                  }`}
                  style={{
                    width: hasVoted ? `${pct}%` : '0%',
                    opacity: hasVoted ? 1 : 0,
                  }}
                  aria-hidden="true"
                />

                <div
                  className={`poll-result-bar pointer-events-none absolute bottom-0 left-0 h-0.5 ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#a88bfa] to-[#e8b353]'
                      : 'bg-slate-300 dark:bg-white/[0.14]'
                  }`}
                  style={{
                    width: hasVoted ? `${pct}%` : '0%',
                    opacity: hasVoted ? 1 : 0,
                  }}
                  aria-hidden="true"
                />

                <div className="relative flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 transition-all duration-300 ${
                        isSelected
                          ? 'bg-[#e8b353] scale-110 ring-2 ring-[#e8b353]/30'
                          : 'bg-slate-300 dark:bg-white/[0.16] group-hover:bg-[#a88bfa]/60'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 leading-snug">
                      {option.label}
                    </span>
                  </div>

                  <div
                    className={`flex items-center gap-1.5 shrink-0 transition-all duration-300 ${
                      hasVoted
                        ? 'opacity-100 translate-x-0'
                        : 'opacity-0 translate-x-2 pointer-events-none'
                    }`}
                  >
                    <span className="text-[11px] font-mono tabular-nums text-slate-400 dark:text-[#86809e] hidden sm:inline">
                      ({option.votes})
                    </span>
                    <span
                      className={`text-xs font-mono font-bold tabular-nums px-1.5 py-0.5 rounded-md ${
                        isSelected
                          ? 'bg-[#a88bfa]/20 text-violet-700 dark:text-[#e2d6ff]'
                          : 'text-slate-600 dark:text-[#b2acc7]'
                      }`}
                    >
                      {displayPct}%
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
