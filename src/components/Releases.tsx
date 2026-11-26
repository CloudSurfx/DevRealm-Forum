import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  FileArchive,
  GitBranch,
  Github,
  ImagePlus,
  Link2,
  Loader2,
  MessageSquare,
  Package,
  Plus,
  Scale,
  Search,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { Member, Release, ReleaseCategoryId, ReleaseVersion } from '../types/forum';
import {
  IMAGE_EXTENSIONS,
  MAX_IMAGE_BYTES,
  MAX_RELEASE_FILE_BYTES,
  RELEASE_CATEGORIES,
  RELEASE_FILE_EXTENSIONS,
  RELEASE_LICENSES,
  releaseCategoryColor,
  releaseCategoryLabel,
} from '../data/releasesData';
import {
  addReleaseComment,
  addReleaseVersion,
  deleteRelease,
  deleteReleaseComment,
  downloadReleaseVersion,
  fileExtension,
  formatBytes,
  getRelease,
  listReleases,
  publishRelease,
  registerReleaseView,
  toggleReleaseStar,
} from '../lib/releasesApi';
import { describeError } from '../lib/errors';
import { isSupabaseConfigured } from '../lib/supabase';
import { RichTopicBody } from './RichTopicBody';
import { UserBadges } from './UserBadges';

// ---------------------------------------------------------------------------
// Hulpjes
// ---------------------------------------------------------------------------
const card = 'bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.08] rounded-2xl';
const input =
  'w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-[#1a1726] border border-slate-200 dark:border-white/[0.09] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#6a6b6c] focus:outline-none focus:ring-2 focus:ring-[#a88bfa]/60';
const label = 'block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5';
const muted = 'text-slate-500 dark:text-[#9c9c9d]';

function releaseSlugFromPath(): string | null {
  const m = window.location.pathname.match(/^\/releases\/([^/]+)\/?$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function isModerator(user: Member | null): boolean {
  return user?.role === 'Beheerder' || user?.role === 'Moderator';
}

function canManage(release: Release, user: Member | null): boolean {
  if (!user) return false;
  if (isModerator(user)) return true;
  if (release.authorId) return release.authorId === user.id;
  return release.authorName === user.name;
}

function openUrl(url: string) {
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

const compact = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.', ',')}k` : String(n);

// ---------------------------------------------------------------------------
// Omslag: echte afbeelding, of een gegenereerde kaart in de categoriekleur
// ---------------------------------------------------------------------------
const ReleaseCover: React.FC<{ release: Release; className?: string; large?: boolean }> = ({
  release,
  className = '',
  large = false,
}) => {
  const color = releaseCategoryColor(release.category);
  if (release.coverUrl) {
    return (
      <div className={`relative overflow-hidden bg-slate-200 dark:bg-[#1a1726] ${className}`}>
        <img src={release.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      </div>
    );
  }
  const initials = release.title
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        backgroundImage: `radial-gradient(circle at 80% 20%, ${color}55, transparent 55%), radial-gradient(circle at 10% 90%, ${color}33, transparent 50%), linear-gradient(135deg, #1a1530, #0c0d10)`,
      }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)',
          backgroundSize: large ? '28px 28px' : '20px 20px',
          maskImage: 'radial-gradient(circle at 50% 50%, black, transparent 75%)',
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={`${large ? 'w-20 h-20 text-2xl' : 'w-14 h-14 text-lg'} rounded-2xl flex items-center justify-center font-display font-black text-white shadow-lg`}
          style={{ background: `linear-gradient(135deg, ${color}, ${color}99)`, boxShadow: `0 12px 30px -10px ${color}` }}
        >
          {initials || <Package className="w-6 h-6" />}
        </div>
      </div>
    </div>
  );
};

const CategoryChip: React.FC<{ id: string; onDark?: boolean }> = ({ id, onDark }) => {
  const color = releaseCategoryColor(id);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
        onDark ? 'backdrop-blur-sm bg-black/40 text-white border-white/15' : ''
      }`}
      style={onDark ? undefined : { color, borderColor: `${color}55`, backgroundColor: `${color}18` }}
    >
      {releaseCategoryLabel(id)}
    </span>
  );
};

const Avatar: React.FC<{ initials: string; color: string; size?: string }> = ({ initials, color, size = 'w-6 h-6 text-[10px]' }) => (
  <span
    className={`${size} rounded-lg inline-flex items-center justify-center font-bold text-[#0c0d10] shrink-0`}
    style={{ backgroundColor: color }}
  >
    {initials}
  </span>
);

// ---------------------------------------------------------------------------
// Kaart in het overzicht
// ---------------------------------------------------------------------------
const ReleaseCard: React.FC<{
  release: Release;
  onlineMembers: Member[];
  onOpen: () => void;
}> = ({ release, onlineMembers, onOpen }) => (
  <article className={`${card} overflow-hidden flex flex-col group hover:border-[#a88bfa]/50 transition-colors`}>
    <button type="button" onClick={onOpen} className="relative block text-left cursor-pointer" aria-label={`Open ${release.title}`}>
      <ReleaseCover release={release} className="h-36" />
      <div className="absolute top-3 left-3 flex items-center gap-1.5">
        <CategoryChip id={release.category} onDark />
        {release.featured && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#e8b353] text-[#1a1206]">
            <Sparkles className="w-3 h-3" /> Uitgelicht
          </span>
        )}
      </div>
      {release.latestVersion && (
        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-black/50 text-white border border-white/15 backdrop-blur-sm">
          v{release.latestVersion}
        </span>
      )}
    </button>

    <div className="p-4 flex-1 flex flex-col">
      <button type="button" onClick={onOpen} className="text-left cursor-pointer">
        <h3 className="font-display font-bold text-base text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-[#a88bfa] transition-colors line-clamp-1">
          {release.title}
        </h3>
      </button>
      <p className={`text-sm mt-1 line-clamp-2 leading-relaxed ${muted}`}>{release.tagline || 'Geen omschrijving.'}</p>

      {release.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {release.tags.slice(0, 4).map((t) => (
            <span key={t} className="px-1.5 py-0.5 rounded-md text-[11px] font-mono bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-[#b4aecb]">
              #{t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto pt-4 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <Avatar initials={release.authorInitials} color={release.authorColor} />
          <span className="truncate font-medium text-slate-700 dark:text-slate-200">{release.authorName}</span>
          <UserBadges authorName={release.authorName} onlineMembers={onlineMembers} maxVisible={1} showOverflowCount={false} variant="icon-only" />
        </div>
        <div className={`flex items-center gap-3 shrink-0 tabular-nums ${muted}`}>
          <span className="inline-flex items-center gap-1" title="Downloads">
            <Download className="w-3.5 h-3.5" /> {compact(release.downloads)}
          </span>
          <span className={`inline-flex items-center gap-1 ${release.starredByMe ? 'text-[#e8b353]' : ''}`} title="Sterren">
            <Star className="w-3.5 h-3.5" fill={release.starredByMe ? 'currentColor' : 'none'} /> {compact(release.stars)}
          </span>
        </div>
      </div>
    </div>
  </article>
);

// ---------------------------------------------------------------------------
// Overzichtspagina /releases (en detailpagina /releases/<slug>)
// ---------------------------------------------------------------------------
type SortKey = 'new' | 'stars' | 'downloads' | 'updated';

export const ReleasesView: React.FC<{
  currentUser: Member | null;
  onlineMembers: Member[];
  onOpenAuth: (mode: 'login' | 'register') => void;
}> = ({ currentUser, onlineMembers, onOpenAuth }) => {
  const [slug, setSlug] = useState<string | null>(() => releaseSlugFromPath());
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<ReleaseCategoryId | 'all' | 'mine'>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('new');
  const [publishOpen, setPublishOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setReleases(await listReleases());
      setError(null);
    } catch (err) {
      setError(describeError(err, 'De releases konden niet worden geladen.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onPop = () => setSlug(releaseSlugFromPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const openRelease = (target: string) => {
    window.history.pushState({}, '', `/releases/${encodeURIComponent(target)}`);
    setSlug(target);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const backToList = () => {
    window.history.pushState({}, '', '/releases');
    setSlug(null);
    void load();
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = releases.filter((r) => {
      if (category === 'mine') {
        if (!currentUser) return false;
        if (r.authorId ? r.authorId !== currentUser.id : r.authorName !== currentUser.name) return false;
      } else if (category !== 'all' && r.category !== category) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.tagline.toLowerCase().includes(q) ||
        r.authorName.toLowerCase().includes(q) ||
        r.tags.some((t) => t.includes(q))
      );
    });
    list = [...list].sort((a, b) => {
      if (sort === 'stars') return b.stars - a.stars;
      if (sort === 'downloads') return b.downloads - a.downloads;
      return b.createdAtIso.localeCompare(a.createdAtIso);
    });
    return list;
  }, [releases, category, query, sort, currentUser]);

  const featured = releases.find((r) => r.featured);
  const totalDownloads = releases.reduce((sum, r) => sum + r.downloads, 0);

  const handleOpenPublish = () => {
    if (!currentUser) {
      onOpenAuth('login');
      return;
    }
    setPublishOpen(true);
  };

  if (slug) {
    return (
      <ReleaseDetail
        key={slug}
        slug={slug}
        currentUser={currentUser}
        onlineMembers={onlineMembers}
        onBack={backToList}
        onOpenAuth={onOpenAuth}
      />
    );
  }

  return (
    <>
      {/* Kop */}
      <section className={`${card} forum-hero-glow p-6 sm:p-8 overflow-hidden`}>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-[#a88bfa] flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" /> Releases
            </p>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight mt-2">
              Deel wat je hebt gebouwd
            </h1>
            <p className={`text-sm sm:text-base mt-2 max-w-xl leading-relaxed ${muted}`}>
              CMS’en, bots, tools, games en designs van leden. Download ze, geef een ster of laat een
              reactie achter. Klaar met iets moois? Publiceer je eigen release.
            </p>
          </div>
          <div className="flex items-center gap-6 shrink-0">
            <div>
              <div className={`text-xs ${muted}`}>Releases</div>
              <div className="font-display font-bold text-2xl text-slate-900 dark:text-white tabular-nums">{releases.length}</div>
            </div>
            <div>
              <div className={`text-xs ${muted}`}>Downloads</div>
              <div className="font-display font-bold text-2xl text-[#d99b26] dark:text-[#e8b353] tabular-nums">{compact(totalDownloads)}</div>
            </div>
            <button
              type="button"
              onClick={handleOpenPublish}
              className="h-11 px-5 rounded-xl bg-[#e8b353] hover:bg-[#f0be63] text-[#141008] text-sm font-bold inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Upload className="w-4 h-4" /> Release publiceren
            </button>
          </div>
        </div>
      </section>

      {/* Uitgelicht */}
      {featured && category === 'all' && !query && (
        <button
          type="button"
          onClick={() => openRelease(featured.slug)}
          className={`${card} w-full overflow-hidden grid grid-cols-1 sm:grid-cols-[260px_minmax(0,1fr)] text-left cursor-pointer group hover:border-[#e8b353]/60 transition-colors`}
        >
          <ReleaseCover release={featured} className="h-40 sm:h-full min-h-[160px]" large />
          <div className="p-5 sm:p-6 min-w-0">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#e8b353] text-[#1a1206]">
              <Sparkles className="w-3 h-3" /> Uitgelichte release
            </span>
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white mt-3 group-hover:text-violet-600 dark:group-hover:text-[#a88bfa] transition-colors">
              {featured.title}
              {featured.latestVersion && <span className={`ml-2 text-sm font-mono font-medium ${muted}`}>v{featured.latestVersion}</span>}
            </h2>
            <p className={`text-sm mt-1.5 line-clamp-2 ${muted}`}>{featured.tagline}</p>
            <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 text-xs ${muted}`}>
              <span className="inline-flex items-center gap-1.5">
                <Avatar initials={featured.authorInitials} color={featured.authorColor} size="w-5 h-5 text-[9px]" />
                <span className="font-medium text-slate-700 dark:text-slate-200">{featured.authorName}</span>
              </span>
              <span className="inline-flex items-center gap-1"><Download className="w-3.5 h-3.5" /> {featured.downloads} downloads</span>
              <span className="inline-flex items-center gap-1"><Star className="w-3.5 h-3.5" /> {featured.stars}</span>
              <CategoryChip id={featured.category} />
            </div>
          </div>
        </button>
      )}

      {/* Filters */}
      <section className={`${card} p-4 sm:p-5 space-y-3`}>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Zoek op naam, tag of maker..."
              aria-label="Releases zoeken"
              className={`${input} pl-9`}
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sorteren"
            className={`${input} sm:w-48 cursor-pointer`}
          >
            <option value="new">Nieuwste eerst</option>
            <option value="stars">Meeste sterren</option>
            <option value="downloads">Meest gedownload</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Categorie">
          {[{ id: 'all', label: 'Alles' }, ...RELEASE_CATEGORIES, ...(currentUser ? [{ id: 'mine', label: 'Mijn releases' }] : [])].map((c) => {
            const active = category === c.id;
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategory(c.id as typeof category)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#a88bfa]/15 text-violet-700 dark:text-white ring-1 ring-[#a88bfa]/50'
                    : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-[#9c9c9d] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </section>

      {error && (
        <div role="alert" className="rounded-xl border border-red-300/60 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`${card} h-[290px] animate-pulse`} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className={`${card} p-10 text-center`}>
          <Package className="w-10 h-10 mx-auto text-slate-300 dark:text-white/20" />
          <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white mt-3">
            {releases.length === 0 ? 'Nog geen releases' : 'Niets gevonden'}
          </h3>
          <p className={`text-sm mt-1 ${muted}`}>
            {releases.length === 0
              ? 'Wees de eerste die iets deelt met de community.'
              : 'Probeer een andere zoekterm of categorie.'}
          </p>
          {releases.length === 0 && (
            <button
              type="button"
              onClick={handleOpenPublish}
              className="mt-5 h-10 px-4 rounded-xl bg-[#e8b353] hover:bg-[#f0be63] text-[#141008] text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" /> Release publiceren
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {visible.map((r) => (
            <ReleaseCard key={r.id} release={r} onlineMembers={onlineMembers} onOpen={() => openRelease(r.slug)} />
          ))}
        </div>
      )}

      {publishOpen && currentUser && (
        <PublishReleaseModal
          author={currentUser}
          onClose={() => setPublishOpen(false)}
          onPublished={(newSlug) => {
            setPublishOpen(false);
            void load();
            openRelease(newSlug);
          }}
        />
      )}
    </>
  );
};

// ---------------------------------------------------------------------------
// Detailpagina
// ---------------------------------------------------------------------------
const ReleaseDetail: React.FC<{
  slug: string;
  currentUser: Member | null;
  onlineMembers: Member[];
  onBack: () => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
}> = ({ slug, currentUser, onlineMembers, onBack, onOpenAuth }) => {
  const [release, setRelease] = useState<Release | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [versionOpen, setVersionOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState('');
  const [lightbox, setLightbox] = useState<number | null>(null);
  const viewed = useRef(false);

  const load = useCallback(async () => {
    try {
      const r = await getRelease(slug);
      if (!r) {
        setState('missing');
        return;
      }
      setRelease(r);
      setState('ready');
      if (!viewed.current) {
        viewed.current = true;
        void registerReleaseView(r.id).catch(() => undefined);
      }
    } catch (err) {
      setError(describeError(err, 'Deze release kon niet worden geladen.'));
      setState('error');
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === 'loading') {
    return (
      <div className="space-y-4">
        <div className={`${card} h-64 animate-pulse`} />
        <div className={`${card} h-40 animate-pulse`} />
      </div>
    );
  }

  if (state !== 'ready' || !release) {
    return (
      <div className={`${card} p-10 text-center`}>
        <Package className="w-10 h-10 mx-auto text-slate-300 dark:text-white/20" />
        <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white mt-3">
          {state === 'missing' ? 'Deze release bestaat niet (meer)' : 'Er ging iets mis'}
        </h2>
        {error && <p className={`text-sm mt-1 ${muted}`}>{error}</p>}
        <button type="button" onClick={onBack} className="mt-5 h-10 px-4 rounded-xl bg-slate-100 dark:bg-[#1c1829] text-sm font-semibold text-slate-900 dark:text-white inline-flex items-center gap-2 cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Terug naar releases
        </button>
      </div>
    );
  }

  const latest = release.versions?.[0];
  const manage = canManage(release, currentUser);

  const handleDownload = async (version: ReleaseVersion) => {
    setNotice(null);
    try {
      const url = await downloadReleaseVersion(version);
      setRelease((prev) =>
        prev
          ? {
              ...prev,
              downloads: prev.downloads + 1,
              versions: prev.versions?.map((v) => (v.id === version.id ? { ...v, downloads: v.downloads + 1 } : v)),
            }
          : prev
      );
      if (url) openUrl(url);
      else setNotice('In demo-modus zit er geen echt bestand achter deze voorbeeldrelease. De download is wel geteld.');
    } catch (err) {
      setNotice(describeError(err, 'De download kon niet worden gestart.'));
    }
  };

  const handleStar = async () => {
    if (!currentUser) {
      onOpenAuth('login');
      return;
    }
    const next = !release.starredByMe;
    setRelease({ ...release, starredByMe: next, stars: Math.max(0, release.stars + (next ? 1 : -1)) });
    try {
      await toggleReleaseStar(release, next);
    } catch (err) {
      setRelease(release);
      setNotice(describeError(err, 'Je ster kon niet worden opgeslagen.'));
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth('login');
      return;
    }
    const body = comment.trim();
    if (!body) return;
    setBusy(true);
    try {
      await addReleaseComment(release.id, body, currentUser);
      setComment('');
      await load();
    } catch (err) {
      setNotice(describeError(err, 'Je reactie kon niet worden geplaatst.'));
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteComment = async (id: string) => {
    try {
      await deleteReleaseComment(release.id, id);
      await load();
    } catch (err) {
      setNotice(describeError(err, 'De reactie kon niet worden verwijderd.'));
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await deleteRelease(release);
      onBack();
    } catch (err) {
      setNotice(describeError(err, 'De release kon niet worden verwijderd.'));
      setBusy(false);
    }
  };

  const shots = release.screenshotUrls;

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className={`inline-flex items-center gap-1.5 text-sm font-medium cursor-pointer hover:text-slate-900 dark:hover:text-white ${muted}`}
      >
        <ArrowLeft className="w-4 h-4" /> Alle releases
      </button>

      {/* Kop */}
      <section className={`${card} overflow-hidden`}>
        <ReleaseCover release={release} className="h-44 sm:h-56" large />
        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryChip id={release.category} />
            {release.featured && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#e8b353] text-[#1a1206]">
                <Sparkles className="w-3 h-3" /> Uitgelicht
              </span>
            )}
            {release.hidden && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-500/15 text-red-600 dark:text-red-300 border border-red-500/30">
                Verborgen door een moderator
              </span>
            )}
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight mt-3">
            {release.title}
            {release.latestVersion && (
              <span className={`ml-3 align-middle text-base font-mono font-medium ${muted}`}>v{release.latestVersion}</span>
            )}
          </h1>
          {release.tagline && <p className={`text-base mt-2 leading-relaxed ${muted}`}>{release.tagline}</p>}

          <div className="flex flex-wrap items-center gap-2 mt-5">
            {latest && (
              <button
                type="button"
                onClick={() => void handleDownload(latest)}
                className="h-11 px-5 rounded-xl bg-[#e8b353] hover:bg-[#f0be63] text-[#141008] text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                {latest.filePath || latest.fileName ? `Download v${latest.version}` : `Naar download v${latest.version}`}
                {latest.fileSize ? <span className="font-medium opacity-70">· {formatBytes(latest.fileSize)}</span> : null}
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleStar()}
              aria-pressed={release.starredByMe}
              className={`h-11 px-4 rounded-xl border text-sm font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors ${
                release.starredByMe
                  ? 'bg-[#e8b353]/15 border-[#e8b353]/50 text-[#b07a12] dark:text-[#f2c46d]'
                  : 'bg-slate-50 dark:bg-[#1c1829] border-slate-200 dark:border-white/[0.09] text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-[#222327]'
              }`}
            >
              <Star className="w-4 h-4" fill={release.starredByMe ? 'currentColor' : 'none'} />
              {release.starredByMe ? 'Ster gegeven' : 'Ster geven'}
              <span className="tabular-nums opacity-70">{release.stars}</span>
            </button>
            {release.githubUrl && (
              <a
                href={release.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 px-4 rounded-xl bg-slate-50 dark:bg-[#1c1829] border border-slate-200 dark:border-white/[0.09] hover:bg-slate-100 dark:hover:bg-[#222327] text-sm font-semibold text-slate-800 dark:text-white inline-flex items-center gap-2"
              >
                <Github className="w-4 h-4" /> Broncode
              </a>
            )}
            {release.demoUrl && (
              <a
                href={release.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 px-4 rounded-xl bg-slate-50 dark:bg-[#1c1829] border border-slate-200 dark:border-white/[0.09] hover:bg-slate-100 dark:hover:bg-[#222327] text-sm font-semibold text-slate-800 dark:text-white inline-flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" /> Live demo
              </a>
            )}
          </div>

          {notice && (
            <div role="status" className="mt-4 rounded-xl border border-[#e8b353]/40 bg-[#e8b353]/10 px-4 py-2.5 text-sm text-amber-800 dark:text-[#f2c46d]">
              {notice}
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          {/* Screenshots */}
          {shots.length > 0 && (
            <section className={`${card} p-5`}>
              <h2 className="font-display font-bold text-base text-slate-900 dark:text-white mb-3">Screenshots</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {shots.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setLightbox(i)}
                    className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-white/[0.08] cursor-zoom-in"
                  >
                    <img src={url} alt={`Screenshot ${i + 1} van ${release.title}`} className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-300" loading="lazy" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Beschrijving */}
          <section className={`${card} p-5 sm:p-6`}>
            <h2 className="font-display font-bold text-base text-slate-900 dark:text-white mb-3">Over dit project</h2>
            <div className="text-sm leading-relaxed text-slate-700 dark:text-[#cfc9e3] space-y-2">
              {release.description ? <RichTopicBody body={release.description} /> : <p className={muted}>De maker heeft nog geen beschrijving geschreven.</p>}
            </div>
          </section>

          {/* Versies */}
          <section className={`${card} p-5 sm:p-6`}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-[#a88bfa]" /> Versies
                <span className={`text-xs font-medium ${muted}`}>{release.versions?.length ?? 0}</span>
              </h2>
              {manage && (
                <button
                  type="button"
                  onClick={() => setVersionOpen(true)}
                  className="h-9 px-3 rounded-lg bg-[#a88bfa] hover:bg-[#b79dff] text-[#0c0d10] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Nieuwe versie
                </button>
              )}
            </div>
            <ol className="relative border-l border-slate-200 dark:border-white/[0.08] ml-2 space-y-5">
              {(release.versions ?? []).map((v, i) => (
                <li key={v.id} className="pl-5 relative">
                  <span
                    className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-[#13111c] ${i === 0 ? 'bg-[#a88bfa]' : 'bg-slate-300 dark:bg-white/20'}`}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">v{v.version}</span>
                      {i === 0 && <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">Nieuwste</span>}
                      <span className={`text-xs ${muted}`}>{v.createdAt}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDownload(v)}
                      className="h-8 px-3 rounded-lg bg-slate-100 dark:bg-[#1c1829] hover:bg-slate-200 dark:hover:bg-[#26272b] text-xs font-semibold text-slate-800 dark:text-white inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      {v.externalUrl && !v.fileName ? <Link2 className="w-3.5 h-3.5" /> : <FileArchive className="w-3.5 h-3.5" />}
                      {v.fileName ? v.fileName : 'Downloadlink'}
                      {v.fileSize ? <span className={muted}>{formatBytes(v.fileSize)}</span> : null}
                      <span className={`tabular-nums ${muted}`}>· {v.downloads}×</span>
                    </button>
                  </div>
                  {v.changelog && (
                    <div className="mt-2 text-sm text-slate-700 dark:text-[#cfc9e3]">
                      <RichTopicBody body={v.changelog} />
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </section>

          {/* Reacties */}
          <section className={`${card} p-5 sm:p-6`}>
            <h2 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-[#a88bfa]" /> Reacties
              <span className={`text-xs font-medium ${muted}`}>{release.comments?.length ?? 0}</span>
            </h2>
            <div className="space-y-4">
              {(release.comments ?? []).length === 0 && (
                <p className={`text-sm ${muted}`}>Nog geen reacties. Werkt het bij jou? Laat het de maker weten.</p>
              )}
              {(release.comments ?? []).map((c) => (
                <div key={c.id} className="flex gap-3">
                  <Avatar initials={c.authorInitials} color={c.authorColor} size="w-8 h-8 text-[11px]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white">{c.authorName}</span>
                      <UserBadges authorName={c.authorName} onlineMembers={onlineMembers} maxVisible={2} showOverflowCount={false} />
                      {c.authorName === release.authorName && (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#a88bfa]/15 text-violet-700 dark:text-[#d5c6ff]">Maker</span>
                      )}
                      <span className={muted}>{c.createdAt}</span>
                      {currentUser && (c.authorId === currentUser.id || c.authorName === currentUser.name || isModerator(currentUser)) && (
                        <button
                          type="button"
                          onClick={() => void handleDeleteComment(c.id)}
                          className={`ml-auto inline-flex items-center gap-1 hover:text-red-500 cursor-pointer ${muted}`}
                          aria-label="Reactie verwijderen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 dark:text-[#cfc9e3] mt-1 whitespace-pre-wrap break-words">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleComment} className="mt-5 flex flex-col sm:flex-row gap-2">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                maxLength={5000}
                placeholder={currentUser ? 'Schrijf een reactie...' : 'Log in om te reageren'}
                aria-label="Reactie"
                onFocus={() => !currentUser && onOpenAuth('login')}
                className={`${input} h-auto py-2.5 resize-y flex-1`}
              />
              <button
                type="submit"
                disabled={busy || !comment.trim()}
                className="h-10 sm:self-end px-4 rounded-xl bg-[#a88bfa] hover:bg-[#b79dff] disabled:opacity-50 text-[#0c0d10] text-sm font-bold cursor-pointer disabled:cursor-not-allowed"
              >
                Plaatsen
              </button>
            </form>
          </section>
        </div>

        {/* Zijkolom met info */}
        <aside className="space-y-4">
          <section className={`${card} p-5`}>
            <div className="flex items-center gap-3">
              <Avatar initials={release.authorInitials} color={release.authorColor} size="w-11 h-11 text-sm" />
              <div className="min-w-0">
                <div className={`text-xs ${muted}`}>Gemaakt door</div>
                <div className="font-semibold text-slate-900 dark:text-white truncate">{release.authorName}</div>
              </div>
            </div>
            <div className="mt-3">
              <UserBadges authorName={release.authorName} onlineMembers={onlineMembers} maxVisible={3} />
            </div>
          </section>

          <section className={`${card} p-5`}>
            <dl className="space-y-3 text-sm">
              {[
                { icon: Download, label: 'Downloads', value: String(release.downloads) },
                { icon: Star, label: 'Sterren', value: String(release.stars) },
                { icon: Eye, label: 'Bekeken', value: String(release.views) },
                { icon: Calendar, label: 'Gepubliceerd', value: release.createdAt },
                { icon: GitBranch, label: 'Laatste update', value: release.updatedAt },
                ...(release.license ? [{ icon: Scale, label: 'Licentie', value: release.license }] : []),
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3">
                  <dt className={`inline-flex items-center gap-2 ${muted}`}>
                    <row.icon className="w-4 h-4" /> {row.label}
                  </dt>
                  <dd className="font-semibold text-slate-900 dark:text-white tabular-nums text-right">{row.value}</dd>
                </div>
              ))}
            </dl>
            {release.tags.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/[0.07]">
                <div className={`text-xs mb-2 inline-flex items-center gap-1.5 ${muted}`}>
                  <Tag className="w-3.5 h-3.5" /> Tags
                </div>
                <div className="flex flex-wrap gap-1">
                  {release.tags.map((t) => (
                    <span key={t} className="px-1.5 py-0.5 rounded-md text-[11px] font-mono bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-[#b4aecb]">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {manage && (
            <section className={`${card} p-5`}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#8b8b90]">Beheer</h3>
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  onClick={() => setVersionOpen(true)}
                  className="w-full h-10 rounded-xl bg-slate-100 dark:bg-[#1c1829] hover:bg-slate-200 dark:hover:bg-[#222327] text-sm font-semibold text-slate-900 dark:text-white inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Nieuwe versie uploaden
                </button>
                {confirmDelete ? (
                  <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300">
                    <p>Weet je het zeker? De release, alle versies en reacties worden verwijderd.</p>
                    <div className="flex gap-2 mt-2.5">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleDelete()}
                        className="h-8 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer disabled:opacity-60"
                      >
                        Ja, verwijderen
                      </button>
                      <button type="button" onClick={() => setConfirmDelete(false)} className="h-8 px-3 rounded-lg font-semibold cursor-pointer">
                        Annuleren
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="w-full h-10 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" /> Release verwijderen
                  </button>
                )}
              </div>
            </section>
          )}
        </aside>
      </div>

      {lightbox !== null && shots[lightbox] && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 forum-modal-overlay"
          onClick={() => setLightbox(null)}
        >
          <img src={shots[lightbox]} alt={`Screenshot ${lightbox + 1}`} className="max-w-full max-h-[85vh] rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
          {shots.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Vorige"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((lightbox - 1 + shots.length) % shots.length);
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                aria-label="Volgende"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((lightbox + 1) % shots.length);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      )}

      {versionOpen && (
        <NewVersionModal
          release={release}
          onClose={() => setVersionOpen(false)}
          onSaved={() => {
            setVersionOpen(false);
            void load();
          }}
        />
      )}
    </>
  );
};

// ---------------------------------------------------------------------------
// Formulieronderdelen
// ---------------------------------------------------------------------------
const ModalShell: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }> = ({
  title,
  onClose,
  children,
  wide,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs forum-modal-overlay" onClick={onClose}>
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={`w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[92vh] flex flex-col bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.1] rounded-2xl overflow-hidden shadow-2xl`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.07] flex items-center justify-between">
        <h2 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Sluiten"
          className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#1c1829] hover:bg-slate-200 dark:hover:bg-[#26272b] text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

function checkReleaseFile(file: File): string | null {
  if (!RELEASE_FILE_EXTENSIONS.includes(fileExtension(file.name))) {
    return `Dit bestandstype mag niet. Toegestaan: ${RELEASE_FILE_EXTENSIONS.map((e) => '.' + e).join(', ')}.`;
  }
  if (file.size > MAX_RELEASE_FILE_BYTES) return 'Het bestand is groter dan 25 MB. Gebruik dan een downloadlink.';
  return null;
}

function checkImage(file: File): string | null {
  if (!IMAGE_EXTENSIONS.includes(fileExtension(file.name))) return 'Alleen PNG, JPG, WEBP of GIF.';
  if (file.size > MAX_IMAGE_BYTES) return `${file.name} is groter dan 5 MB.`;
  return null;
}

const httpsOk = (v: string) => !v.trim() || /^https:\/\/\S+\.\S+/.test(v.trim());

/** Bestand kiezen of een downloadlink invullen. */
const VersionFields: React.FC<{
  version: string;
  setVersion: (v: string) => void;
  changelog: string;
  setChangelog: (v: string) => void;
  file: File | null;
  setFile: (f: File | null) => void;
  link: string;
  setLink: (v: string) => void;
  setError: (e: string | null) => void;
}> = ({ version, setVersion, changelog, setChangelog, file, setFile, link, setLink, setError }) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-[140px_minmax(0,1fr)] gap-3">
        <div>
          <label className={label} htmlFor="rel-version">Versie</label>
          <input id="rel-version" required value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.0" maxLength={31} className={`${input} font-mono`} />
        </div>
        <div>
          <label className={label} htmlFor="rel-changelog">Wat is er nieuw?</label>
          <input id="rel-changelog" value={changelog} onChange={(e) => setChangelog(e.target.value)} placeholder="Eerste release / bugfixes / nieuwe functie..." maxLength={5000} className={input} />
        </div>
      </div>
      <div>
        <span className={label}>Bestand</span>
        <input
          ref={ref}
          type="file"
          className="hidden"
          accept={RELEASE_FILE_EXTENSIONS.map((e) => '.' + e).join(',')}
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            e.target.value = '';
            if (!f) return;
            const problem = checkReleaseFile(f);
            if (problem) {
              setError(problem);
              return;
            }
            setError(null);
            setFile(f);
          }}
        />
        {file ? (
          <div className="flex items-center gap-3 p-3 rounded-xl border border-[#a88bfa]/40 bg-[#a88bfa]/10">
            <FileArchive className="w-5 h-5 text-[#a88bfa] shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{file.name}</div>
              <div className={`text-xs ${muted}`}>{formatBytes(file.size)}</div>
            </div>
            <button type="button" onClick={() => setFile(null)} className={`text-xs font-semibold cursor-pointer hover:text-red-500 ${muted}`}>
              Weghalen
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => ref.current?.click()}
            className="w-full p-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-white/[0.12] hover:border-[#a88bfa]/60 text-sm text-slate-600 dark:text-[#9c9c9d] flex flex-col items-center gap-1 cursor-pointer transition-colors"
          >
            <Upload className="w-5 h-5" />
            <span className="font-semibold">Kies een bestand</span>
            <span className="text-xs">zip, rar, 7z, tar, jar, pdf · max 25 MB</span>
          </button>
        )}
      </div>
      <div>
        <label className={label} htmlFor="rel-link">Of een downloadlink</label>
        <input
          id="rel-link"
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://github.com/jij/project/releases"
          className={input}
        />
        <p className={`text-[11px] mt-1 ${muted}`}>Groter dan 25 MB? Zet het op GitHub Releases of Google Drive en plak de link hier.</p>
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// Release publiceren
// ---------------------------------------------------------------------------
const PublishReleaseModal: React.FC<{
  author: Member;
  onClose: () => void;
  onPublished: (slug: string) => void;
}> = ({ author, onClose, onPublished }) => {
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [category, setCategory] = useState<ReleaseCategoryId>('tool');
  const [tagsText, setTagsText] = useState('');
  const [description, setDescription] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [license, setLicense] = useState('MIT');
  const [cover, setCover] = useState<File | null>(null);
  const [shots, setShots] = useState<File[]>([]);
  const [version, setVersion] = useState('1.0.0');
  const [changelog, setChangelog] = useState('Eerste release');
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);
  const shotsRef = useRef<HTMLInputElement>(null);

  const coverPreview = useMemo(() => (cover ? URL.createObjectURL(cover) : null), [cover]);
  const shotPreviews = useMemo(() => shots.map((s) => URL.createObjectURL(s)), [shots]);
  useEffect(() => () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
  }, [coverPreview]);
  useEffect(() => () => shotPreviews.forEach((u) => URL.revokeObjectURL(u)), [shotPreviews]);

  const tags = tagsText
    .split(/[,\s]+/)
    .map((t) => t.trim().toLowerCase().replace(/[^a-z0-9.+#-]/g, ''))
    .filter(Boolean)
    .filter((t, i, all) => all.indexOf(t) === i)
    .slice(0, 8);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (title.trim().length < 3) return setError('Geef je release een naam van minstens 3 tekens.');
    if (!description.trim()) return setError('Schrijf een korte beschrijving: wat doet het en hoe installeer je het?');
    if (!/^[0-9A-Za-z][0-9A-Za-z.+-]{0,30}$/.test(version.trim())) return setError('Gebruik een versienummer zoals 1.0.0 (letters, cijfers, punt, + en -).');
    if (!file && !link.trim()) return setError('Voeg een bestand toe of vul een downloadlink in.');
    if (!httpsOk(link) || !httpsOk(githubUrl) || !httpsOk(demoUrl)) return setError('Links moeten met https:// beginnen.');
    setBusy(true);
    try {
      const slug = await publishRelease(
        {
          title,
          tagline,
          description,
          category,
          tags,
          githubUrl,
          demoUrl,
          license,
          cover,
          screenshots: shots,
          version,
          changelog,
          file,
          externalUrl: link,
        },
        author
      );
      onPublished(slug);
    } catch (err) {
      setError(describeError(err, 'Je release kon niet worden gepubliceerd.'));
      setBusy(false);
    }
  };

  return (
    <ModalShell title="Release publiceren" onClose={busy ? () => undefined : onClose} wide>
      <form onSubmit={submit} className="p-6 space-y-5 overflow-y-auto">
        {/* Omslag */}
        <div>
          <span className={label}>Omslagafbeelding (optioneel)</span>
          <input
            ref={coverRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              e.target.value = '';
              if (!f) return;
              const problem = checkImage(f);
              if (problem) return setError(problem);
              setError(null);
              setCover(f);
            }}
          />
          <button
            type="button"
            onClick={() => coverRef.current?.click()}
            className="relative w-full h-32 rounded-xl overflow-hidden border-2 border-dashed border-slate-300 dark:border-white/[0.12] hover:border-[#a88bfa]/60 cursor-pointer transition-colors"
          >
            {coverPreview ? (
              <img src={coverPreview} alt="Omslag" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <span className={`absolute inset-0 flex flex-col items-center justify-center gap-1 text-sm ${muted}`}>
                <ImagePlus className="w-5 h-5" />
                <span className="font-semibold">Kies een afbeelding</span>
                <span className="text-xs">Zonder afbeelding maken we er een in de kleur van je categorie</span>
              </span>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className={label} htmlFor="rel-title">Naam</label>
            <input id="rel-title" required value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Bijv. Nova CMS" className={input} />
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="rel-tagline">In één zin</label>
            <input id="rel-tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={160} placeholder="Wat doet het?" className={input} />
          </div>
        </div>

        <div>
          <span className={label}>Categorie</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {RELEASE_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border text-left cursor-pointer transition-colors ${
                  category === c.id
                    ? 'border-[#a88bfa]/60 bg-[#a88bfa]/15 text-violet-700 dark:text-white'
                    : 'bg-slate-50 dark:bg-[#1a1726] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-[#9c9c9d]'
                }`}
              >
                <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: c.color }} />
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={label} htmlFor="rel-desc">Beschrijving</label>
          <textarea
            id="rel-desc"
            required
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={20000}
            placeholder={'Wat zit erin, wat heb je nodig en hoe installeer je het?\n\n**Functies**\n- ...\n\n```bash\nnpm install\n```'}
            className={`${input} h-auto py-3 resize-y font-sans`}
          />
          <p className={`text-[11px] mt-1 ${muted}`}>Je kunt **vet**, `code`, lijstjes, tabellen en ```codeblokken``` gebruiken.</p>
        </div>

        {/* Screenshots */}
        <div>
          <span className={label}>Screenshots (max 6)</span>
          <input
            ref={shotsRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = '';
              for (const f of files) {
                const problem = checkImage(f);
                if (problem) return setError(problem);
              }
              setError(null);
              setShots((prev) => [...prev, ...files].slice(0, 6));
            }}
          />
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {shotPreviews.map((url, i) => (
              <div key={url} className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 dark:border-white/[0.08]">
                <img src={url} alt={`Screenshot ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                <button
                  type="button"
                  aria-label="Screenshot weghalen"
                  onClick={() => setShots((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 w-5 h-5 rounded-md bg-black/60 text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {shots.length < 6 && (
              <button
                type="button"
                onClick={() => shotsRef.current?.click()}
                className={`aspect-video rounded-lg border-2 border-dashed border-slate-300 dark:border-white/[0.12] hover:border-[#a88bfa]/60 flex items-center justify-center cursor-pointer ${muted}`}
                aria-label="Screenshots toevoegen"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="rel-tags">Tags</label>
            <input id="rel-tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="php, react, discord" className={input} />
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {tags.map((t) => (
                  <span key={t} className="px-1.5 py-0.5 rounded-md text-[11px] font-mono bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-[#b4aecb]">#{t}</span>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className={label} htmlFor="rel-license">Licentie</label>
            <select id="rel-license" value={license} onChange={(e) => setLicense(e.target.value)} className={`${input} cursor-pointer`}>
              {RELEASE_LICENSES.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="rel-github">GitHub (optioneel)</label>
            <input id="rel-github" type="url" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/jij/project" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="rel-demo">Live demo (optioneel)</label>
            <input id="rel-demo" type="url" value={demoUrl} onChange={(e) => setDemoUrl(e.target.value)} placeholder="https://..." className={input} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] p-4 space-y-4 bg-slate-50/60 dark:bg-white/[0.02]">
          <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-[#a88bfa]" /> Eerste versie
          </h3>
          <VersionFields
            version={version}
            setVersion={setVersion}
            changelog={changelog}
            setChangelog={setChangelog}
            file={file}
            setFile={setFile}
            link={link}
            setLink={setLink}
            setError={setError}
          />
        </div>

        {!isSupabaseConfigured && (
          <p className={`text-xs ${muted}`}>Demo-modus: je release blijft alleen in dit tabblad staan tot je de pagina herlaadt.</p>
        )}

        {error && (
          <div role="alert" className="rounded-xl border border-red-300/60 bg-red-500/10 px-4 py-2.5 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={busy} className="h-10 px-4 rounded-xl text-sm font-semibold text-slate-600 dark:text-[#9c9c9d] hover:text-slate-900 dark:hover:text-white cursor-pointer">
            Annuleren
          </button>
          <button
            type="submit"
            disabled={busy}
            className="h-10 px-5 rounded-xl bg-[#e8b353] hover:bg-[#f0be63] disabled:opacity-60 text-[#141008] text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {busy ? 'Bezig met uploaden...' : 'Publiceren'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

// ---------------------------------------------------------------------------
// Nieuwe versie
// ---------------------------------------------------------------------------
const NewVersionModal: React.FC<{
  release: Release;
  onClose: () => void;
  onSaved: () => void;
}> = ({ release, onClose, onSaved }) => {
  const suggestion = useMemo(() => {
    const cur = release.latestVersion ?? '1.0.0';
    const parts = cur.split('.');
    const last = Number(parts[parts.length - 1]);
    if (Number.isFinite(last)) {
      parts[parts.length - 1] = String(last + 1);
      return parts.join('.');
    }
    return '';
  }, [release.latestVersion]);
  const [version, setVersion] = useState(suggestion);
  const [changelog, setChangelog] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^[0-9A-Za-z][0-9A-Za-z.+-]{0,30}$/.test(version.trim())) return setError('Gebruik een versienummer zoals 1.0.1.');
    if (!file && !link.trim()) return setError('Voeg een bestand toe of vul een downloadlink in.');
    if (!httpsOk(link)) return setError('De link moet met https:// beginnen.');
    setBusy(true);
    try {
      await addReleaseVersion(release, { version, changelog, file, externalUrl: link });
      onSaved();
    } catch (err) {
      setError(describeError(err, 'De versie kon niet worden opgeslagen.'));
      setBusy(false);
    }
  };

  return (
    <ModalShell title={`Nieuwe versie van ${release.title}`} onClose={busy ? () => undefined : onClose}>
      <form onSubmit={submit} className="p-6 space-y-4 overflow-y-auto">
        <p className={`text-sm ${muted}`}>
          Huidige versie: <span className="font-mono font-semibold text-slate-900 dark:text-white">v{release.latestVersion ?? '-'}</span>
        </p>
        <VersionFields
          version={version}
          setVersion={setVersion}
          changelog={changelog}
          setChangelog={setChangelog}
          file={file}
          setFile={setFile}
          link={link}
          setLink={setLink}
          setError={setError}
        />
        {error && (
          <div role="alert" className="rounded-xl border border-red-300/60 bg-red-500/10 px-4 py-2.5 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="h-10 px-4 rounded-xl text-sm font-semibold text-slate-600 dark:text-[#9c9c9d] cursor-pointer">
            Annuleren
          </button>
          <button
            type="submit"
            disabled={busy}
            className="h-10 px-5 rounded-xl bg-[#a88bfa] hover:bg-[#b79dff] disabled:opacity-60 text-[#0c0d10] text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {busy ? 'Bezig...' : 'Versie publiceren'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

// ---------------------------------------------------------------------------
// Kleine strook voor de homepage: nieuwste releases
// ---------------------------------------------------------------------------
export const LatestReleasesStrip: React.FC<{ onOpenAll: () => void; onOpen: (slug: string) => void }> = ({ onOpenAll, onOpen }) => {
  const [items, setItems] = useState<Release[] | null>(null);
  useEffect(() => {
    let alive = true;
    listReleases()
      .then((all) => alive && setItems(all.slice(0, 4)))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, []);
  if (items && items.length === 0) return null;
  return (
    <section className={`${card} p-5 sm:p-6`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-[#a88bfa]" /> Nieuwste releases
          </h2>
          <p className={`text-xs mt-0.5 ${muted}`}>Projecten die leden net hebben gedeeld.</p>
        </div>
        <button type="button" onClick={onOpenAll} className="text-xs font-semibold text-violet-600 dark:text-[#a88bfa] hover:underline cursor-pointer whitespace-nowrap">
          Alle releases
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(items ?? [null, null, null, null]).map((r, i) =>
          r ? (
            <button
              key={r.id}
              type="button"
              onClick={() => onOpen(r.slug)}
              className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 dark:border-white/[0.07] hover:border-[#a88bfa]/50 hover:bg-slate-50 dark:hover:bg-white/[0.02] text-left cursor-pointer transition-colors min-w-0"
            >
              <ReleaseCover release={r} className="w-14 h-14 rounded-lg shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">{r.title}</span>
                  {r.latestVersion && <span className={`text-[11px] font-mono ${muted}`}>v{r.latestVersion}</span>}
                </div>
                <div className={`text-xs truncate ${muted}`}>{r.tagline}</div>
                <div className={`flex items-center gap-3 mt-1 text-[11px] tabular-nums ${muted}`}>
                  <span>{r.authorName}</span>
                  <span className="inline-flex items-center gap-1"><Download className="w-3 h-3" />{compact(r.downloads)}</span>
                  <span className="inline-flex items-center gap-1"><Star className="w-3 h-3" />{compact(r.stars)}</span>
                </div>
              </div>
            </button>
          ) : (
            <div key={i} className="h-[78px] rounded-xl bg-slate-100 dark:bg-white/[0.03] animate-pulse" />
          )
        )}
      </div>
    </section>
  );
};
