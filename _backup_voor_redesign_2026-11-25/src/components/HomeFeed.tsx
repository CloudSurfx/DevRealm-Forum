import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  Code2,
  Heart,
  HelpCircle,
  Inbox,
  Layers,
  MessageSquare,
  Pin,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import { CATEGORIES } from '../data/forumData';
import { CategoryId, CommunityPoll, GalleryProject, Member, Topic } from '../types/forum';
import { LiveProjectPreviewFrame } from './ProjectGallery';
import { UserBadges } from './UserBadges';

/** Eigen kleur + icoon per board, als een klassieke forum board-index (zie .board-tile in index.css). */
const CATEGORY_META: Record<string, { icon: React.FC<{ className?: string }>; color: string }> = {
  all: { icon: Layers, color: '#7c5cf0' },
  algemeen: { icon: MessageSquare, color: '#3d6fd6' },
  development: { icon: Code2, color: '#0e7a72' },
  hulp: { icon: HelpCircle, color: '#a8417a' },
  tutorials: { icon: BookOpen, color: '#b97e08' },
  requests: { icon: Inbox, color: '#e4583a' },
  'react-vue': { icon: Sparkles, color: '#2a6fdb' },
  showcase: { icon: Heart, color: '#1e8e4e' },
};

interface HomeFeedProps {
  topics: Topic[];
  galleryProjects: GalleryProject[];
  onlineMembers?: Member[];
  poll: CommunityPoll;
  selectedPollOption: string | null;
  onVotePoll: (optionId: string) => void;
  onSelectTopic: (topic: Topic) => void;
  onToggleTopicVote: (topicId: string) => void;
  onSelectProject: (project: GalleryProject) => void;
  onToggleProjectLike: (projectId: string) => void;
  onOpenNewTopic: () => void;
  onScrollToChat: () => void;
  onViewAllTopics: () => void;
  onViewGallery: () => void;
  /** Bord waarop de feed moet filteren bij binnenkomst (bv. vanuit de klassieke board-index). */
  initialCategory?: CategoryId;
}

export const HomeFeed: React.FC<HomeFeedProps> = ({
  topics,
  galleryProjects,
  onlineMembers = [],
  poll,
  selectedPollOption,
  onVotePoll,
  onSelectTopic,
  onToggleTopicVote,
  onSelectProject,
  onToggleProjectLike,
  onOpenNewTopic,
  onScrollToChat,
  onViewAllTopics,
  onViewGallery,
  initialCategory,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<CategoryId>(initialCategory ?? 'all');
  useEffect(() => {
    if (initialCategory) setCategoryFilter(initialCategory);
  }, [initialCategory]);
  const [sortBy, setSortBy] = useState<'active' | 'popular'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTopics = useMemo(() => {
    return topics
      .filter((topic) => {
        if (categoryFilter !== 'all' && topic.category !== categoryFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            topic.title.toLowerCase().includes(q) ||
            topic.excerpt.toLowerCase().includes(q) ||
            topic.authorName.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        if (sortBy === 'popular') return b.votes - a.votes;
        return 0;
      });
  }, [topics, categoryFilter, sortBy, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    topics.forEach((topic) => {
      counts[topic.category] = (counts[topic.category] ?? 0) + 1;
    });
    return counts;
  }, [topics]);

  const totalPollVotes = useMemo(
    () => poll.options.reduce((sum, opt) => sum + opt.votes, 0),
    [poll.options]
  );

  // Smoothly interpolate displayed poll percentages when a user casts or switches a vote
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
      // Cubic ease-out matching cubic-bezier(0.22, 1, 0.36, 1)
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

  const totalRepliesToday = useMemo(
    () => topics.reduce((sum, t) => sum + t.replies.length, 0),
    [topics]
  );

  return (
    <div className="space-y-5">
      {/* 1. Community Welcome Hero Banner */}
      <section className="bg-white dark:bg-[#13111c] forum-hero-glow border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 sm:p-7">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-xl">
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight text-balance">
              Wat speelt er?
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-[#9c96b2] leading-relaxed mt-2.5">
              Lees mee, reageer of begin zelf een topic. Twijfel je of je vraag te simpel is?
              Stel hem gewoon, zo leren we allemaal.
            </p>

            <div className="flex items-center flex-wrap gap-3 mt-5">
              <button
                type="button"
                onClick={onOpenNewTopic}
                className="px-4 py-2.5 rounded-xl bg-[#a88bfa] hover:bg-[#b79dff] text-[#0f0c18] text-sm font-semibold inline-flex items-center gap-2 transition-colors duration-150 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Nieuw topic</span>
              </button>

              <button
                type="button"
                onClick={onScrollToChat}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#1b1828] hover:bg-slate-200 dark:hover:bg-[#231f33] border border-slate-200 dark:border-white/[0.09] text-slate-800 dark:text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors duration-150 cursor-pointer whitespace-nowrap"
              >
                <span>Naar de chat</span>
                <ArrowDown className="w-4 h-4 text-[#e8b353]" />
              </button>
            </div>
          </div>

          {/* Crisp Community Metrics Strip */}
          <div className="grid grid-cols-3 lg:grid-cols-1 gap-3 lg:gap-2.5 lg:min-w-[175px] pt-4 lg:pt-0 lg:pl-6 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-white/[0.07]">
            <div>
              <div className="text-xs text-slate-500 dark:text-[#86809e]">Topics</div>
              <div className="font-display font-bold text-xl text-slate-900 dark:text-white tabular-nums">
                {topics.length}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-[#86809e]">Projecten</div>
              <div className="font-display font-bold text-xl text-slate-900 dark:text-white tabular-nums">
                {galleryProjects.length}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-[#86809e]">Reacties</div>
              <div className="font-display font-bold text-xl text-emerald-600 dark:text-emerald-400 tabular-nums">
                {totalRepliesToday}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Actieve Discussies & Category Filter */}
      <section className="bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.08] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-white/[0.07] space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                Recente discussies
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#86809e] mt-0.5">
                Nieuwste activiteit bovenaan.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-52">
                <Search className="w-3.5 h-3.5 text-slate-400 dark:text-[#756f8c] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Zoek topics..."
                  className="w-full h-9 pl-8 pr-3 rounded-xl bg-slate-100/80 dark:bg-[#1a1726] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#6e6885] focus:outline-none focus:ring-2 focus:ring-[#a88bfa]/60"
                />
              </div>

              <button
                type="button"
                onClick={onViewAllTopics}
                className="text-xs font-semibold text-violet-600 dark:text-[#a88bfa] hover:underline whitespace-nowrap shrink-0 px-2 py-1.5 cursor-pointer"
              >
                Alles bekijken
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CATEGORIES.map((cat) => {
              const meta = CATEGORY_META[cat.id] ?? CATEGORY_META.all;
              const Icon = meta.icon;
              const active = categoryFilter === cat.id;
              const count = cat.id === 'all' ? topics.length : (categoryCounts[cat.id] ?? 0);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  data-active={active}
                  style={{ ['--k' as string]: meta.color } as React.CSSProperties}
                  className="board-tile flex items-center gap-2.5 px-3 py-2.5 text-left cursor-pointer"
                >
                  <span className="board-tile-icon w-9 h-9 rounded-lg flex items-center justify-center shrink-0">
                    <Icon className="w-[18px] h-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="board-tile-name block text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {cat.label}
                    </span>
                    <span className="block text-[11px] text-slate-500 dark:text-[#86809e] tabular-nums font-mono">
                      {count} {count === 1 ? 'topic' : 'topics'}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#191625] border border-slate-200/80 dark:border-white/[0.05] w-fit ml-auto">
              <button
                type="button"
                onClick={() => setSortBy('active')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  sortBy === 'active'
                    ? 'bg-white dark:bg-[#262138] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-[#8d87a4]'
                }`}
              >
                Actief
              </button>
              <button
                type="button"
                onClick={() => setSortBy('popular')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  sortBy === 'popular'
                    ? 'bg-white dark:bg-[#262138] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-[#8d87a4]'
                }`}
              >
                Populair
              </button>
            </div>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-white/[0.06]">
          {filteredTopics.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Geen discussies gevonden voor deze selectie.
              </p>
              <p className="text-xs text-slate-500 dark:text-[#86809e] mt-1">
                Pas je zoekterm aan of start zelf een nieuw topic.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('all');
                  setSearchQuery('');
                }}
                className="mt-4 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#1b1828] text-xs font-semibold text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-[#242035] cursor-pointer"
              >
                Filters wissen
              </button>
            </div>
          ) : (
            filteredTopics.slice(0, 4).map((topic) => (
              <article
                key={topic.id}
                className="px-5 py-4 hover:bg-slate-50/90 dark:hover:bg-white/[0.02] transition-colors flex items-start gap-3.5"
              >
                <button
                  type="button"
                  onClick={() => onToggleTopicVote(topic.id)}
                  aria-label={`Stem op ${topic.title}`}
                  className={`w-11 py-1.5 rounded-xl border flex flex-col items-center justify-center shrink-0 transition-colors cursor-pointer ${
                    topic.votedByMe
                      ? 'bg-[#a88bfa]/15 border-[#a88bfa]/50 text-violet-700 dark:text-[#c7b5ff]'
                      : 'bg-slate-50 dark:bg-[#181524] border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-[#8d87a4] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  <span className="text-xs font-mono font-semibold tabular-nums mt-0.5">
                    {topic.votes}
                  </span>
                </button>

                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => onSelectTopic(topic)}
                    className="text-left group cursor-pointer block w-full"
                  >
                    <h3 className="font-display font-semibold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-[#a88bfa] transition-colors leading-snug">
                      {topic.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-[#9690ab] line-clamp-2 mt-1 leading-relaxed">
                      {topic.excerpt}
                    </p>
                  </button>

                  <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-[#7c7694] mt-2.5">
                    <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-[#cfc9e6]">
                      <span
                        className="w-4 h-4 rounded-sm inline-flex items-center justify-center text-[9px] font-bold text-[#0f0c18]"
                        style={{ backgroundColor: topic.authorColor }}
                      >
                        {topic.authorInitials}
                      </span>
                      <span>{topic.authorName}</span>
                    </span>
                    <UserBadges
                      authorName={topic.authorName}
                      onlineMembers={onlineMembers}
                      maxVisible={2}
                      showOverflowCount={false}
                    />

                    <span aria-hidden="true">·</span>
                    <span className="text-violet-600 dark:text-[#a88bfa] font-medium">
                      {topic.categoryLabel}
                    </span>

                    <span aria-hidden="true">·</span>
                    <span>{topic.lastActivity}</span>

                    {(topic.codeSnippet || topic.replies.some((r) => r.codeSnippet)) && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-300 font-medium">
                          <Code2 className="w-3 h-3" />
                          Code-snippet
                        </span>
                      </>
                    )}

                    {topic.pinned && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 text-[#d99b26] dark:text-[#e8b353] font-medium">
                          <Pin className="w-3 h-3" />
                          Vastgezet
                        </span>
                      </>
                    )}

                    {topic.solved && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          Opgelost
                        </span>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => onSelectTopic(topic)}
                      className="ml-auto inline-flex items-center gap-1.5 text-slate-500 dark:text-[#9c96b2] hover:text-slate-900 dark:hover:text-white font-medium cursor-pointer tabular-nums"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{topic.replies.length}</span>
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {/* 3. Uitgelichte Project-galerij met Live Previews */}
      <section className="bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#a88bfa]" />
            <div>
              <h2 className="font-display font-bold text-base text-slate-900 dark:text-white leading-tight">
                Projecten van leden
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#86809e]">
                Klik erop en probeer ze meteen uit.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onViewGallery}
            className="text-xs font-semibold text-violet-600 dark:text-[#a88bfa] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            Alle projecten
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {galleryProjects.slice(0, 2).map((project) => (
            <div
              key={project.id}
              className="rounded-xl border border-slate-200 dark:border-white/[0.08] overflow-hidden bg-slate-50/70 dark:bg-[#161321] flex flex-col"
            >
              <div className="h-[168px] border-b border-slate-200 dark:border-white/[0.07]">
                <LiveProjectPreviewFrame project={project} />
              </div>

              <div className="p-3.5 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onSelectProject(project)}
                  className="text-left min-w-0 group cursor-pointer"
                >
                  <div className="font-display font-bold text-sm text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-[#a88bfa] truncate">
                    {project.title}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-[#86809e] truncate mt-0.5">
                    {project.authorName} · {project.stack}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleProjectLike(project.id)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs cursor-pointer shrink-0 ${
                    project.likedByMe
                      ? 'bg-[#a88bfa]/20 text-violet-700 dark:text-[#c7b5ff]'
                      : 'text-slate-500 dark:text-[#86809e] hover:bg-slate-200/60 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${project.likedByMe ? 'fill-current' : ''}`} />
                  <span className="tabular-nums font-medium">{project.likes}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Compacte Peiling van de Week */}
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
                {/* Always-mounted background fill bar so width smoothly rises from 0% -> pct% and slides between votes */}
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

                {/* Smooth rising bottom accent progress line */}
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
