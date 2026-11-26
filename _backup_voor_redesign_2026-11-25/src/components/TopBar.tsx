import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Layers,
  LogOut,
  Megaphone,
  Menu,
  MessageSquareText,
  Moon,
  Palette,
  Plus,
  Search,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import {
  buildCustomThemePalette,
  THEME_ACCENT_PRESETS,
} from '../data/forumData';
import {
  GalleryProject,
  GlowIntensity,
  Member,
  NewsItem,
  ThemeAccentId,
  Topic,
} from '../types/forum';

type SearchScope = 'all' | 'topics' | 'news' | 'projects';

interface SearchResultItem {
  id: string;
  kind: 'topic' | 'news' | 'project';
  title: string;
  subtitle: string;
  meta: string;
  topic?: Topic;
  newsItem?: NewsItem;
  project?: GalleryProject;
}

interface TopBarProps {
  onToggleSidebar: () => void;
  onlineCount: number;
  isDark: boolean;
  onToggleTheme: () => void;
  activeThemeAccent: ThemeAccentId;
  customThemeHex: string;
  glowIntensity: GlowIntensity;
  tintedSurfaces: boolean;
  onSelectThemeAccent: (accent: ThemeAccentId, syncAvatarColor?: boolean) => void;
  onChangeCustomThemeHex: (hex: string) => void;
  onChangeGlowIntensity: (intensity: GlowIntensity) => void;
  onToggleTintedSurfaces: () => void;
  currentUser: Member | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenNewTopic: () => void;
  topics: Topic[];
  news: NewsItem[];
  projects: GalleryProject[];
  onSelectTopic: (topic: Topic) => void;
  onSelectNews: (item: NewsItem) => void;
  onSelectProject: (project: GalleryProject) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onToggleSidebar,
  onlineCount,
  isDark,
  onToggleTheme,
  activeThemeAccent,
  customThemeHex,
  glowIntensity,
  tintedSurfaces,
  onSelectThemeAccent,
  onChangeCustomThemeHex,
  onChangeGlowIntensity,
  onToggleTintedSurfaces,
  currentUser,
  onOpenLogin,
  onLogout,
  onOpenNewTopic,
  topics,
  news,
  projects,
  onSelectTopic,
  onSelectNews,
  onSelectProject,
}) => {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<SearchScope>('all');
  const [isOpen, setIsOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activePalette = useMemo(
    () =>
      activeThemeAccent === 'custom'
        ? buildCustomThemePalette(customThemeHex)
        : THEME_ACCENT_PRESETS.find((p) => p.id === activeThemeAccent) ??
          THEME_ACCENT_PRESETS[0],
    [activeThemeAccent, customThemeHex]
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setMobileSearchOpen(true);
        setIsOpen(true);
        window.setTimeout(() => inputRef.current?.focus(), 0);
      } else if (e.key === '/' && !isTyping) {
        e.preventDefault();
        setMobileSearchOpen(true);
        setIsOpen(true);
        window.setTimeout(() => inputRef.current?.focus(), 0);
      } else if (e.key === 'Escape' && themeMenuOpen) {
        setThemeMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [themeMenuOpen]);

  const results = useMemo<SearchResultItem[]>(() => {
    const q = query.trim().toLowerCase();
    const items: SearchResultItem[] = [];

    if (scope === 'all' || scope === 'topics') {
      topics.forEach((t) => {
        const hay = `${t.title} ${t.excerpt} ${t.body} ${t.categoryLabel} ${t.authorName} ${
          t.codeSnippet?.code ?? ''
        }`.toLowerCase();
        if (!q || hay.includes(q)) {
          items.push({
            id: `topic-${t.id}`,
            kind: 'topic',
            title: t.title,
            subtitle: t.excerpt,
            meta: `Topic · ${t.categoryLabel} · ${t.authorName}`,
            topic: t,
          });
        }
      });
    }

    if (scope === 'all' || scope === 'news') {
      news.forEach((n) => {
        const hay = `${n.title} ${n.summary} ${n.body} ${n.category} ${n.author}`.toLowerCase();
        if (!q || hay.includes(q)) {
          items.push({
            id: `news-${n.id}`,
            kind: 'news',
            title: n.title,
            subtitle: n.summary,
            meta: `Nieuws · ${n.category} · ${n.publishedAt}`,
            newsItem: n,
          });
        }
      });
    }

    if (scope === 'all' || scope === 'projects') {
      projects.forEach((p) => {
        const hay = `${p.title} ${p.description} ${p.stack} ${p.authorName} ${
          p.codeSnippet.code
        }`.toLowerCase();
        if (!q || hay.includes(q)) {
          items.push({
            id: `project-${p.id}`,
            kind: 'project',
            title: p.title,
            subtitle: p.description,
            meta: `Project · ${p.stack} · ${p.authorName}`,
            project: p,
          });
        }
      });
    }

    return q ? items.slice(0, 10) : items.slice(0, 6);
  }, [query, scope, topics, news, projects]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, scope]);

  const handleSelectItem = (item: SearchResultItem) => {
    if (item.kind === 'topic' && item.topic) {
      onSelectTopic(item.topic);
    } else if (item.kind === 'news' && item.newsItem) {
      onSelectNews(item.newsItem);
    } else if (item.kind === 'project' && item.project) {
      onSelectProject(item.project);
    }
    setIsOpen(false);
    setMobileSearchOpen(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setMobileSearchOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && isOpen) {
      e.preventDefault();
      const chosen = results[activeIndex];
      if (chosen) handleSelectItem(chosen);
    }
  };

  const renderIcon = (kind: SearchResultItem['kind']) => {
    if (kind === 'topic') {
      return <MessageSquareText className="w-4 h-4 text-[#a88bfa] shrink-0" />;
    }
    if (kind === 'news') {
      return <Megaphone className="w-4 h-4 text-[#e8b353] shrink-0" />;
    }
    return <Layers className="w-4 h-4 text-emerald-400 shrink-0" />;
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 dark:bg-[#100e18]/90 backdrop-blur-md border-b border-slate-200 dark:border-white/[0.07] px-4 sm:px-6 flex items-center justify-between gap-3 sm:gap-5">
      {/* Left Zone: Hamburger toggle + Title */}
      <div className="flex items-center gap-3.5 shrink-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Zijbalk in- of uitklappen"
          className="w-9 h-9 rounded-lg border border-slate-200 dark:border-white/[0.09] bg-slate-100/80 dark:bg-[#161322] hover:bg-slate-200/80 dark:hover:bg-[#1e1a2e] text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors duration-150 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a88bfa]"
        >
          <Menu className="w-4 h-4" />
        </button>

        <span className="font-display font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0">
          Forum
        </span>
      </div>

      {/* Center Zone: Global Search Bar (Topics, Nieuws & Projecten) */}
      <div
        ref={containerRef}
        className={`${
          mobileSearchOpen
            ? 'fixed inset-x-3 top-3 z-50 md:static md:inset-auto md:flex-1 md:max-w-md'
            : 'hidden md:block flex-1 max-w-md'
        } relative`}
      >
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 dark:text-[#7c7694] absolute left-3.5 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={isOpen}
            aria-label="Zoek door topics, nieuwsartikelen en projecten"
            value={query}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Zoek topics, nieuws of projecten..."
            className="w-full h-10 pl-10 pr-16 rounded-xl bg-slate-100 dark:bg-[#161322] border border-slate-200 dark:border-white/[0.09] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#6e6885] focus:outline-none focus:ring-2 focus:ring-[#a88bfa]/60 focus:border-[#a88bfa]/60 transition-colors"
          />

          <div className="absolute right-2.5 flex items-center gap-1.5">
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                aria-label="Zoekopdracht wissen"
                className="w-6 h-6 rounded-md hover:bg-slate-200 dark:hover:bg-white/[0.08] text-slate-500 dark:text-[#8d87a4] flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded-md border border-slate-300/80 dark:border-white/[0.1] bg-white dark:bg-[#1e1a2e] text-[10px] font-mono text-slate-400 dark:text-[#7c7694]">
                /
              </kbd>
            )}

            {mobileSearchOpen && (
              <button
                type="button"
                onClick={() => {
                  setMobileSearchOpen(false);
                  setIsOpen(false);
                }}
                aria-label="Sluit zoeken"
                className="md:hidden w-6 h-6 rounded-md text-slate-500 dark:text-[#8d87a4] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search Results Dropdown */}
        {isOpen && (
          <div className="absolute left-0 right-0 mt-2 rounded-2xl bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.1] shadow-2xl overflow-hidden z-50">
            {/* Scope Filter Bar */}
            <div className="px-3 py-2 border-b border-slate-200 dark:border-white/[0.07] bg-slate-50/80 dark:bg-[#171422] flex items-center gap-1 overflow-x-auto">
              {(
                [
                  { id: 'all', label: 'Alles' },
                  { id: 'topics', label: 'Topics' },
                  { id: 'news', label: 'Nieuws' },
                  { id: 'projects', label: 'Projecten' },
                ] as { id: SearchScope; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setScope(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    scope === tab.id
                      ? 'bg-white dark:bg-[#262138] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-[#8d87a4] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Matching Results */}
            <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-200/70 dark:divide-white/[0.05]">
              {results.length === 0 ? (
                <div className="px-4 py-7 text-center">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Geen resultaten voor &ldquo;{query}&rdquo;
                  </p>
                  <p className="text-xs text-slate-500 dark:text-[#86809e] mt-1">
                    Probeer een ander trefwoord of kies een breder filter.
                  </p>
                </div>
              ) : (
                results.map((item, idx) => {
                  const isHighlighted = idx === activeIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => handleSelectItem(item)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors cursor-pointer ${
                        isHighlighted
                          ? 'bg-slate-100 dark:bg-[#1d192b]'
                          : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="mt-0.5">{renderIcon(item.kind)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {item.title}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-[#8d87a4] truncate mt-0.5">
                          {item.subtitle}
                        </div>
                        <div className="text-[11px] text-violet-600 dark:text-[#a88bfa] mt-1">
                          {item.meta}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Zone: Mobile Search Button + Live online counter + Thema Studio + Theme switch + Primary Action */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        <button
          type="button"
          onClick={() => {
            setMobileSearchOpen(true);
            setIsOpen(true);
            window.setTimeout(() => inputRef.current?.focus(), 0);
          }}
          aria-label="Zoeken openen"
          className="md:hidden w-9 h-9 rounded-full border border-slate-200 dark:border-white/[0.09] bg-slate-100 dark:bg-[#161322] text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer shrink-0"
        >
          <Search className="w-4 h-4" />
        </button>

        <div
          className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-[#9c96b2] mr-1 whitespace-nowrap shrink-0"
          title="Actieve leden en meelezers op dit moment"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" aria-hidden="true" />
          <span className="tabular-nums">{onlineCount} online</span>
        </div>

        {/* Thema Studio Popover Trigger */}
        <div ref={themeMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setThemeMenuOpen((prev) => !prev)}
            aria-label="Thema & kleuren aanpassen"
            aria-expanded={themeMenuOpen}
            title={`Thema Studio (${activePalette.label})`}
            className="h-9 px-2.5 rounded-full border border-slate-200 dark:border-white/[0.09] bg-slate-100 dark:bg-[#161322] hover:bg-slate-200 dark:hover:bg-[#1e1a2e] text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors duration-150 cursor-pointer shrink-0"
          >
            <Palette className="w-4 h-4" />
            <span
              className="w-3 h-3 rounded-full ring-1 ring-black/15 dark:ring-white/30 shrink-0"
              style={{ backgroundColor: activePalette.hex }}
            />
          </button>

          {themeMenuOpen && (
            <div
              role="dialog"
              aria-label="Thema Studio"
              className="absolute right-0 mt-2.5 w-80 rounded-2xl bg-white dark:bg-[#13111c] forum-card-glow border border-slate-200 dark:border-white/[0.12] shadow-2xl p-4 space-y-4 z-50"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#a88bfa]" />
                  <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white">
                    Thema Studio
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-slate-400 dark:text-[#86809e]">
                  {activePalette.label}
                </span>
              </div>

              {/* Preset Color Swatches */}
              <div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Kies themakleur
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {THEME_ACCENT_PRESETS.map((preset) => {
                    const isSelected = activeThemeAccent === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onSelectThemeAccent(preset.id, true)}
                        title={preset.label}
                        className={`h-9 rounded-xl flex items-center justify-center transition-transform cursor-pointer ${
                          isSelected
                            ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#13111c] ring-slate-900 dark:ring-white scale-105'
                            : 'opacity-85 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: preset.hex }}
                      >
                        {isSelected && <Check className="w-4 h-4 text-[#0f0c18] stroke-[2.5]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Hex Color Picker */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/80 dark:border-white/[0.07]">
                <div className="text-xs">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    Eigen Hex-kleur
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 dark:text-[#86809e]">
                    {customThemeHex.toUpperCase()}
                  </div>
                </div>

                <label className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1a1726] border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer">
                  <input
                    type="color"
                    value={customThemeHex}
                    onChange={(e) => onChangeCustomThemeHex(e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
                  />
                  <span>Kies kleur</span>
                </label>
              </div>

              {/* Glow Intensity Selector */}
              <div className="pt-2 border-t border-slate-200/80 dark:border-white/[0.07]">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Kaart-gloed intensiteit
                </div>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#1a1726]">
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
                      className={`py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
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

              {/* Dark Surface Tint & Light/Dark Toggle */}
              <div className="pt-2 border-t border-slate-200/80 dark:border-white/[0.07] space-y-2.5">
                <label className="flex items-center justify-between gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <span>Sfeervolle achtergrondtint (donker)</span>
                  <input
                    type="checkbox"
                    checked={tintedSurfaces}
                    onChange={onToggleTintedSurfaces}
                    className="w-4 h-4 rounded accent-[#a88bfa] cursor-pointer"
                  />
                </label>

                <button
                  type="button"
                  onClick={onToggleTheme}
                  className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-[#1a1726] hover:bg-slate-200 dark:hover:bg-[#242036] text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between cursor-pointer"
                >
                  <span>Weergavemodus</span>
                  <span className="inline-flex items-center gap-1.5 text-violet-600 dark:text-[#a88bfa]">
                    {isDark ? (
                      <>
                        <Moon className="w-3.5 h-3.5" /> Donker
                      </>
                    ) : (
                      <>
                        <Sun className="w-3.5 h-3.5 text-amber-500" /> Licht
                      </>
                    )}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Schakel naar lichte modus' : 'Schakel naar donkere modus'}
          title={isDark ? 'Lichte modus' : 'Donkere modus'}
          className="w-9 h-9 rounded-full border border-slate-200 dark:border-white/[0.09] bg-slate-100 dark:bg-[#161322] hover:bg-slate-200 dark:hover:bg-[#1e1a2e] text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors duration-150 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a88bfa]"
        >
          {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-500" />}
        </button>

        {currentUser ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenNewTopic}
              aria-label="Nieuw topic"
              className="h-9 px-2.5 sm:px-3.5 rounded-xl bg-[#a88bfa] hover:bg-[#b79dff] text-[#0f0c18] text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a88bfa]"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nieuw topic</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              title="Uitloggen"
              aria-label="Uitloggen"
              className="w-9 h-9 rounded-xl border border-slate-200 dark:border-white/[0.09] bg-slate-100 dark:bg-[#161322] hover:bg-slate-200 dark:hover:bg-[#1e1a2e] text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors duration-150 cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenLogin}
            className="px-4 py-2 rounded-xl bg-[#a88bfa] hover:bg-[#b79dff] text-[#0f0c18] text-xs sm:text-sm font-semibold transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a88bfa]"
          >
            Inloggen
          </button>
        )}
      </div>
    </header>
  );
};

