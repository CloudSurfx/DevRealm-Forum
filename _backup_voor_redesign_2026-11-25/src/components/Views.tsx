import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  ExternalLink,
  Github,
  Heart,
  HelpCircle,
  Keyboard,
  Link2,
  Megaphone,
  MessageSquare,
  Palette,
  Pin,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  Trophy,
  User,
  X,
} from 'lucide-react';
import {
  buildCustomThemePalette,
  CATEGORIES,
  THEME_ACCENT_PRESETS,
} from '../data/forumData';
import {
  CategoryId,
  GlowIntensity,
  Member,
  NewsItem,
  ThemeAccentId,
  Topic,
} from '../types/forum';
import {
  BADGE_CATALOG,
  evaluateMemberBadges,
  getBadgeDefinition,
} from '../utils/badgeSystem';
import {
  getBadgeToneClasses,
  renderBadgeIcon,
  UserBadges,
} from './UserBadges';

const NEWS_MONTH_INDEX: Record<string, number> = {
  jan: 0,
  feb: 1,
  mrt: 2,
  apr: 3,
  mei: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  okt: 9,
  nov: 10,
  dec: 11,
};

function parseDutchNewsDate(dateStr: string): number {
  const parts = dateStr.trim().toLowerCase().split(/\s+/);
  if (parts.length === 3) {
    const day = Number(parts[0]);
    const month = NEWS_MONTH_INDEX[parts[1]] ?? 0;
    const year = Number(parts[2]);
    if (!Number.isNaN(day) && !Number.isNaN(year)) {
      return new Date(year, month, day).getTime();
    }
  }
  const fallback = Date.parse(dateStr);
  return Number.isNaN(fallback) ? 0 : fallback;
}

type NewsSortOption = 'date-desc' | 'date-asc' | 'category';

export const NewsView: React.FC<{
  news: NewsItem[];
  onSelectNews?: (item: NewsItem) => void;
  onBackHome: () => void;
}> = ({ news, onBackHome }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Alles');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<NewsSortOption>('date-desc');
  const [helpfulIds, setHelpfulIds] = useState<Record<string, boolean>>({});
  const [modalArticle, setModalArticle] = useState<NewsItem | null>(null);

  useEffect(() => {
    if (!modalArticle) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalArticle(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modalArticle]);

  const newsCategories = useMemo(
    () => ['Alles', ...Array.from(new Set(news.map((item) => item.category)))],
    [news]
  );

  const featured = news[0];

  const filteredNews = useMemo(() => {
    const list = news.filter((item) => {
      if (selectedCategory !== 'Alles' && item.category !== selectedCategory) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.author.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.publishedAt.toLowerCase().includes(q)
        );
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'date-asc') {
        return parseDutchNewsDate(a.publishedAt) - parseDutchNewsDate(b.publishedAt);
      }
      if (sortBy === 'category') {
        const catCompare = a.category.localeCompare(b.category, 'nl');
        if (catCompare !== 0) return catCompare;
        return parseDutchNewsDate(b.publishedAt) - parseDutchNewsDate(a.publishedAt);
      }
      return parseDutchNewsDate(b.publishedAt) - parseDutchNewsDate(a.publishedAt);
    });
  }, [news, selectedCategory, search, sortBy]);

  const toggleHelpful = (id: string) => {
    setHelpfulIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openReadMoreModal = (item: NewsItem) => {
    setModalArticle(item);
  };

  const changelogItems = [
    {
      version: 'v2.6',
      date: '18 nov 2026',
      title: 'Globale zoekbalk, /forum route & browsermeldingen',
      details: 'Zoeken door alle onderdelen, achtergrondmeldingen in live chat en activiteitsduur in zijbalk.',
    },
    {
      version: 'v2.5',
      date: '16 nov 2026',
      title: 'Badges, reputatiesysteem & Markdown-tabellen',
      details: 'Reputatiepunten voor helpers, Beste Antwoord-markering en bestandsuploads in topics.',
    },
    {
      version: 'v2.4',
      date: '15 nov 2026',
      title: 'Code-snippets & Project-galerij met live previews',
      details: 'Syntax highlighting voor React/Vue en interactieve component-embeds.',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header + Featured News Spotlight */}
      <section className="bg-white dark:bg-[#13111c] forum-hero-glow border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-[#a88bfa] hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Naar /forum</span>
          </button>

          <span className="text-xs font-mono text-slate-500 dark:text-[#86809e] tabular-nums">
            {news.length} berichten gepubliceerd
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <Megaphone className="w-5 h-5 text-[#e8b353]" />
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white">
            Nieuws & Aankondigingen
          </h1>
        </div>
        <p className="text-sm text-slate-600 dark:text-[#9c96b2] mt-1.5 max-w-2xl">
          Blijf bij met nieuwe forumfuncties, aankomende Build Nights en transparante
          platform-updates.
        </p>

        {featured && (
          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs text-slate-500 dark:text-[#86809e] flex items-center flex-wrap gap-2">
                <span className="font-semibold text-[#d99b26] dark:text-[#e8b353]">
                  Uitgelicht bericht
                </span>
                <span aria-hidden="true">·</span>
                <span>{featured.category}</span>
                <span aria-hidden="true">·</span>
                <span>{featured.publishedAt}</span>
              </div>
              <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white mt-1 leading-snug">
                {featured.title}
              </h2>
              <p className="text-sm text-slate-600 dark:text-[#9c96b2] mt-1 line-clamp-2">
                {featured.summary}
              </p>
            </div>
            <button
              type="button"
              onClick={() => openReadMoreModal(featured)}
              className="px-4 py-2.5 rounded-xl bg-[#a88bfa] hover:bg-[#b79dff] text-[#0f0c18] text-xs sm:text-sm font-semibold cursor-pointer shrink-0 self-start sm:self-center whitespace-nowrap"
            >
              Lees uitgelicht
            </button>
          </div>
        )}
      </section>

      {/* Filter, Search & Sort Toolbar */}
      <section className="bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center flex-wrap gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#191625] border border-slate-200/80 dark:border-white/[0.05]">
            {newsCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-white dark:bg-[#262138] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-[#8d87a4] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-[#756f8c] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Zoek titel, datum of categorie..."
                className="w-full h-9 pl-8 pr-8 rounded-xl bg-slate-100/80 dark:bg-[#1a1726] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#6e6885] focus:outline-none focus:ring-2 focus:ring-[#a88bfa]/60"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Wis zoekterm"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 dark:text-[#7c7694] shrink-0 hidden sm:block" />
              <select
                aria-label="Sorteer nieuws"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as NewsSortOption)}
                className="h-9 px-3 rounded-xl bg-slate-100/80 dark:bg-[#1a1726] border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#a88bfa]/60 cursor-pointer"
              >
                <option value="date-desc">Datum: nieuwste eerst</option>
                <option value="date-asc">Datum: oudste eerst</option>
                <option value="category">Categorie (A–Z)</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Articles Grid */}
      {filteredNews.length === 0 ? (
        <div
          key={`empty-${selectedCategory}-${sortBy}-${search}`}
          className="news-card-enter bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-8 text-center"
        >
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            Geen nieuwsberichten gevonden voor deze filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('Alles');
              setSearch('');
            }}
            className="mt-3 px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#1c1829] text-xs font-semibold text-slate-800 dark:text-white cursor-pointer"
          >
            Alle berichten tonen
          </button>
        </div>
      ) : (
        <div
          key={`grid-${selectedCategory}-${sortBy}-${search.trim()}`}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-200 ease-out"
        >
          {filteredNews.map((item, idx) => {
            const isHelpful = Boolean(helpfulIds[item.id]);
            return (
              <article
                key={item.id}
                style={{ animationDelay: `${Math.min(idx * 40, 200)}ms` }}
                className="news-card-enter bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.08] hover:border-violet-300 dark:hover:border-[#a88bfa]/35 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 ease-out hover:-translate-y-0.5"
              >
                <div>
                  <div className="text-xs text-slate-500 dark:text-[#86809e] flex items-center flex-wrap gap-1.5">
                    <span className="font-semibold text-violet-600 dark:text-[#a88bfa]">
                      {item.category}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{item.publishedAt}</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.readTime}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => openReadMoreModal(item)}
                    className="text-left group cursor-pointer block w-full mt-2"
                  >
                    <h2 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-[#a88bfa] transition-colors leading-snug">
                      {item.title}
                    </h2>
                  </button>

                  <p className="text-sm text-slate-600 dark:text-[#9c96b2] mt-2 leading-relaxed line-clamp-3">
                    {item.summary}
                  </p>
                </div>

                <div className="mt-4 pt-3.5 border-t border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500 dark:text-[#7c7694]">
                    Door {item.author}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleHelpful(item.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        isHelpful
                          ? 'bg-[#a88bfa]/20 text-violet-700 dark:text-[#c7b5ff]'
                          : 'text-slate-500 dark:text-[#86809e] hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{isHelpful ? 'Nuttig (1)' : 'Nuttig'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openReadMoreModal(item)}
                      className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-[#1c1829] hover:bg-slate-200 dark:hover:bg-[#262138] text-xs font-semibold text-violet-600 dark:text-[#a88bfa] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Lees meer
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Compact Platform Changelog & Agenda */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3.5">
            <Sparkles className="w-4 h-4 text-[#a88bfa]" />
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
              Recente releases (Changelog)
            </h3>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-white/[0.06]">
            {changelogItems.map((entry) => (
              <div key={entry.version} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono font-semibold text-[#d99b26] dark:text-[#e8b353]">
                    {entry.version} · {entry.title}
                  </span>
                  <span className="text-slate-400 dark:text-[#756f8c] shrink-0">
                    {entry.date}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-[#9690ab] mt-1 leading-relaxed">
                  {entry.details}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3.5">
            <Calendar className="w-4 h-4 text-[#e8b353]" />
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
              Community Agenda
            </h3>
          </div>
          <div className="space-y-3">
            {[
              {
                when: 'Elke vrijdag · 20:00',
                what: 'Community Build Night in de Live chat',
                note: 'Deel waar je aan werkt in React of Vue en denk mee met anderen.',
              },
              {
                when: 'Maandag · 10:00',
                what: 'Nieuwe Peiling van de Week',
                note: 'Stem op welke forumfunctie als volgende wordt gebouwd.',
              },
              {
                when: 'Eind van de maand',
                what: 'Top Helpers Spotlight',
                note: 'Leden met de meeste Beste Antwoorden krijgen extra badges.',
              },
            ].map((ev) => (
              <div
                key={ev.what}
                className="p-3 rounded-xl bg-slate-50 dark:bg-[#181524] border border-slate-200/80 dark:border-white/[0.06]"
              >
                <div className="text-xs font-mono text-violet-600 dark:text-[#a88bfa]">
                  {ev.when}
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                  {ev.what}
                </div>
                <p className="text-xs text-slate-600 dark:text-[#9690ab] mt-0.5">{ev.note}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Dedicated 'Lees meer' Modal for each news item */}
      {modalArticle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs forum-modal-overlay"
          onClick={() => setModalArticle(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={modalArticle.title}
            className="w-full max-w-xl max-h-[88vh] flex flex-col bg-white dark:bg-[#13111c] forum-card-glow border border-slate-200 dark:border-white/[0.1] rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.07] flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500 dark:text-[#86809e] flex items-center flex-wrap gap-2">
                <span className="font-semibold text-violet-600 dark:text-[#a88bfa]">
                  {modalArticle.category}
                </span>
                <span aria-hidden="true">·</span>
                <span>{modalArticle.publishedAt}</span>
                <span aria-hidden="true">·</span>
                <span>{modalArticle.readTime}</span>
              </div>

              <button
                type="button"
                onClick={() => setModalArticle(null)}
                aria-label="Sluiten"
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#1c1829] hover:bg-slate-200 dark:hover:bg-[#262138] text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <h2 className="font-display font-bold text-xl sm:text-2xl text-slate-900 dark:text-white leading-snug">
                {modalArticle.title}
              </h2>

              <p className="text-sm font-medium text-slate-700 dark:text-[#cfc9e6] leading-relaxed">
                {modalArticle.summary}
              </p>

              <div className="pt-2 border-t border-slate-200/80 dark:border-white/[0.06] text-sm text-slate-700 dark:text-[#d5d0e6] leading-relaxed whitespace-pre-line">
                {modalArticle.body}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-white/[0.07] bg-slate-50 dark:bg-[#110f19] flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-500 dark:text-[#86809e]">
                Door {modalArticle.author}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleHelpful(modalArticle.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    helpfulIds[modalArticle.id]
                      ? 'bg-[#a88bfa]/20 text-violet-700 dark:text-[#c7b5ff]'
                      : 'bg-white dark:bg-[#1b1828] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{helpfulIds[modalArticle.id] ? 'Nuttig gevonden (1)' : 'Nuttig'}</span>
                </button>

                {filteredNews.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const currentIdx = filteredNews.findIndex((n) => n.id === modalArticle.id);
                      const nextIdx = (currentIdx + 1) % filteredNews.length;
                      setModalArticle(filteredNews[nextIdx]);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#a88bfa] hover:bg-[#b79dff] text-[#0f0c18] text-xs font-semibold cursor-pointer"
                  >
                    Volgende bericht
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AllTopicsView: React.FC<{
  topics: Topic[];
  onSelectTopic: (topic: Topic) => void;
  onToggleTopicVote: (topicId: string) => void;
  onOpenNewTopic: () => void;
}> = ({ topics, onSelectTopic, onToggleTopicVote, onOpenNewTopic }) => {
  const [filter, setFilter] = useState<CategoryId>('all');
  const filtered =
    filter === 'all' ? topics : topics.filter((t) => t.category === filter);

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-white">
            Alle discussies
          </h1>
          <p className="text-sm text-slate-600 dark:text-[#9c96b2] mt-1">
            Blader door alle topics of start zelf een nieuw gesprek.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenNewTopic}
          className="px-4 py-2.5 rounded-xl bg-[#a88bfa] hover:bg-[#b79dff] text-[#0f0c18] text-sm font-semibold inline-flex items-center gap-2 cursor-pointer shrink-0 self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Nieuw topic</span>
        </button>
      </div>

      <div className="bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.08] rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-white/[0.07] flex items-center flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilter(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filter === cat.id
                  ? 'bg-[#a88bfa]/15 text-violet-700 dark:text-white'
                  : 'text-slate-600 dark:text-[#8d87a4] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="divide-y divide-slate-200 dark:divide-white/[0.06]">
          {filtered.map((topic) => (
            <article
              key={topic.id}
              className="px-5 py-4 hover:bg-slate-50/90 dark:hover:bg-white/[0.02] transition-colors flex items-start gap-3.5"
            >
              <button
                type="button"
                onClick={() => onToggleTopicVote(topic.id)}
                className={`w-11 py-1.5 rounded-xl border flex flex-col items-center justify-center shrink-0 cursor-pointer ${
                  topic.votedByMe
                    ? 'bg-[#a88bfa]/15 border-[#a88bfa]/50 text-violet-700 dark:text-[#c7b5ff]'
                    : 'bg-slate-50 dark:bg-[#181524] border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-[#8d87a4]'
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
                  <h3 className="font-display font-semibold text-base text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-[#a88bfa] transition-colors">
                    {topic.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-[#9690ab] mt-1 line-clamp-2">
                    {topic.excerpt}
                  </p>
                </button>
                <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-[#7c7694] mt-2.5">
                  <span className="font-medium text-slate-700 dark:text-[#cfc9e6]">
                    {topic.authorName}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-violet-600 dark:text-[#a88bfa] font-medium">
                    {topic.categoryLabel}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{topic.lastActivity}</span>
                  {topic.pinned && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 text-[#d99b26] dark:text-[#e8b353]">
                        <Pin className="w-3 h-3" /> Vastgezet
                      </span>
                    </>
                  )}
                  {topic.solved && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" /> Opgelost
                      </span>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => onSelectTopic(topic)}
                    className="ml-auto inline-flex items-center gap-1.5 tabular-nums cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{topic.replies.length}</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export const DocsView: React.FC = () => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [openFaq, setOpenFaq] = useState<string | null>('faq-1');
  const [ruleSearch, setRuleSearch] = useState('');

  const rules = [
    {
      title: '01. Wees behulpzaam en respectvol',
      text: 'Kritiek op code of ontwerpen mag altijd, maar richt je op het werk en blijf constructief. Beginners en ervaren developers zijn hier even welkom.',
      doText: 'Geef concrete suggesties of een klein codevoorbeeld.',
      dontText: 'Persoonlijke opmerkingen of vragen belachelijk maken.',
    },
    {
      title: '02. Kies de juiste plek: Live chat vs. Topics',
      text: 'Snelle vragen, check-ins en korte praatjes horen in de Live chat onderaan /forum. Uitgebreide vraagstukken plaats je als topic zodat antwoorden vindbaar blijven.',
      doText: 'Open een topic als je codeblokken of tabellen wilt delen.',
      dontText: 'Hele foutlogs van 80 regels in de live chat plakken.',
    },
    {
      title: '03. Deel voldoende context bij hulpvragen',
      text: 'Werk je met React, Vue of een hybride setup? Vermeld kort wat je al geprobeerd hebt, wat je verwacht en voeg eventueel een screenshot of snippet toe.',
      doText: 'Gebruik de knop Code-snippet of upload een afbeelding.',
      dontText: '"Het werkt niet, help" zonder verdere toelichting.',
    },
    {
      title: '04. Showcase & eerlijke zelfpromotie',
      text: 'Eigen projecten delen in de Project-galerij of Showcase juichen we toe! Vertel er altijd bij hoe het gebouwd is en waar je feedback op zoekt.',
      doText: 'Deel een live preview in de Project-galerij.',
      dontText: 'Kale affiliate-links of reclame zonder uitleg dumpen.',
    },
    {
      title: '05. Veilig omgaan met keys & bestanden',
      text: 'Controleer voor het uploaden van bestanden of code-snippets altijd of er geen API-sleutels, wachtwoorden of privé-URL’s in staan.',
      doText: 'Vervang tokens door voorbeeldwaarden zoals MY_API_KEY.',
      dontText: 'Echte .env-bestanden of privétokens meesturen.',
    },
    {
      title: '06. Markeer het Beste Antwoord',
      text: 'Heeft iemand jou goed geholpen onder een topic? Markeer die reactie als Beste Antwoord zodat de helper +15 reputatiepunten ontvangt en anderen direct de oplossing zien.',
      doText: 'Beloon helpers met een like of Beste Antwoord.',
      dontText: 'Topics verlaten zonder terugkoppeling als het opgelost is.',
    },
  ];

  const filteredRules = rules.filter((r) => {
    if (!ruleSearch.trim()) return true;
    const q = ruleSearch.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      r.text.toLowerCase().includes(q) ||
      r.doText.toLowerCase().includes(q)
    );
  });

  const faqs = [
    {
      id: 'faq-1',
      q: 'Hoe verdien ik precies reputatie en badges?',
      a: 'Je bouwt automatisch reputatie op door actief mee te doen: +10 rep voor een nieuw topic, +5 rep per reactie, +15 rep wanneer jouw reactie als Beste Antwoord wordt gemarkeerd en +2 rep voor chatberichten of ontvangen likes.',
    },
    {
      id: 'faq-2',
      q: 'Hoe werkt een Markdown-tabel in een topic?',
      a: 'Gebruik de knop "Tabel invoegen" in het Nieuw topic-venster, of typ kolommen gescheiden door | (bijv. | Kolom A | Kolom B |) met een scheidingsregel | --- | --- | eronder.',
    },
    {
      id: 'faq-3',
      q: 'Hoe schakel ik meldingen in voor de Live chat?',
      a: 'Klik rechtsboven in het Live chat-blok op de knop "Meldingen". Zodra je toestemming geeft krijg je bij nieuwe berichten op de achtergrond een browsermelding én zie je het aantal ongelezen berichten in de tab-titel.',
    },
    {
      id: 'faq-4',
      q: 'Welke projecten mag ik in de Project-galerij plaatsen?',
      a: 'Alles wat je bouwt met webtechnologie — van kleine React- of Vue-componenten en CSS-animaties tot complete side-projects en tooling.',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Hero Header */}
      <section className="bg-white dark:bg-[#13111c] forum-hero-glow border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 sm:p-7">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-5 h-5 text-[#a88bfa]" />
              <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white">
                Forumregels & Community Gids
              </h1>
            </div>
            <p className="text-sm text-slate-600 dark:text-[#9c96b2] mt-1.5 max-w-2xl">
              Alles wat je moet weten over onze huisregels, het reputatiesysteem, handige
              sneltoetsen en het opmaken van topics.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAcknowledged((prev) => !prev)}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer shrink-0 self-start ${
              acknowledged
                ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                : 'bg-[#e8b353] hover:bg-[#f0be63] text-[#141008]'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{acknowledged ? 'Regels gelezen' : 'Ik ga akkoord met de regels'}</span>
          </button>
        </div>

        {/* Rule Search */}
        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-white/[0.07] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs text-slate-500 dark:text-[#86809e]">
            6 huisregels · Reputatie-overzicht · Sneltoetsen & FAQ
          </span>
          <div className="relative sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-[#756f8c] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={ruleSearch}
              onChange={(e) => setRuleSearch(e.target.value)}
              placeholder="Zoek in regels..."
              className="w-full h-9 pl-8 pr-3 rounded-xl bg-slate-100/80 dark:bg-[#1a1726] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#6e6885] focus:outline-none focus:ring-2 focus:ring-[#a88bfa]/60"
            />
          </div>
        </div>
      </section>

      {/* 6 Community Rules Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRules.map((rule) => (
          <div
            key={rule.title}
            className="bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">
                  {rule.title}
                </h2>
              </div>
              <p className="text-sm text-slate-600 dark:text-[#9c96b2] leading-relaxed">
                {rule.text}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-white/[0.06] space-y-1 text-xs">
              <div className="text-emerald-600 dark:text-emerald-400">
                <span className="font-semibold">Wel:</span> {rule.doText}
              </div>
              <div className="text-slate-500 dark:text-[#86809e]">
                <span className="font-semibold text-rose-500 dark:text-rose-400">Liever niet:</span>{' '}
                {rule.dontText}
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Reputation Breakdown Table + Keyboard Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3.5">
            <Trophy className="w-4 h-4 text-[#e8b353]" />
            <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">
              Reputatiepunten & Niveaus
            </h2>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/[0.08]">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-100 dark:bg-[#191625] border-b border-slate-200 dark:border-white/[0.08]">
                  <th className="px-3.5 py-2.5 font-display font-semibold text-slate-900 dark:text-white">
                    Actie op het forum
                  </th>
                  <th className="px-3.5 py-2.5 font-display font-semibold text-slate-900 dark:text-white text-right">
                    Punten
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-white/[0.06]">
                {[
                  { action: 'Reactie gemarkeerd als Beste Antwoord', pts: '+15 rep' },
                  { action: 'Nieuw project delen in Project-galerij', pts: '+15 rep' },
                  { action: 'Nieuw topic starten in /forum', pts: '+10 rep' },
                  { action: 'Reactie plaatsen onder een topic', pts: '+5 rep' },
                  { action: 'Ontvangen vote/like of live chat bericht', pts: '+2 rep' },
                ].map((row) => (
                  <tr key={row.action}>
                    <td className="px-3.5 py-2.5 text-slate-700 dark:text-[#d5d0e6]">
                      {row.action}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono font-semibold tabular-nums text-[#d99b26] dark:text-[#e8b353]">
                      {row.pts}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3.5">
            <Keyboard className="w-4 h-4 text-[#a88bfa]" />
            <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">
              Sneltoetsen & Opmaaktips
            </h2>
          </div>

          <div className="space-y-2.5 text-xs sm:text-sm">
            {[
              { keys: '/ of Ctrl + K', desc: 'Open direct de globale zoekbalk in de TopBar' },
              { keys: 'Pijltjes + Enter', desc: 'Navigeer door zoekresultaten en open meteen' },
              { keys: 'Esc', desc: 'Sluit zoekresultaten of geopende vensters' },
              { keys: '| Kolom | Kolom |', desc: 'Maak automatisch een Markdown-tabel in topics' },
              { keys: '`inline code`', desc: 'Markeer functies, hooks of bestandsnamen in tekst' },
            ].map((item) => (
              <div
                key={item.keys}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-[#181524] border border-slate-200/80 dark:border-white/[0.06]"
              >
                <span className="text-slate-700 dark:text-[#d5d0e6]">{item.desc}</span>
                <kbd className="px-2 py-1 rounded-lg bg-white dark:bg-[#110f19] border border-slate-200 dark:border-white/[0.1] font-mono text-[11px] text-violet-700 dark:text-[#c7b5ff] whitespace-nowrap shrink-0">
                  {item.keys}
                </kbd>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Interactive FAQ Accordion */}
      <section className="bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="w-4 h-4 text-[#a88bfa]" />
          <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">
            Veelgestelde vragen
          </h2>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-white/[0.06]">
          {faqs.map((faq) => {
            const isOpen = openFaq === faq.id;
            return (
              <div key={faq.id} className="py-3 first:pt-0 last:pb-0">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : faq.id)}
                  className="w-full flex items-center justify-between gap-3 text-left cursor-pointer group"
                >
                  <span className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-[#a88bfa] transition-colors">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-150 ${
                      isOpen ? 'rotate-180 text-[#a88bfa]' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="text-sm text-slate-600 dark:text-[#9c96b2] mt-2 leading-relaxed">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export const ProfileView: React.FC<{
  currentUser: Member | null;
  members: Member[];
  activeThemeAccent: ThemeAccentId;
  customThemeHex: string;
  glowIntensity: GlowIntensity;
  tintedSurfaces: boolean;
  onSelectThemeAccent: (accent: ThemeAccentId, syncAvatarColor?: boolean) => void;
  onChangeCustomThemeHex: (hex: string, syncAvatarColor?: boolean) => void;
  onChangeGlowIntensity: (intensity: GlowIntensity) => void;
  onToggleTintedSurfaces: () => void;
  onUpdateSocialLinks: (links: { githubHandle?: string; discordHandle?: string }) => void;
  onOpenAuth: (mode: 'register' | 'login') => void;
  onLogout: () => void;
}> = ({
  currentUser,
  members,
  activeThemeAccent,
  customThemeHex,
  glowIntensity,
  tintedSurfaces,
  onSelectThemeAccent,
  onChangeCustomThemeHex,
  onChangeGlowIntensity,
  onToggleTintedSurfaces,
  onUpdateSocialLinks,
  onOpenAuth,
  onLogout,
}) => {
  const leaderboard = [...members].sort((a, b) => b.reputation - a.reputation);

  const [githubInput, setGithubInput] = useState(currentUser?.githubHandle ?? '');
  const [discordInput, setDiscordInput] = useState(currentUser?.discordHandle ?? '');
  const [syncAvatarWithTheme, setSyncAvatarWithTheme] = useState(true);
  const [savedNotice, setSavedNotice] = useState(false);
  const [copiedDiscord, setCopiedDiscord] = useState<string | null>(null);

  useEffect(() => {
    setGithubInput(currentUser?.githubHandle ?? '');
    setDiscordInput(currentUser?.discordHandle ?? '');
  }, [currentUser?.id, currentUser?.githubHandle, currentUser?.discordHandle]);

  const handleSaveSocials = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanGithub = githubInput
      .trim()
      .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
      .replace(/^@/, '')
      .replace(/\/+$/, '');
    const cleanDiscord = discordInput.trim().replace(/^@/, '');

    onUpdateSocialLinks({
      githubHandle: cleanGithub || undefined,
      discordHandle: cleanDiscord || undefined,
    });
    setGithubInput(cleanGithub);
    setDiscordInput(cleanDiscord);
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2200);
  };

  const handleCopyDiscord = (handle: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(handle).catch(() => {});
    }
    setCopiedDiscord(handle);
    window.setTimeout(() => {
      setCopiedDiscord((prev) => (prev === handle ? null : prev));
    }, 1800);
  };

  const activePreset =
    activeThemeAccent === 'custom'
      ? buildCustomThemePalette(customThemeHex)
      : THEME_ACCENT_PRESETS.find((p) => p.id === activeThemeAccent) ??
        THEME_ACCENT_PRESETS[0];

  return (
    <div className="space-y-5">
      {!currentUser ? (
        <div className="bg-white dark:bg-[#13111c] forum-card-glow border border-slate-200 dark:border-white/[0.08] rounded-2xl p-8 text-center">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto text-[#0f0c18] font-bold"
            style={{ backgroundColor: activePreset.hex }}
          >
            <User className="w-6 h-6" />
          </div>
          <h1 className="font-display font-bold text-xl text-slate-900 dark:text-white mt-4">
            Je bekijkt het forum als gast
          </h1>
          <p className="text-sm text-slate-600 dark:text-[#9c96b2] max-w-md mx-auto mt-2">
            Maak een gratis account aan om je eigen thema-kleuren op te slaan, je GitHub & Discord
            te koppelen aan je profielkaart en reputatie op te bouwen.
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              type="button"
              onClick={() => onOpenAuth('register')}
              className="px-5 py-2.5 rounded-xl bg-[#e8b353] hover:bg-[#f0be63] text-[#141008] text-sm font-bold cursor-pointer"
            >
              Aanmelden
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#1b1828] border border-slate-200 dark:border-white/[0.09] text-slate-900 dark:text-white text-sm font-semibold cursor-pointer"
            >
              Inloggen
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#13111c] forum-card-glow border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-[#0f0c18] shrink-0 shadow-sm"
                style={{ backgroundColor: currentUser.avatarColor }}
              >
                {currentUser.initials}
              </div>
              <div>
                <div className="flex items-center flex-wrap gap-2">
                  <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-white">
                    {currentUser.name}
                  </h1>
                  <span
                    className="px-2.5 py-0.5 rounded-md text-xs font-semibold text-[#0f0c18]"
                    style={{ backgroundColor: activePreset.hex }}
                  >
                    {activePreset.label}
                  </span>
                </div>
                <div className="mt-1.5">
                  <UserBadges member={currentUser} maxVisible={5} variant="full" />
                </div>
                <p className="text-sm text-slate-500 dark:text-[#8d87a4] mt-1.5">
                  {currentUser.handle} · {currentUser.role} · Lid sinds {currentUser.joinedAt}
                </p>

                {/* GitHub & Discord koppeling direct zichtbaar in de profielkaart */}
                <div className="flex items-center flex-wrap gap-2 mt-3">
                  {currentUser.githubHandle ? (
                    <a
                      href={`https://github.com/${currentUser.githubHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-[#1b1828] hover:bg-slate-200 dark:hover:bg-[#252038] border border-slate-200 dark:border-white/[0.09] text-xs font-mono font-medium text-slate-800 dark:text-slate-100 transition-colors"
                    >
                      <Github className="w-3.5 h-3.5 text-slate-700 dark:text-white shrink-0" />
                      <span>github.com/{currentUser.githubHandle}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-[#171422] border border-dashed border-slate-300 dark:border-white/[0.1] text-xs text-slate-400 dark:text-[#756f8c]">
                      <Github className="w-3.5 h-3.5 shrink-0" />
                      <span>Geen GitHub gekoppeld</span>
                    </span>
                  )}

                  {currentUser.discordHandle ? (
                    <button
                      type="button"
                      onClick={() => handleCopyDiscord(currentUser.discordHandle!)}
                      title="Klik om Discord-tag te kopiëren"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#5865F2]/12 hover:bg-[#5865F2]/20 border border-[#5865F2]/30 text-xs font-mono font-medium text-[#4752C4] dark:text-[#b9c0ff] transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-[#5865F2] dark:text-[#8ea1e1] shrink-0" />
                      <span>Discord: {currentUser.discordHandle}</span>
                      {copiedDiscord === currentUser.discordHandle ? (
                        <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                      ) : (
                        <Copy className="w-3 h-3 opacity-70 shrink-0" />
                      )}
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-[#171422] border border-dashed border-slate-300 dark:border-white/[0.1] text-xs text-slate-400 dark:text-[#756f8c]">
                      <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                      <span>Geen Discord gekoppeld</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#1b1828] hover:bg-slate-200 dark:hover:bg-[#241f35] border border-slate-200 dark:border-white/[0.09] text-slate-800 dark:text-white text-sm font-semibold cursor-pointer self-start"
            >
              Uitloggen
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-white/[0.07]">
            <div>
              <div className="text-xs text-slate-500 dark:text-[#86809e]">Reputatie</div>
              <div className="font-display font-bold text-2xl text-[#d99b26] dark:text-[#e8b353] tabular-nums mt-1">
                {currentUser.reputation}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-[#8d87a4]">Bijdragen</div>
              <div className="font-display font-bold text-2xl text-slate-900 dark:text-white tabular-nums mt-1">
                {currentUser.postsCount}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-[#86809e]">Verdiende badges</div>
              <div
                className="font-display font-bold text-2xl tabular-nums mt-1"
                style={{ color: activePreset.hex }}
              >
                {currentUser.badges.length}
              </div>
            </div>
          </div>

          {/* Earned & Unlockable Automatic Badges Grid */}
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/[0.07] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-[#e8b353]" />
                <span>Jouw verdiende badges ({evaluateMemberBadges(currentUser).length})</span>
              </h2>
              <span className="text-xs text-slate-500 dark:text-[#86809e]">
                Automatisch toegekend op basis van reputatie & forum-acties
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {evaluateMemberBadges(currentUser).map((badgeName) => {
                const def = getBadgeDefinition(badgeName);
                const toneClasses = getBadgeToneClasses(def.tone);
                return (
                  <div
                    key={def.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#181524] border border-slate-200 dark:border-white/[0.08] flex items-start gap-3"
                  >
                    <span
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${toneClasses}`}
                    >
                      {renderBadgeIcon(def.icon, 'w-4 h-4')}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {def.label}
                        </span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      </div>
                      <p className="text-xs text-slate-600 dark:text-[#9c96b2] mt-0.5 leading-snug">
                        {def.description}
                      </p>
                      <span className="inline-block mt-1.5 text-[11px] font-mono text-violet-600 dark:text-[#a88bfa]">
                        {def.requirementText}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Voorstel 2 & 3: Thema-kleuren kiezen + GitHub & Discord koppeling */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Voorstel 2: Thema-kleuren zelf kiezen in je profiel */}
        <section className="bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4" style={{ color: activePreset.hex }} />
                <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">
                  Thema Studio & Kleuren
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-500 dark:text-[#86809e]">
                Actief: {activePreset.label}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-[#9c96b2] leading-relaxed">
              Personaliseer de accentkleur, donkere kaart-ondergronden, gloed-intensiteit en
              scrollbars door het hele forum.
            </p>

            <div className="mt-4 space-y-2">
              {THEME_ACCENT_PRESETS.map((preset) => {
                const isSelected = activeThemeAccent === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onSelectThemeAccent(preset.id, syncAvatarWithTheme)}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-50 dark:bg-[#1b1828] border-slate-900 dark:border-white/40 shadow-xs'
                        : 'bg-slate-50/50 dark:bg-[#161321] border-slate-200 dark:border-white/[0.07] hover:border-slate-300 dark:hover:border-white/[0.16]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-[#0f0c18] shadow-xs"
                        style={{ backgroundColor: preset.hex }}
                      >
                        {isSelected && <Check className="w-4 h-4 stroke-[2.5]" />}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">
                          {preset.label}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-[#86809e] truncate">
                          {preset.description}
                        </div>
                      </div>
                    </div>

                    <span className="text-xs font-mono text-slate-400 dark:text-[#756f8c] shrink-0">
                      {preset.hex}
                    </span>
                  </button>
                );
              })}

              {/* Eigen Hex-kleur rij */}
              <div
                className={`w-full p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                  activeThemeAccent === 'custom'
                    ? 'bg-slate-50 dark:bg-[#1b1828] border-slate-900 dark:border-white/40 shadow-xs'
                    : 'bg-slate-50/50 dark:bg-[#161321] border-slate-200 dark:border-white/[0.07]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-[#0f0c18] shadow-xs"
                    style={{ backgroundColor: customThemeHex }}
                  >
                    {activeThemeAccent === 'custom' && <Check className="w-4 h-4 stroke-[2.5]" />}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      Eigen Hex-kleur
                    </div>
                    <div className="text-xs text-slate-500 dark:text-[#86809e] truncate">
                      Kies zelf een exacte kleur naar wens
                    </div>
                  </div>
                </div>

                <label className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white dark:bg-[#231f33] border border-slate-200 dark:border-white/[0.1] text-xs font-mono text-slate-800 dark:text-slate-200 cursor-pointer shrink-0">
                  <input
                    type="color"
                    value={customThemeHex}
                    onChange={(e) =>
                      onChangeCustomThemeHex(e.target.value, syncAvatarWithTheme)
                    }
                    className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent p-0"
                  />
                  <span>{customThemeHex.toUpperCase()}</span>
                </label>
              </div>
            </div>

            {/* Glow intensity & surface tint controls */}
            <div className="mt-4 pt-3.5 border-t border-slate-200/80 dark:border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Kaart-gloed intensiteit
                </span>
                <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#1a1726]">
                  {(
                    [
                      { id: 'subtle', label: 'Subtiel' },
                      { id: 'normal', label: 'Normaal' },
                      { id: 'intense', label: 'Intens' },
                    ] as { id: GlowIntensity; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onChangeGlowIntensity(opt.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        glowIntensity === opt.id
                          ? 'bg-white dark:bg-[#262138] text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 dark:text-[#8d87a4] hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-[#9c96b2] cursor-pointer">
                <span>Laat donkere achtergrond en kaarten subtiel meekleuren</span>
                <input
                  type="checkbox"
                  checked={tintedSurfaces}
                  onChange={onToggleTintedSurfaces}
                  className="w-4 h-4 rounded accent-[#a88bfa] cursor-pointer"
                />
              </label>
            </div>
          </div>

          <label className="mt-3 pt-3 border-t border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-[#9c96b2] cursor-pointer">
            <span>Pas gekozen themakleur ook direct toe op mijn profiel-avatar</span>
            <input
              type="checkbox"
              checked={syncAvatarWithTheme}
              onChange={(e) => setSyncAvatarWithTheme(e.target.checked)}
              className="w-4 h-4 rounded accent-[#a88bfa] cursor-pointer"
            />
          </label>
        </section>

        {/* Voorstel 3: GitHub & Discord koppeling in je profielkaart */}
        <section className="bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-[#e8b353]" />
                <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">
                  GitHub & Discord koppeling
                </h2>
              </div>
              <span className="text-xs font-mono text-[#d99b26] dark:text-[#e8b353]">
                +10 rep & badge
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-[#9c96b2] leading-relaxed">
              Koppel je GitHub-profiel en Discord-handle zodat andere bouwers je code kunnen
              bekijken of direct met je kunnen sparren tijdens Build Nights.
            </p>

            {currentUser ? (
              <form onSubmit={handleSaveSocials} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    GitHub gebruikersnaam
                  </label>
                  <div className="relative flex items-center">
                    <Github className="w-4 h-4 text-slate-400 dark:text-[#756f8c] absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      value={githubInput}
                      onChange={(e) => setGithubInput(e.target.value)}
                      placeholder="bijv. sandervermeer"
                      className="w-full h-10 pl-9 pr-3.5 rounded-xl bg-slate-50 dark:bg-[#1a1726] border border-slate-200 dark:border-white/[0.09] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#6e6885] focus:outline-none focus:ring-2 focus:ring-[#a88bfa]/60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Discord gebruikersnaam / tag
                  </label>
                  <div className="relative flex items-center">
                    <MessageSquare className="w-4 h-4 text-[#5865F2] dark:text-[#8ea1e1] absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      value={discordInput}
                      onChange={(e) => setDiscordInput(e.target.value)}
                      placeholder="bijv. naam.dev of naam#1234"
                      className="w-full h-10 pl-9 pr-3.5 rounded-xl bg-slate-50 dark:bg-[#1a1726] border border-slate-200 dark:border-white/[0.09] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#6e6885] focus:outline-none focus:ring-2 focus:ring-[#a88bfa]/60"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  {savedNotice ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      Profielkaart bijgewerkt!
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-[#756f8c]">
                      Direct zichtbaar op je profielkaart en in de ledenlijst
                    </span>
                  )}

                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#a88bfa] hover:bg-[#b79dff] text-[#0f0c18] text-xs sm:text-sm font-semibold cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Koppeling opslaan
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-[#181524] border border-slate-200 dark:border-white/[0.07] space-y-3">
                <p className="text-xs text-slate-600 dark:text-[#9c96b2]">
                  Log in of maak een gratis account aan om je GitHub en Discord aan je eigen
                  profielkaart te koppelen.
                </p>
                <button
                  type="button"
                  onClick={() => onOpenAuth('register')}
                  className="px-4 py-2 rounded-xl bg-[#e8b353] hover:bg-[#f0be63] text-[#141008] text-xs font-bold cursor-pointer"
                >
                  Account aanmaken & koppelen
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3.5 border-t border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between text-xs text-slate-500 dark:text-[#86809e]">
            <span>Gekoppelde leden in de community</span>
            <span className="font-mono tabular-nums text-slate-800 dark:text-slate-200">
              {members.filter((m) => m.githubHandle || m.discordHandle).length} / {members.length}{' '}
              leden
            </span>
          </div>
        </section>
      </div>

      {/* Community Helpers Leaderboard (inclusief GitHub & Discord profielkoppelingen) */}
      <section className="bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#e8b353]" />
            <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">
              Helpers & Reputatieranglijst
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-[#86809e]">
            Inclusief gekoppelde GitHub & Discord profielen
          </span>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-white/[0.06]">
          {leaderboard.map((member, idx) => (
            <div
              key={member.id}
              className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-mono tabular-nums text-slate-400 dark:text-[#6e6885] w-5">
                  #{idx + 1}
                </span>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-[#0f0c18] shrink-0"
                  style={{ backgroundColor: member.avatarColor }}
                >
                  {member.initials}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {member.name}
                    </span>
                    <UserBadges member={member} maxVisible={4} variant="full" />
                  </div>

                  {/* GitHub & Discord links per lid */}
                  {(member.githubHandle || member.discordHandle) && (
                    <div className="flex items-center flex-wrap gap-2 mt-1">
                      {member.githubHandle && (
                        <a
                          href={`https://github.com/${member.githubHandle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#1b1828] hover:bg-slate-200 dark:hover:bg-[#252038] text-[11px] font-mono text-slate-700 dark:text-[#cfc9e6] transition-colors"
                        >
                          <Github className="w-3 h-3 shrink-0" />
                          <span>{member.githubHandle}</span>
                        </a>
                      )}
                      {member.discordHandle && (
                        <button
                          type="button"
                          onClick={() => handleCopyDiscord(member.discordHandle!)}
                          title="Kopieer Discord-tag"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#5865F2]/12 hover:bg-[#5865F2]/20 text-[11px] font-mono text-[#4752C4] dark:text-[#b9c0ff] transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3 h-3 shrink-0" />
                          <span>
                            {copiedDiscord === member.discordHandle
                              ? 'Gekopieerd!'
                              : member.discordHandle}
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0 self-end sm:self-center">
                <div className="font-mono font-bold text-sm tabular-nums text-[#d99b26] dark:text-[#e8b353]">
                  {member.reputation} rep
                </div>
                <div className="text-[11px] text-slate-400 dark:text-[#6e6885] tabular-nums">
                  {member.postsCount} bijdragen
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Automatisch Badge Systeem Catalogus & Unlock-regels */}
      <section className="bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-[#e8b353]" />
            <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">
              Automatisch Badge Systeem · Alle Community Badges
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-[#86809e]">
            Verschijnen automatisch als icoon & label naast je naam in topics, chat en zijbalk
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {BADGE_CATALOG.map((badgeDef) => {
            const userBadges = currentUser ? evaluateMemberBadges(currentUser) : [];
            const isUnlocked = userBadges.some(
              (b) => b.toLowerCase() === badgeDef.id.toLowerCase()
            );
            const toneClasses = getBadgeToneClasses(badgeDef.tone);
            const repProgress =
              currentUser && badgeDef.minReputation
                ? Math.min(100, Math.round((currentUser.reputation / badgeDef.minReputation) * 100))
                : isUnlocked
                  ? 100
                  : 0;

            return (
              <div
                key={badgeDef.id}
                className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                  isUnlocked
                    ? 'bg-slate-50 dark:bg-[#181524] border-slate-200 dark:border-white/[0.1]'
                    : 'bg-slate-50/40 dark:bg-[#15121f] border-slate-200/70 dark:border-white/[0.05] opacity-85'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${toneClasses}`}
                  >
                    {renderBadgeIcon(badgeDef.icon, 'w-4 h-4')}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {badgeDef.label}
                      </span>
                      {isUnlocked ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono font-semibold shrink-0">
                          Vrijgespeeld
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-white/[0.06] text-slate-500 dark:text-[#86809e] text-[10px] font-mono shrink-0">
                          Te verdienen
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-[#9c96b2] mt-1 leading-relaxed">
                      {badgeDef.description}
                    </p>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-200/70 dark:border-white/[0.05] space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-mono text-slate-500 dark:text-[#86809e] truncate">
                      Voorwaarde: {badgeDef.requirementText}
                    </span>
                    {currentUser && badgeDef.minReputation && (
                      <span className="font-mono font-semibold tabular-nums text-[#d99b26] dark:text-[#e8b353] shrink-0">
                        {Math.min(currentUser.reputation, badgeDef.minReputation)} /{' '}
                        {badgeDef.minReputation} rep
                      </span>
                    )}
                  </div>

                  {currentUser && badgeDef.minReputation && (
                    <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#a88bfa] to-[#e8b353] transition-all duration-300"
                        style={{ width: `${repProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export const NewsDetailModal: React.FC<{
  item: NewsItem | null;
  onClose: () => void;
}> = ({ item, onClose }) => {
  if (!item) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs forum-modal-overlay"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.1] rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.07] flex items-center justify-between">
          <span className="text-xs font-semibold text-violet-600 dark:text-[#a88bfa]">
            {item.category} · {item.publishedAt}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#1c1829] text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white leading-snug">
            {item.title}
          </h2>
          <p className="text-sm text-slate-700 dark:text-[#d5d0e6] leading-relaxed whitespace-pre-line">
            {item.body}
          </p>
          <div className="pt-2 text-xs text-slate-500 dark:text-[#86809e]">
            Geschreven door {item.author} · {item.readTime}
          </div>
        </div>
      </div>
    </div>
  );
};

export const SupportModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onContribute: (amount: number) => void;
}> = ({ isOpen, onClose, onContribute }) => {
  const [selected, setSelected] = useState(5);
  const [thanked, setThanked] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onContribute(selected);
    setThanked(true);
    setTimeout(() => {
      setThanked(false);
      onClose();
    }, 1100);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs forum-modal-overlay"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md bg-white dark:bg-[#13111c] forum-card-glow border border-slate-200 dark:border-white/[0.1] rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.07] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-[#e8b353]" />
            <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">
              Steun het forum
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#1c1829] text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 dark:text-[#9c96b2] leading-relaxed">
            Met een kleine bijdrage houd je het forum reclamevrij en help je mee aan snellere
            servers en nieuwe functies.
          </p>

          <div className="grid grid-cols-3 gap-2.5">
            {[3, 5, 10].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setSelected(amount)}
                className={`py-3 rounded-xl font-mono font-bold text-sm border transition-colors cursor-pointer ${
                  selected === amount
                    ? 'bg-[#e8b353]/20 border-[#e8b353] text-amber-700 dark:text-[#f3c66f]'
                    : 'bg-slate-50 dark:bg-[#1a1726] border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-200'
                }`}
              >
                €{amount}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            className="w-full py-2.5 px-4 rounded-xl bg-[#e8b353] hover:bg-[#f0be63] text-[#141008] text-sm font-bold cursor-pointer transition-colors"
          >
            {thanked ? 'Bedankt voor je steun!' : `Bijdrage van €${selected} toevoegen`}
          </button>
        </div>
      </div>
    </div>
  );
};

export const LegalModal: React.FC<{
  type: 'terms' | 'privacy' | null;
  onClose: () => void;
}> = ({ type, onClose }) => {
  if (!type) return null;
  const isTerms = type === 'terms';
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs forum-modal-overlay"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.1] rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.07] flex items-center justify-between">
          <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">
            {isTerms ? 'Algemene voorwaarden' : 'Privacybeleid'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#1c1829] text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 text-sm text-slate-600 dark:text-[#9c96b2] space-y-3 leading-relaxed">
          {isTerms ? (
            <>
              <p>
                Door deel te nemen aan het Forum ga je akkoord met onze gedragsregels: we gaan
                respectvol met elkaar om, delen geen schadelijke code en respecteren auteursrechten.
              </p>
              <p>
                Berichten in de live chat en geplaatste topics blijven zichtbaar voor andere
                bezoekers van de community.
              </p>
            </>
          ) : (
            <>
              <p>
                We verzamelen alleen gegevens die nodig zijn om je account, je berichten en je
                voorkeuren (zoals lichte of donkere weergave) goed te laten werken.
              </p>
              <p>Je gegevens worden nooit verkocht of gedeeld met externe advertentienetwerken.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
