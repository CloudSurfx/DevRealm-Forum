import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Award,
  Layers,
  Megaphone,
  MessageSquareText,
  Palette,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
  Rocket,
  Target,
  BarChart2,
  Code2,
  Heart,
  BookOpen,
  HelpCircle,
  Inbox,
  GitBranch,
  Globe,
  Shield,
  Star,
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

  const recentTopics = useMemo(() => topics.slice(0, 4), [topics]);
  const latestNews = useMemo(() => news.slice(0, 3), [news]);

  const featureCards = [
    {
      icon: MessageSquareText,
      iconColor: 'text-[var(--forum-accent)]',
      title: 'Forum',
      count: topics.length,
      desc: 'Vragen, tips & discussies',
      tab: 'forum' as NavTab,
      gradient: 'from-[var(--forum-accent)] to-[var(--forum-accent-2)]',
      iconBg: 'from-[var(--forum-accent)]/10 to-[var(--forum-accent-2)]/10',
    },
    {
      icon: Layers,
      iconColor: 'text-amber-400',
      title: 'Projecten',
      count: galleryProjects.length,
      desc: 'Dingen die leden maakten',
      tab: 'gallery' as NavTab,
      gradient: 'from-amber-400 to-emerald-400',
      iconBg: 'from-amber-400/10 to-emerald-400/10',
    },
    {
      icon: Megaphone,
      iconColor: 'text-emerald-400',
      title: 'Nieuws',
      count: news.length,
      desc: 'Updates & aankondigingen',
      tab: 'news' as NavTab,
      gradient: 'from-emerald-400 to-blue-400',
      iconBg: 'from-emerald-400/10 to-blue-400/10',
    },
  ];

  const statCards = [
    { icon: MessageSquareText, value: topics.length, label: 'Topics', color: 'text-[var(--forum-accent)]' },
    { icon: Users, value: members.length, label: 'Leden', color: 'text-amber-400' },
    { icon: Layers, value: galleryProjects.length, label: 'Projecten', color: 'text-emerald-400' },
    { icon: Megaphone, value: news.length, label: 'Nieuws', color: 'text-blue-400' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-y-2 duration-300">
      {/* Hero — distinctive dark terminal-inspired design */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[var(--forum-bg-card)] via-[var(--forum-bg-elevated)] to-[var(--forum-bg-card)] border border-[var(--forum-accent)]/10 dark:border-white/[0.06] rounded-3xl p-6 sm:p-8 lg:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,var(--forum-accent)_0%,transparent_40%)] opacity-[0.03]" aria-hidden="true" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,var(--forum-accent-2)_0%,transparent_40%)] opacity-[0.02]" aria-hidden="true" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--forum-accent)]/30 to-transparent" aria-hidden="true" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--forum-accent-2)]/20 to-transparent" aria-hidden="true" />

        <div className="relative max-w-4xl">
          {/* Terminal-style header */}
          <div className="flex items-center gap-2.5 text-xs font-mono text-[var(--forum-accent)]/70 mb-5">
            <span className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--forum-accent)] opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-[var(--forum-accent)]" />
            </span>
            <span className="tracking-wide uppercase">forum.init()</span>
            <span className="text-[var(--color-text-dim)]">// welkom op het forum</span>
          </div>

          <h1 className="font-display font-bold text-4xl sm:text-6xl lg:text-7xl leading-[1.05] text-[var(--color-text)] tracking-[-0.03em] text-balance max-w-3xl">
            Een plek voor <span className="bg-gradient-to-r bg-clip-text text-transparent from-[var(--forum-accent)] to-[var(--forum-accent-2)]">makers</span>.
          </h1>

          <p className="text-base sm:text-lg text-[var(--color-text-muted)] leading-relaxed mt-4 max-w-xl">
            Stel je vraag, laat zien waar je mee bezig bent of kom gewoon even kletsen in de live chat.
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-8">
            <button
              type="button"
              onClick={() => onNavigate('forum')}
              className="group relative inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[var(--forum-accent)] to-[var(--forum-accent-2)] hover:from-[var(--forum-accent-hover)] hover:to-[var(--forum-accent-2)] text-[var(--color-text-inverse)] text-sm font-semibold transition-all duration-300 cursor-pointer whitespace-nowrap shadow-lg shadow-[var(--color-brand-muted)] hover:shadow-[var(--color-brand-strong)]"
            >
              <span>Naar het forum</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="px-5 py-3.5 rounded-xl bg-[var(--forum-bg-elevated)]/80 backdrop-blur-sm hover:bg-[var(--color-bg-hover)] border border-[var(--forum-border)] text-[var(--color-text)] text-sm font-semibold inline-flex items-center gap-2 transition-all duration-300 cursor-pointer whitespace-nowrap"
            >
              <Palette className="w-4 h-4 text-[var(--forum-accent)]" />
              <span>Mijn profiel</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('gallery')}
              className="px-5 py-3.5 rounded-xl bg-[var(--forum-bg-elevated)]/80 backdrop-blur-sm hover:bg-[var(--color-bg-hover)] border border-[var(--forum-border)] text-[var(--color-text)] text-sm font-semibold inline-flex items-center gap-2 transition-all duration-300 cursor-pointer whitespace-nowrap"
            >
              <Layers className="w-4 h-4 text-[var(--forum-accent)]" />
              <span>Projecten</span>
            </button>
          </div>

          {/* Live activity pulse */}
          <div className="mt-8 flex flex-wrap items-center gap-6 pt-6 border-t border-[var(--forum-border)]">
            <div className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--color-brand-muted)] text-[var(--forum-accent)]">
                  <MessageSquareText className="w-5 h-5" />
                </div>
                <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[var(--forum-accent-2)] border-2 border-[var(--forum-bg-card)] dark:border-[var(--forum-bg-elevated)] animate-ping" aria-hidden="true" />
              </div>
              <div>
                <div className="font-display font-bold text-xl text-[var(--color-text)] tabular-nums">
                  {topics.length}
                </div>
                <div className="text-xs text-[var(--color-text-dim)]">Actieve discussies</div>
              </div>
            </div>
            <div className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--color-brand-muted)] text-[var(--forum-accent)]">
                  <Users className="w-5 h-5" />
                </div>
                <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[var(--forum-accent-2)] border-2 border-[var(--forum-bg-card)] dark:border-[var(--forum-bg-elevated)] animate-ping" style={{ animationDelay: '200ms' }} aria-hidden="true" />
              </div>
              <div>
                <div className="font-display font-bold text-xl text-[var(--color-text)] tabular-nums">
                  {members.length}
                </div>
                <div className="text-xs text-[var(--color-text-dim)]">Leden online</div>
              </div>
            </div>
            <div className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--color-brand-2-muted)] text-[var(--forum-accent-2)]">
                  <Zap className="w-5 h-5" />
                </div>
                <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[var(--forum-accent)] border-2 border-[var(--forum-bg-card)] dark:border-[var(--forum-bg-elevated)] animate-ping" style={{ animationDelay: '400ms' }} aria-hidden="true" />
              </div>
              <div>
                <div className="font-display font-bold text-xl text-[var(--color-text)] tabular-nums">
                  {topics.reduce((sum, t) => sum + t.replies.length, 0)}
                </div>
                <div className="text-xs text-[var(--color-text-dim)]">Reacties vandaag</div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative floating elements */}
        <div className="absolute right-6 bottom-6 opacity-20" aria-hidden="true">
          <Zap className="w-16 h-16 text-[var(--forum-accent)] rotate-12" />
        </div>
        <div className="absolute right-20 top-10 opacity-10" aria-hidden="true">
          <Rocket className="w-12 h-12 text-[var(--forum-accent-2)] -rotate-6" />
        </div>
        <div className="absolute left-10 bottom-20 opacity-10" aria-hidden="true">
          <Target className="w-10 h-10 text-[var(--forum-accent)]" />
        </div>
      </section>

      {/* Three feature portals — elevated cards with icon + stat + hover glow */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4" aria-label="Snelle navigatie">
        {featureCards.map(({ icon: Icon, iconColor, title, count, desc, tab, gradient, iconBg }) => (
          <button
            key={tab}
            type="button"
            onClick={() => onNavigate(tab)}
            className="group relative text-left surface surface-hover border border-[var(--forum-border)] rounded-2xl p-5 transition-all duration-300 cursor-pointer overflow-hidden"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${iconBg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} aria-hidden="true" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--forum-accent)]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true" />

            <div className="relative flex items-start justify-between">
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${gradient}/20 ${iconColor}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gradient-to-br from-[var(--forum-accent)]/20 to-[var(--forum-accent-2)]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true" />
            </div>

            <div className="relative mt-5">
              <h2 className="font-display font-bold text-lg text-[var(--color-text)] group-hover:text-[var(--forum-accent)] transition-colors">
                {title}
              </h2>
              <p className="text-sm text-[var(--color-text-muted)] mt-1.5 leading-relaxed">
                <span className="font-semibold text-[var(--color-text)]">{count}</span>{' '}
                {desc}
              </p>
            </div>

            <div className="relative mt-4 flex items-center gap-2 text-xs font-medium text-[var(--forum-accent)] opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
              <span>Bekijk</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        ))}
      </section>

      {/* Activity feed: recent topics + top helpers in a unified card */}
      <section className="surface surface-hover border border-[var(--forum-border)] rounded-2xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Recent topics */}
          <div className="p-5 border-r border-b lg:border-b-0 lg:border-r border-[var(--forum-border)]">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--color-brand-muted)] text-[var(--forum-accent)]">
                  <MessageSquareText className="w-4 h-4" />
                </div>
                <h2 className="font-display font-bold text-base text-[var(--color-text)]">
                  Laatste discussies
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('forum')}
                className="text-xs font-semibold text-[var(--forum-accent)] hover:underline cursor-pointer hidden sm:block flex items-center gap-1"
              >
                <span>Alles bekijken</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-[var(--forum-border)]">
              {recentTopics.length > 0 ? (
                recentTopics.map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => onOpenTopicInForum(topic.id)}
                    className="w-full text-left py-3.5 first:pt-1 last:pb-1 group cursor-pointer block transition-colors hover:bg-[var(--forum-bg-elevated)]/50 rounded-lg px-2 -ml-2 -mr-2"
                  >
                    <div className="text-sm font-semibold text-[var(--color-text)] group-hover:text-[var(--forum-accent)] transition-colors line-clamp-1">
                      {topic.title}
                    </div>
                    <div className="text-xs text-[var(--color-text-dim)] mt-2 flex items-center flex-wrap gap-2">
                      <span className="font-medium text-[var(--color-text-muted)] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--forum-accent)]" />
                        {topic.authorName}
                      </span>
                      <UserBadges
                        authorName={topic.authorName}
                        onlineMembers={members}
                        maxVisible={2}
                        showOverflowCount={false}
                      />
                      <span aria-hidden="true" className="text-[var(--color-text-dim)]">·</span>
                      <span className="px-2 py-0.5 rounded-full bg-[var(--color-brand-muted)] text-[var(--forum-accent)] text-xs font-medium">
                        {topic.categoryLabel}
                      </span>
                      <span aria-hidden="true" className="text-[var(--color-text-dim)]">·</span>
                      <span className="tabular-nums font-mono flex items-center gap-1">
                        <MessageSquareText className="w-3 h-3" />
                        {topic.replies.length}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="py-8 text-center text-sm text-[var(--color-text-muted)] flex flex-col items-center gap-2">
                  <MessageSquareText className="w-8 h-8 text-[var(--color-text-dim)]" />
                  <span>Nog geen topics. Wees de eerste!</span>
                </div>
              )}
            </div>
          </div>

          {/* Top helpers */}
          <div className="p-5 bg-gradient-to-br from-[var(--color-brand-muted)] via-transparent to-transparent">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--color-brand-strong)] text-[var(--forum-accent)]">
                  <Award className="w-4 h-4" />
                </div>
                <h2 className="font-display font-bold text-base text-[var(--color-text)]">
                  Top helpers
                </h2>
              </div>
            </div>

            <div className="space-y-3">
              {topHelpers.map((helper, idx) => (
                <div key={helper.id} className="flex items-center justify-between gap-3 group">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono tabular-nums text-[var(--color-text-dim)] w-6 text-center group-hover:text-[var(--forum-accent)] transition-colors">
                      {idx + 1}
                    </span>
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold text-[var(--color-text-inverse)] shrink-0 relative overflow-hidden"
                      style={{ backgroundColor: helper.avatarColor }}
                    >
                      {helper.initials}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center flex-wrap gap-1.5">
                        <span className="text-sm font-medium text-[var(--color-text)] truncate">
                          {helper.name}
                        </span>
                      </div>
                      <div className="mt-1">
                        <UserBadges member={helper} maxVisible={2} />
                      </div>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-semibold tabular-nums text-[var(--forum-accent)] bg-[var(--color-brand-muted)] px-2 py-1 rounded-lg shrink-0">
                    {helper.reputation} rep
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Weekly poll — full width, prominent with animated bars */}
      <section className="surface surface-hover border border-[var(--forum-border)] rounded-2xl p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--forum-accent)]/30 to-transparent" aria-hidden="true" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 relative">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--color-brand-muted)] text-[var(--forum-accent)]">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-[var(--forum-accent)] dark:text-[var(--forum-accent-hover)]">
                Peiling van de week
              </span>
              <h3 className="font-display font-bold text-sm sm:text-base text-[var(--color-text)] mt-0.5">
                {poll.question}
              </h3>
            </div>
          </div>
          <span className="text-xs text-[var(--color-text-dim)] tabular-nums shrink-0 flex items-center gap-1">
            <BarChart2 className="w-3 h-3" />
            {totalPollVotes} stemmen · {poll.closesIn}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                className={`group relative overflow-hidden text-left px-4 py-3.5 rounded-xl border transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? 'border-[var(--forum-accent)]/65 bg-[var(--color-brand-muted)] shadow-[0_0_0_1px_var(--forum-accent)]'
                    : 'border-[var(--forum-border)] bg-[var(--forum-bg-elevated)]/70 hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-hover)]'
                }`}
              >
                {/* Background fill bar */}
                <div
                  className={`poll-result-bar pointer-events-none absolute inset-y-0 left-0 ${
                    isSelected
                      ? 'bg-gradient-to-r from-[var(--forum-accent)]/25 via-[var(--forum-accent)]/15 to-[var(--forum-accent-2)]/15'
                      : 'bg-[var(--forum-border)]/75'
                  }`}
                  style={{
                    width: hasVoted ? `${pct}%` : '0%',
                    opacity: hasVoted ? 1 : 0,
                  }}
                  aria-hidden="true"
                />

                {/* Bottom accent line */}
                <div
                  className={`poll-result-bar pointer-events-none absolute bottom-0 left-0 h-[3px] ${
                    isSelected
                      ? 'bg-gradient-to-r from-[var(--forum-accent)] to-[var(--forum-accent-2)]'
                      : 'bg-[var(--forum-border)]'
                  }`}
                  style={{
                    width: hasVoted ? `${pct}%` : '0%',
                    opacity: hasVoted ? 1 : 0,
                  }}
                  aria-hidden="true"
                />

                <div className="relative flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-3">
                    <span
                      className={`w-3 h-3 rounded-full shrink-0 transition-all duration-300 flex-shrink-0 ${
                        isSelected
                          ? 'bg-[var(--forum-accent-2)] scale-110 ring-2 ring-[var(--forum-accent-2)]/30 shadow-[0_0_8px_var(--forum-accent)]'
                          : 'bg-[var(--forum-border)] group-hover:bg-[var(--forum-accent)]/60'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="text-sm font-medium text-[var(--color-text)] leading-snug">
                      {option.label}
                    </span>
                  </div>

                  <div
                    className={`flex items-center gap-2 shrink-0 transition-all duration-300 ${
                      hasVoted
                        ? 'opacity-100 translate-x-0'
                        : 'opacity-0 translate-x-2 pointer-events-none'
                    }`}
                  >
                    <span className="text-[11px] font-mono tabular-nums text-[var(--color-text-dim)] hidden sm:inline">
                      ({option.votes})
                    </span>
                    <span
                      className={`text-xs font-mono font-bold tabular-nums px-2 py-1 rounded-md ${
                        isSelected
                          ? 'bg-[var(--color-brand-muted)] text-[var(--forum-accent)]'
                          : 'bg-[var(--forum-border)] text-[var(--color-text-dim)]'
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

        {selectedPollOption && (
          <div className="mt-4 p-3 bg-gradient-to-r from-[var(--color-brand-muted)] to-[var(--color-brand-2-muted)] rounded-xl border border-[var(--forum-accent)]/20 flex items-center gap-2 text-sm text-[var(--color-text)]">
            <Sparkles className="w-4 h-4 text-[var(--forum-accent)]" />
            <span>Bedankt voor je stem! De resultaten zijn direct zichtbaar.</span>
          </div>
        )}
      </section>

      {/* Quick stats bar — elevated with icons */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3" aria-label="Forum statistieken">
        {statCards.map(({ icon: Icon, value, label, color }, i) => (
          <div
            key={label}
            className="group relative surface surface-hover border border-[var(--forum-border)] rounded-xl p-4 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--forum-accent)]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--forum-accent)]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true" />

            <div className="relative flex flex-col items-center text-center gap-2">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br ${color}/10 ${color} group-hover:scale-105 transition-transform duration-300`}>
                <Icon className="w-5.5 h-5.5" />
              </div>
              <div className="font-display font-bold text-2xl text-[var(--color-text)] tabular-nums group-hover:text-[var(--forum-accent)] transition-colors">
                {value}
              </div>
              <div className="text-xs text-[var(--color-text-dim)] font-medium">{label}</div>
            </div>
          </div>
        ))}
      </section>

      {/* CTA Section — subtle nudge to join */}
      <section className="relative bg-gradient-to-br from-[var(--color-brand-muted)] via-transparent to-[var(--color-brand-2-muted)] border border-[var(--forum-border)] rounded-2xl p-6 sm:p-8 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,var(--forum-accent)_0%,transparent_50%)] opacity-[0.05]" aria-hidden="true" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,var(--forum-accent-2)_0%,transparent_50%)] opacity-[0.05]" aria-hidden="true" />

        <div className="relative max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-brand-muted)] text-[var(--forum-accent)] text-xs font-semibold mb-4">
            <Zap className="w-3 h-3" />
            <span>Nieuw? Maak mee!</span>
          </div>
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-[var(--color-text)] mb-3">
            Klaar om deel te nemen?
          </h2>
          <p className="text-[var(--color-text-muted)] mb-5 max-w-md mx-auto">
            Meld je aan en ontdek direct wat de community beweegt. Geen verplichtingen, puur leuke discussies en projecten.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('forum')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--forum-accent)] to-[var(--forum-accent-2)] hover:from-[var(--forum-accent-hover)] hover:to-[var(--forum-accent-2)] text-[var(--color-text-inverse)] text-sm font-semibold transition-all duration-300 cursor-pointer shadow-lg shadow-[var(--color-brand-muted)]"
            >
              Naar het forum
            </button>
            <button
              type="button"
              onClick={() => onNavigate('gallery')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[var(--forum-bg-elevated)]/80 backdrop-blur-sm hover:bg-[var(--color-bg-hover)] border border-[var(--forum-border)] text-[var(--color-text)] text-sm font-semibold transition-all duration-300 cursor-pointer"
            >
              Bekijk projecten
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};