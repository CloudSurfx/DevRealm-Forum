import type { Member, Release, ReleaseCategoryId, ReleaseComment, ReleaseVersion } from '../types/forum';
import { DEMO_RELEASES } from '../data/releasesData';
import { isSupabaseConfigured, supabase } from './supabase';

/*
 * Releases: lezen, publiceren, versies, sterren, reacties en downloads.
 * Met Supabase: tabellen uit supabase/migrations/0005_releases.sql en de
 * opslagmap "releases". Zonder Supabase (demo-modus): alles in het geheugen.
 */

type Row = Record<string, unknown>;
const BUCKET = 'releases';

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const num = (v: unknown): number => (typeof v === 'number' ? v : 0);
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

export function relativeTime(value: unknown): string {
  if (typeof value !== 'string') return 'Zojuist';
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return 'Zojuist';
  const minutes = Math.max(0, Math.floor((Date.now() - t) / 60000));
  if (minutes < 1) return 'Zojuist';
  if (minutes < 60) return `${minutes} min geleden`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} uur geleden`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'gisteren';
  if (days < 7) return `${days} dagen geleden`;
  return new Date(value).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatBytes(bytes?: number): string {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

export function slugify(title: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return slug.length >= 3 ? slug : `release-${Math.random().toString(36).slice(2, 7)}`;
}

function safeFileName(name: string): string {
  const dot = name.lastIndexOf('.');
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'bestand';
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  return ext ? `${base}.${ext}` : base;
}

export function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

function publicUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error?.name === 'AuthSessionMissingError') return '';
  if (error) throw error;
  return data.user?.id ?? '';
}

function releaseFromRow(row: Row, starredByMe: boolean): Release {
  const authorName = str(row.author_name, 'Lid');
  return {
    id: str(row.id),
    slug: str(row.slug),
    title: str(row.title),
    tagline: str(row.tagline),
    description: str(row.description),
    category: str(row.category, 'overig') as ReleaseCategoryId,
    tags: strArr(row.tags),
    authorId: str(row.author_id) || undefined,
    authorName,
    authorInitials: str(row.author_initials, authorName.slice(0, 2).toUpperCase()),
    authorColor: str(row.author_color, '#a88bfa'),
    authorRole: str(row.author_role, 'Lid'),
    coverUrl: publicUrl(str(row.cover_path) || null),
    screenshotUrls: strArr(row.screenshots).map((p) => publicUrl(p)!).filter(Boolean),
    githubUrl: str(row.github_url) || undefined,
    demoUrl: str(row.demo_url) || undefined,
    license: str(row.license) || undefined,
    latestVersion: str(row.latest_version) || undefined,
    downloads: num(row.downloads_count),
    stars: num(row.stars_count),
    starredByMe,
    views: num(row.views),
    featured: row.featured === true,
    hidden: row.hidden === true,
    createdAt: relativeTime(row.created_at),
    createdAtIso: str(row.created_at),
    updatedAt: relativeTime(row.updated_at),
  };
}

function versionFromRow(row: Row): ReleaseVersion {
  return {
    id: str(row.id),
    version: str(row.version),
    changelog: str(row.changelog),
    fileName: str(row.file_name) || undefined,
    fileSize: typeof row.file_size === 'number' ? row.file_size : row.file_size ? Number(row.file_size) : undefined,
    filePath: str(row.file_path) || undefined,
    externalUrl: str(row.external_url) || undefined,
    downloads: num(row.downloads_count),
    createdAt: relativeTime(row.created_at),
    createdAtIso: str(row.created_at),
  };
}

function commentFromRow(row: Row): ReleaseComment {
  const name = str(row.author_name, 'Lid');
  return {
    id: str(row.id),
    authorId: str(row.author_id) || undefined,
    authorName: name,
    authorInitials: str(row.author_initials, name.slice(0, 2).toUpperCase()),
    authorColor: str(row.author_color, '#a88bfa'),
    authorRole: str(row.author_role, 'Lid'),
    body: str(row.body),
    createdAt: relativeTime(row.created_at),
  };
}

// ---------------------------------------------------------------------------
// Demo-modus: een kopie van de voorbeelddata die je kunt aanpassen
// ---------------------------------------------------------------------------
let demoStore: Release[] = DEMO_RELEASES.map((r) => ({
  ...r,
  versions: r.versions?.map((v) => ({ ...v })),
  comments: r.comments?.map((c) => ({ ...c })),
}));
const demoFiles = new Map<string, string>(); // versie-id -> object-URL

const wait = () => new Promise((resolve) => setTimeout(resolve, 150));

// ---------------------------------------------------------------------------
// Lezen
// ---------------------------------------------------------------------------
export async function listReleases(): Promise<Release[]> {
  if (!isSupabaseConfigured) {
    await wait();
    return demoStore.filter((r) => !r.hidden).map((r) => ({ ...r }));
  }
  const [releasesRes, uid] = await Promise.all([
    supabase.from('releases').select('*').order('created_at', { ascending: false }).limit(300),
    currentUserId(),
  ]);
  if (releasesRes.error) throw releasesRes.error;
  let starred = new Set<string>();
  if (uid) {
    const stars = await supabase.from('release_stars').select('release_id').eq('user_id', uid);
    if (stars.error) throw stars.error;
    starred = new Set(((stars.data ?? []) as Row[]).map((s) => str(s.release_id)));
  }
  return ((releasesRes.data ?? []) as Row[]).map((r) => releaseFromRow(r, starred.has(str(r.id))));
}

export async function getRelease(slug: string): Promise<Release | null> {
  if (!isSupabaseConfigured) {
    await wait();
    const found = demoStore.find((r) => r.slug === slug);
    return found ? { ...found, versions: [...(found.versions ?? [])], comments: [...(found.comments ?? [])] } : null;
  }
  const res = await supabase.from('releases').select('*').eq('slug', slug).maybeSingle();
  if (res.error) throw res.error;
  if (!res.data) return null;
  const row = res.data as Row;
  const id = str(row.id);
  const uid = await currentUserId();
  const [versionsRes, commentsRes, starRes] = await Promise.all([
    supabase.from('release_versions').select('*').eq('release_id', id).order('created_at', { ascending: false }),
    supabase.from('release_comments').select('*').eq('release_id', id).order('created_at', { ascending: true }),
    uid
      ? supabase.from('release_stars').select('release_id').eq('release_id', id).eq('user_id', uid).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (versionsRes.error) throw versionsRes.error;
  if (commentsRes.error) throw commentsRes.error;
  if (starRes.error) throw starRes.error;
  return {
    ...releaseFromRow(row, Boolean(starRes.data)),
    versions: ((versionsRes.data ?? []) as Row[]).map(versionFromRow),
    comments: ((commentsRes.data ?? []) as Row[]).map(commentFromRow),
  };
}

export async function registerReleaseView(releaseId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const r = demoStore.find((x) => x.id === releaseId);
    if (r) r.views += 1;
    return;
  }
  await supabase.rpc('register_release_view', { p_release: releaseId });
}

/** Telt de download en geeft de link terug om het bestand te openen. */
export async function downloadReleaseVersion(version: ReleaseVersion): Promise<string | null> {
  if (!isSupabaseConfigured) {
    const r = demoStore.find((x) => x.versions?.some((v) => v.id === version.id));
    const v = r?.versions?.find((x) => x.id === version.id);
    if (r && v) {
      r.downloads += 1;
      v.downloads += 1;
    }
    return demoFiles.get(version.id) ?? version.externalUrl ?? null;
  }
  const { data, error } = await supabase.rpc('register_release_download', { p_version: version.id });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as Row | undefined;
  if (!row) return null;
  const path = str(row.file_path);
  if (path) {
    return supabase.storage.from(BUCKET).getPublicUrl(path, { download: str(row.file_name) || true }).data.publicUrl;
  }
  return str(row.external_url) || null;
}

// ---------------------------------------------------------------------------
// Schrijven
// ---------------------------------------------------------------------------
async function upload(folder: string, file: File): Promise<string> {
  const path = `${folder}/${Date.now().toString(36)}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return path;
}

export interface VersionInput {
  version: string;
  changelog: string;
  file?: File | null;
  externalUrl?: string;
}

export interface PublishInput extends VersionInput {
  title: string;
  tagline: string;
  description: string;
  category: ReleaseCategoryId;
  tags: string[];
  githubUrl?: string;
  demoUrl?: string;
  license?: string;
  cover?: File | null;
  screenshots: File[];
}

const clean = (v?: string) => {
  const t = v?.trim();
  return t ? t : null;
};

export async function publishRelease(input: PublishInput, author: Member): Promise<string> {
  const slug = slugify(input.title);

  if (!isSupabaseConfigured) {
    await wait();
    let finalSlug = slug;
    while (demoStore.some((r) => r.slug === finalSlug)) finalSlug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const versionId = `v-${Date.now()}`;
    if (input.file) demoFiles.set(versionId, URL.createObjectURL(input.file));
    demoStore = [
      {
        id: `rel-${Date.now()}`,
        slug: finalSlug,
        title: input.title.trim(),
        tagline: input.tagline.trim(),
        description: input.description.trim(),
        category: input.category,
        tags: input.tags,
        authorId: author.id,
        authorName: author.name,
        authorInitials: author.initials,
        authorColor: author.avatarColor,
        authorRole: author.role,
        coverUrl: input.cover ? URL.createObjectURL(input.cover) : undefined,
        screenshotUrls: input.screenshots.map((f) => URL.createObjectURL(f)),
        githubUrl: clean(input.githubUrl) ?? undefined,
        demoUrl: clean(input.demoUrl) ?? undefined,
        license: clean(input.license) ?? undefined,
        latestVersion: input.version.trim(),
        downloads: 0,
        stars: 0,
        starredByMe: false,
        views: 0,
        featured: false,
        hidden: false,
        createdAt: 'Zojuist',
        createdAtIso: now,
        updatedAt: 'Zojuist',
        versions: [
          {
            id: versionId,
            version: input.version.trim(),
            changelog: input.changelog.trim(),
            fileName: input.file?.name,
            fileSize: input.file?.size,
            externalUrl: clean(input.externalUrl) ?? undefined,
            downloads: 0,
            createdAt: 'Zojuist',
            createdAtIso: now,
          },
        ],
        comments: [],
      },
      ...demoStore,
    ];
    return finalSlug;
  }

  const uid = await currentUserId();
  if (!uid) throw new Error('Log in om een release te publiceren.');
  const folder = `${uid}/${slug}`;

  const coverPath = input.cover ? await upload(folder, input.cover) : null;
  const screenshotPaths: string[] = [];
  for (const shot of input.screenshots) screenshotPaths.push(await upload(folder, shot));
  const filePath = input.file ? await upload(folder, input.file) : null;

  const inserted = await supabase
    .from('releases')
    .insert({
      slug,
      title: input.title.trim(),
      tagline: input.tagline.trim(),
      description: input.description.trim(),
      category: input.category,
      tags: input.tags,
      cover_path: coverPath,
      screenshots: screenshotPaths,
      github_url: clean(input.githubUrl),
      demo_url: clean(input.demoUrl),
      license: clean(input.license),
    })
    .select('id, slug')
    .single();
  if (inserted.error) throw inserted.error;
  const row = inserted.data as Row;

  const version = await supabase.from('release_versions').insert({
    release_id: str(row.id),
    version: input.version.trim(),
    changelog: input.changelog.trim(),
    file_path: filePath,
    file_name: input.file ? input.file.name.slice(0, 160) : null,
    file_size: input.file ? input.file.size : null,
    external_url: clean(input.externalUrl),
  });
  if (version.error) {
    // Zonder versie is een release niet te downloaden: ruim hem weer op.
    await supabase.from('releases').delete().eq('id', str(row.id));
    throw version.error;
  }
  return str(row.slug, slug);
}

export async function addReleaseVersion(release: Release, input: VersionInput): Promise<void> {
  if (!isSupabaseConfigured) {
    await wait();
    const r = demoStore.find((x) => x.id === release.id);
    if (!r) return;
    if (r.versions?.some((v) => v.version === input.version.trim())) {
      throw new Error(`Versie ${input.version.trim()} bestaat al.`);
    }
    const id = `v-${Date.now()}`;
    if (input.file) demoFiles.set(id, URL.createObjectURL(input.file));
    const now = new Date().toISOString();
    r.versions = [
      {
        id,
        version: input.version.trim(),
        changelog: input.changelog.trim(),
        fileName: input.file?.name,
        fileSize: input.file?.size,
        externalUrl: clean(input.externalUrl) ?? undefined,
        downloads: 0,
        createdAt: 'Zojuist',
        createdAtIso: now,
      },
      ...(r.versions ?? []),
    ];
    r.latestVersion = input.version.trim();
    r.updatedAt = 'Zojuist';
    return;
  }
  const uid = await currentUserId();
  if (!uid) throw new Error('Log in om een versie toe te voegen.');
  const filePath = input.file ? await upload(`${uid}/${release.slug}`, input.file) : null;
  const { error } = await supabase.from('release_versions').insert({
    release_id: release.id,
    version: input.version.trim(),
    changelog: input.changelog.trim(),
    file_path: filePath,
    file_name: input.file ? input.file.name.slice(0, 160) : null,
    file_size: input.file ? input.file.size : null,
    external_url: clean(input.externalUrl),
  });
  if (error) {
    if (error.code === '23505') throw new Error(`Versie ${input.version.trim()} bestaat al.`);
    throw error;
  }
}

export async function toggleReleaseStar(release: Release, star: boolean): Promise<void> {
  if (!isSupabaseConfigured) {
    const r = demoStore.find((x) => x.id === release.id);
    if (r) {
      r.starredByMe = star;
      r.stars = Math.max(0, r.stars + (star ? 1 : -1));
    }
    return;
  }
  const uid = await currentUserId();
  if (!uid) throw new Error('Log in om een release een ster te geven.');
  const { error } = star
    ? await supabase.from('release_stars').insert({ release_id: release.id, user_id: uid })
    : await supabase.from('release_stars').delete().eq('release_id', release.id).eq('user_id', uid);
  if (error && error.code !== '23505') throw error;
}

export async function addReleaseComment(releaseId: string, body: string, author: Member): Promise<void> {
  if (!isSupabaseConfigured) {
    const r = demoStore.find((x) => x.id === releaseId);
    r?.comments?.push({
      id: `c-${Date.now()}`,
      authorId: author.id,
      authorName: author.name,
      authorInitials: author.initials,
      authorColor: author.avatarColor,
      authorRole: author.role,
      body: body.trim(),
      createdAt: 'Zojuist',
    });
    return;
  }
  const uid = await currentUserId();
  if (!uid) throw new Error('Log in om te reageren.');
  const { error } = await supabase
    .from('release_comments')
    .insert({ release_id: releaseId, author_id: uid, body: body.trim() });
  if (error) throw error;
}

export async function deleteReleaseComment(releaseId: string, commentId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const r = demoStore.find((x) => x.id === releaseId);
    if (r?.comments) r.comments = r.comments.filter((c) => c.id !== commentId);
    return;
  }
  const { error } = await supabase.from('release_comments').delete().eq('id', commentId);
  if (error) throw error;
}

export async function deleteRelease(release: Release): Promise<void> {
  if (!isSupabaseConfigured) {
    demoStore = demoStore.filter((r) => r.id !== release.id);
    return;
  }
  const { error } = await supabase.from('releases').delete().eq('id', release.id);
  if (error) throw error;
}

/** Releases van één lid (voor de homepage en profielen). */
export async function latestReleases(limit = 4): Promise<Release[]> {
  const all = await listReleases();
  return all.slice(0, limit);
}
