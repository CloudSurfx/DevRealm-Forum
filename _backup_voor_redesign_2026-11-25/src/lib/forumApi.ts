import {
  CATEGORIES,
  INITIAL_CHAT_MESSAGES,
  INITIAL_GALLERY_PROJECTS,
  INITIAL_NEWS,
  INITIAL_ONLINE_MEMBERS,
  INITIAL_POLL,
  INITIAL_TOPICS,
} from '../data/forumData';
import {
  CategoryId,
  ChatMessage,
  CodeSnippet,
  CommunityPoll,
  GalleryProject,
  Member,
  NewsItem,
  Reply,
  ThemeAccentId,
  Topic,
  TopicAttachment,
} from '../types/forum';
import { isSupabaseConfigured, supabase } from './supabase';

type Row = Record<string, unknown>;

const str = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;
// Database-id's kunnen uuid (string) of bigint (number, bijv. chat_messages.id) zijn.
const idStr = (value: unknown): string =>
  typeof value === 'string' ? value : typeof value === 'number' || typeof value === 'bigint' ? String(value) : '';
const num = (value: unknown, fallback = 0): number =>
  typeof value === 'number' ? value : fallback;
const bool = (value: unknown): boolean => value === true;
const json = <T>(value: unknown, fallback: T): T => {
  if (value && typeof value === 'object') return value as T;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
};

const clockTime = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
};

const dayLabel = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const relativeLabel = (value: unknown): string => {
  if (typeof value !== 'string') return 'Zojuist';
  const date = new Date(value).getTime();
  if (Number.isNaN(date)) return 'Zojuist';
  const minutes = Math.max(0, Math.floor((Date.now() - date) / 60000));
  if (minutes < 1) return 'Zojuist';
  if (minutes < 60) return `${minutes} min geleden`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} uur geleden`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} dagen geleden`;
  return dayLabel(value);
};

const roleLabel = (role: string | undefined): string => {
  if (role === 'admin') return 'Beheerder';
  if (role === 'moderator') return 'Moderator';
  return 'Lid';
};

const roleFromRecord = (roles: Row[], userId: string): string | undefined => {
  const found = roles.find((r) => str(r.user_id) === userId);
  return found ? str(found.role, 'member') : undefined;
};

function memberFromRow(row: Row, role?: string): Member {
  const name = str(row.display_name, str(row.username, 'Lid'));
  return {
    id: idStr(row.id),
    name,
    handle: str(row.handle, `@${str(row.username, 'lid')}`),
    role: roleLabel(role),
    initials: str(row.initials, name.slice(0, 2).toUpperCase()),
    avatarColor: str(row.avatar_color, '#a88bfa'),
    avatarUrl: str(row.avatar_url) || undefined,
    themeAccent: (str(row.theme_accent) || undefined) as ThemeAccentId | undefined,
    githubHandle: str(row.github_handle) || undefined,
    discordHandle: str(row.discord_handle) || undefined,
    statusText: str(row.status_text, 'Actief op /forum'),
    isOnline: true,
    lastSeen: row.last_seen ? `Nu actief · ${relativeLabel(row.last_seen)}` : undefined,
    joinedAt: dayLabel(row.created_at) || 'Nov 2026',
    postsCount: num(row.posts_count),
    reputation: num(row.reputation),
    badges: Array.isArray(row.badges) ? (row.badges as string[]) : [],
  };
}

function replyFromRow(
  row: Row,
  members: Member[],
  likedByMe: Set<string>
): Reply {
  const author = members.find((m) => m.id === str(row.author_id));
  const name = author?.name ?? str(row.author_name, 'Lid');
  return {
    id: idStr(row.id),
    authorId: author?.id ?? str(row.author_id, idStr(row.id)),
    authorName: name,
    authorInitials: author?.initials ?? str(row.author_initials, name.slice(0, 2).toUpperCase()),
    authorColor: author?.avatarColor ?? str(row.author_color, '#a88bfa'),
    authorRole: author?.role ?? str(row.author_role, 'Lid'),
    content: str(row.body),
    codeSnippet: row.code_snippet ? json<CodeSnippet | undefined>(row.code_snippet, undefined) : undefined,
    attachments: json<TopicAttachment[]>(row.attachments, []),
    isBestAnswer: bool(row.is_best_answer),
    createdAt: relativeLabel(row.created_at),
    likes: 0,
    likedByMe: likedByMe.has(idStr(row.id)),
  };
}

function topicFromRow(
  row: Row,
  replies: Reply[],
  members: Member[],
  votesByMe: Set<string>,
  voteCounts: Map<string, number>,
  likeCounts: Map<string, number>
): Topic {
  const categoryId = str(row.category, 'algemeen') as Exclude<CategoryId, 'all'>;
  const author = members.find((m) => m.id === str(row.author_id));
  const authorName = author?.name ?? str(row.author_name, 'Lid');
  const topicId = idStr(row.id);
  return {
    id: topicId,
    title: str(row.title),
    excerpt: str(row.excerpt),
    body: str(row.body),
    codeSnippet: row.code_snippet ? json<CodeSnippet | undefined>(row.code_snippet, undefined) : undefined,
    attachments: json<TopicAttachment[]>(row.attachments, []),
    category: categoryId,
    categoryLabel: CATEGORIES.find((c) => c.id === categoryId)?.label ?? 'Algemeen',
    authorName,
    authorInitials: author?.initials ?? str(row.author_initials, authorName.slice(0, 2).toUpperCase()),
    authorColor: author?.avatarColor ?? str(row.author_color, '#a88bfa'),
    authorRole: author?.role ?? str(row.author_role, 'Lid'),
    createdAt: relativeLabel(row.created_at),
    lastActivity: relativeLabel(row.last_activity ?? row.updated_at),
    votes: voteCounts.get(topicId) ?? 0,
    votedByMe: votesByMe.has(topicId),
    views: num(row.views),
    pinned: bool(row.pinned) || undefined,
    solved: bool(row.solved) || undefined,
    replies: replies.map((r) => ({ ...r, likes: likeCounts.get(r.id) ?? 0 })),
  };
}

function newsFromRow(row: Row, members: Member[]): NewsItem {
  const author = members.find((m) => m.id === str(row.author_id));
  return {
    id: idStr(row.id),
    title: str(row.title),
    summary: str(row.summary),
    body: str(row.body),
    category: str(row.category, 'Community'),
    publishedAt: dayLabel(row.published_at),
    author: author?.name ?? str(row.author_name, 'Redactie'),
    readTime: str(row.read_time, '2 min leestijd'),
  };
}

function projectFromRow(
  row: Row,
  members: Member[],
  likedByMe: Set<string>,
  likeCounts: Map<string, number>
): GalleryProject {
  const author = members.find((m) => m.id === str(row.author_id));
  const authorName = author?.name ?? str(row.author_name, 'Lid');
  const id = idStr(row.id);
  return {
    id,
    title: str(row.title),
    description: str(row.description),
    stack: str(row.stack),
    authorName,
    authorInitials: author?.initials ?? str(row.author_initials, authorName.slice(0, 2).toUpperCase()),
    authorColor: author?.avatarColor ?? str(row.author_color, '#a88bfa'),
    createdAt: relativeLabel(row.created_at),
    likes: likeCounts.get(id) ?? 0,
    likedByMe: likedByMe.has(id),
    previewPreset: str(row.preview_preset, 'custom-html') as GalleryProject['previewPreset'],
    customMarkup: str(row.custom_markup) || undefined,
    codeSnippet: json<CodeSnippet>(row.code_snippet, { language: 'tsx', code: '' }),
  };
}

function chatFromRow(row: Row, members: Member[], reactions: Row[]): ChatMessage {
  const author = members.find((m) => m.id === str(row.user_id));
  const name = author?.name ?? str(row.author_name, 'Gast');
  const grouped = new Map<string, { emoji: string; count: number; active: boolean }>();
  reactions
    .filter((r) => idStr(r.message_id) === idStr(row.id))
    .forEach((r) => {
      const emoji = str(r.emoji);
      const current = grouped.get(emoji) ?? { emoji, count: 0, active: false };
      current.count += 1;
      if (str(r.user_id) === currentUserIdCache) current.active = true;
      grouped.set(emoji, current);
    });

  return {
    id: idStr(row.id),
    authorName: name,
    authorInitials: author?.initials ?? str(row.author_initials, name.slice(0, 2).toUpperCase()),
    authorColor: author?.avatarColor ?? str(row.author_color, '#a88bfa'),
    authorAvatarUrl: author?.avatarUrl,
    authorRole: (author?.role ?? str(row.author_role)) || undefined,
    text: str(row.body),
    timestamp: clockTime(row.created_at),
    reactions: [...grouped.values()],
  };
}

let currentUserIdCache = '';

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  // Niet ingelogd is geen fout: dan is er gewoon geen gebruiker.
  if (error?.name === 'AuthSessionMissingError') return '';
  if (error) throw error;
  return data.user?.id ?? '';
}

async function fetchMembers(): Promise<{ members: Member[]; roles: Row[] }> {
  const [profilesRes, rolesRes] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: true }),
    supabase.from('user_roles').select('*'),
  ]);
  if (profilesRes.error) throw profilesRes.error;
  if (rolesRes.error) throw rolesRes.error;
  const profiles = (profilesRes.data ?? []) as Row[];
  const roles = (rolesRes.data ?? []) as Row[];
  return {
    members: profiles.map((p) => memberFromRow(p, roleFromRecord(roles, str(p.id)))),
    roles,
  };
}

// ---------------------------------------------------------------------------
// Publieke API
// ---------------------------------------------------------------------------
export interface ForumData {
  members: Member[];
  topics: Topic[];
  news: NewsItem[];
  projects: GalleryProject[];
  poll: CommunityPoll | null;
  chat: ChatMessage[];
}

export async function getCurrentMember(): Promise<Member | null> {
  if (!isSupabaseConfigured) return null;
  const id = await currentUserId();
  if (!id) return null;
  const [profileRes, roleRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', id).maybeSingle(),
  ]);
  if (profileRes.error) throw profileRes.error;
  if (!profileRes.data) return null;
  currentUserIdCache = id;
  return memberFromRow(profileRes.data as Row, str((roleRes.data as Row)?.role, 'member'));
}

export function onAuthChange(callback: (member: Member | null) => void): () => void {
  if (!isSupabaseConfigured) return () => undefined;
  const { data } = supabase.auth.onAuthStateChange(() => {
    getCurrentMember().then(callback).catch(() => callback(null));
  });
  return () => data.subscription.unsubscribe();
}

export async function signIn(email: string, password: string): Promise<Member | null> {
  if (!isSupabaseConfigured) return null;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return getCurrentMember();
}

export async function signUp(input: {
  email: string;
  password: string;
  name: string;
  githubHandle?: string;
  discordHandle?: string;
}): Promise<Member | null> {
  if (!isSupabaseConfigured) return null;
  const cleanName = input.name.trim() || 'Nieuw Lid';
  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: cleanName,
        user_name: cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      },
    },
  });
  if (error) throw error;
  const member = await getCurrentMember();
  if (member && (input.githubHandle || input.discordHandle)) {
    await updateMemberProfile({
      githubHandle: input.githubHandle,
      discordHandle: input.discordHandle,
    });
    return getCurrentMember();
  }
  return member;
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  currentUserIdCache = '';
}

export async function awardReputation(delta: number, badge?: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const id = await currentUserId();
  if (!id) return;
  const { error } = await supabase.rpc('award_reputation', {
    target_user_id: id,
    delta,
    badge: badge ?? null,
  });
  if (error) throw error;
}

export async function updateMemberProfile(input: {
  displayName?: string;
  githubHandle?: string;
  discordHandle?: string;
  themeAccent?: ThemeAccentId;
  avatarColor?: string;
  statusText?: string;
  bio?: string;
}): Promise<void> {
  if (!isSupabaseConfigured) return;
  const id = await currentUserId();
  if (!id) return;
  const patch: Row = {};
  if (input.displayName !== undefined) patch.display_name = input.displayName;
  if (input.githubHandle !== undefined) patch.github_handle = input.githubHandle;
  if (input.discordHandle !== undefined) patch.discord_handle = input.discordHandle;
  if (input.themeAccent !== undefined) patch.theme_accent = input.themeAccent;
  if (input.avatarColor !== undefined) patch.avatar_color = input.avatarColor;
  if (input.statusText !== undefined) patch.status_text = input.statusText;
  if (input.bio !== undefined) patch.bio = input.bio;
  if (Object.keys(patch).length === 0) return;
  const { error } = await supabase.from('profiles').update(patch).eq('id', id);
  if (error) throw error;
}

export async function loadForumData(): Promise<ForumData> {
  if (!isSupabaseConfigured) {
    return {
      members: INITIAL_ONLINE_MEMBERS,
      topics: INITIAL_TOPICS,
      news: INITIAL_NEWS,
      projects: INITIAL_GALLERY_PROJECTS,
      poll: INITIAL_POLL,
      chat: INITIAL_CHAT_MESSAGES,
    };
  }

  const me = await currentUserId();
  currentUserIdCache = me;
  const { members } = await fetchMembers();

  const topicsRes = await supabase
    .from('topics')
    .select('*')
    .order('pinned', { ascending: false })
    .order('last_activity', { ascending: false })
    .limit(200);
  if (topicsRes.error) throw topicsRes.error;

  const [repliesRes, votesRes, likesRes, newsRes, projectsRes, projectLikesRes, chatRes, reactionsRes, pollRes] =
    await Promise.all([
      supabase.from('replies').select('*').order('created_at', { ascending: true }).limit(2000),
      supabase.from('topic_votes').select('*').limit(5000),
      supabase.from('reply_likes').select('*').limit(5000),
      supabase
        .from('news')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(100),
      supabase.from('gallery_projects').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('project_likes').select('*').limit(5000),
      supabase.from('chat_messages').select('*').order('created_at', { ascending: true }).limit(200),
      supabase.from('chat_reactions').select('*').limit(5000),
      supabase.from('polls').select('*').eq('active', true).order('created_at', { ascending: false }).limit(1),
    ]);

  for (const res of [
    repliesRes, votesRes, likesRes, newsRes, projectsRes,
    projectLikesRes, chatRes, reactionsRes, pollRes,
  ]) {
    if (res.error) throw res.error;
  }

  const topicRows = (topicsRes.data ?? []) as Row[];
  const replyRows = (repliesRes.data ?? []) as Row[];
  const voteRows = (votesRes.data ?? []) as Row[];
  const likeRows = (likesRes.data ?? []) as Row[];
  const reactionRows = (reactionsRes.data ?? []) as Row[];
  const projectLikeRows = (projectLikesRes.data ?? []) as Row[];

  const votesByMe = new Set(voteRows.filter((r) => str(r.user_id) === me).map((r) => str(r.topic_id)));
  const likedRepliesByMe = new Set(likeRows.filter((r) => str(r.user_id) === me).map((r) => str(r.reply_id)));
  const likedProjectsByMe = new Set(
    projectLikeRows.filter((r) => str(r.user_id) === me).map((r) => str(r.project_id))
  );
  const voteCounts = new Map<string, number>();
  voteRows.forEach((r) => {
    const id = str(r.topic_id);
    voteCounts.set(id, (voteCounts.get(id) ?? 0) + 1);
  });
  const likeCounts = new Map<string, number>();
  likeRows.forEach((r) => {
    const id = str(r.reply_id);
    likeCounts.set(id, (likeCounts.get(id) ?? 0) + 1);
  });
  const projectLikeCounts = new Map<string, number>();
  projectLikeRows.forEach((r) => {
    const id = str(r.project_id);
    projectLikeCounts.set(id, (projectLikeCounts.get(id) ?? 0) + 1);
  });

  const topics = topicRows.map((row) => {
    const id = idStr(row.id);
    const replies = replyRows
      .filter((r) => str(r.topic_id) === id)
      .map((r) => replyFromRow(r, members, likedRepliesByMe));
    return topicFromRow(row, replies, members, votesByMe, voteCounts, likeCounts);
  });

  let poll: CommunityPoll | null = null;
  const pollRow = ((pollRes.data ?? []) as Row[])[0];
  if (pollRow) {
    const optionsRes = await supabase
      .from('poll_options')
      .select('*')
      .eq('poll_id', str(pollRow.id))
      .order('sort_order', { ascending: true });
    if (optionsRes.error) throw optionsRes.error;
    const votesRes2 = await supabase.from('poll_votes').select('*').eq('poll_id', str(pollRow.id));
    if (votesRes2.error) throw votesRes2.error;
    const voteRows2 = (votesRes2.data ?? []) as Row[];
    const counts = new Map<string, number>();
    voteRows2.forEach((r) => {
      const id = str(r.option_id);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    });
    poll = {
      id: str(pollRow.id),
      question: str(pollRow.question),
      closesIn: pollRow.closes_at
        ? (() => {
            const days = Math.ceil((Date.parse(str(pollRow.closes_at)) - Date.now()) / 86400_000);
            if (Number.isNaN(days)) return str(pollRow.closes_in, 'Loopt nog');
            if (days <= 0) return 'Gesloten';
            return days === 1 ? 'Sluit morgen' : `Sluit over ${days} dagen`;
          })()
        : str(pollRow.closes_in, 'Loopt nog'),
      options: ((optionsRes.data ?? []) as Row[]).map((o) => ({
        id: str(o.id),
        label: str(o.label),
        votes: counts.get(str(o.id)) ?? 0,
      })),
    };
  }

  return {
    members,
    topics,
    news: ((newsRes.data ?? []) as Row[]).map((n) => newsFromRow(n, members)),
    projects: ((projectsRes.data ?? []) as Row[]).map((p) =>
      projectFromRow(p, members, likedProjectsByMe, projectLikeCounts)
    ),
    poll,
    chat: ((chatRes.data ?? []) as Row[]).map((c) => chatFromRow(c, members, reactionRows)),
  };
}

// ---------------------------------------------------------------------------
// Mutaties
// ---------------------------------------------------------------------------
export async function createTopic(input: {
  title: string;
  category: Exclude<CategoryId, 'all'>;
  body: string;
  codeSnippet?: CodeSnippet;
  attachments?: TopicAttachment[];
  author: Member;
}): Promise<void> {
  if (!isSupabaseConfigured) return;
  const id = await currentUserId();
  const { error } = await supabase.from('topics').insert({
    title: input.title,
    excerpt: input.body.length > 140 ? `${input.body.slice(0, 140)}...` : input.body,
    body: input.body,
    code_snippet: input.codeSnippet ?? null,
    attachments: input.attachments ?? [],
    category: input.category,
    author_id: id || null,
    author_name: input.author.name,
    author_initials: input.author.initials,
    author_color: input.author.avatarColor,
    author_role: input.author.role,
  });
  if (error) throw error;
  if (id) {
    await supabase.rpc('award_reputation', { target_user_id: id, delta: 10, badge: 'Topic Starter' });
  }
}

export async function toggleTopicVote(topicId: string): Promise<{ votes: number; votedByMe: boolean }> {
  if (!isSupabaseConfigured) return { votes: 0, votedByMe: false };
  const id = await currentUserId();
  if (!id) throw new Error('Log eerst in om te stemmen.');
  const existing = await supabase
    .from('topic_votes')
    .select('topic_id')
    .eq('topic_id', topicId)
    .eq('user_id', id)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    const { error } = await supabase.from('topic_votes').delete().eq('topic_id', topicId).eq('user_id', id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('topic_votes').insert({ topic_id: topicId, user_id: id });
    if (error) throw error;
  }
  const { count, error } = await supabase
    .from('topic_votes')
    .select('*', { count: 'exact', head: true })
    .eq('topic_id', topicId);
  if (error) throw error;
  return { votes: count ?? 0, votedByMe: !existing.data };
}

export async function addReply(input: {
  topicId: string;
  content: string;
  codeSnippet?: CodeSnippet;
  attachments?: TopicAttachment[];
  author: Member;
}): Promise<void> {
  if (!isSupabaseConfigured) return;
  const id = await currentUserId();
  const { error } = await supabase.from('replies').insert({
    topic_id: input.topicId,
    author_id: id || null,
    author_name: input.author.name,
    author_initials: input.author.initials,
    author_color: input.author.avatarColor,
    author_role: input.author.role,
    body: input.content,
    code_snippet: input.codeSnippet ?? null,
    attachments: input.attachments ?? [],
  });
  if (error) throw error;
  await supabase.from('topics').update({ last_activity: new Date().toISOString() }).eq('id', input.topicId);
  if (id) {
    await supabase.rpc('award_reputation', { target_user_id: id, delta: 5, badge: 'Actieve Helper' });
  }
}

export async function toggleReplyLike(replyId: string): Promise<{ likes: number; likedByMe: boolean }> {
  if (!isSupabaseConfigured) return { likes: 0, likedByMe: false };
  const id = await currentUserId();
  if (!id) throw new Error('Log eerst in om te liken.');
  const existing = await supabase
    .from('reply_likes')
    .select('reply_id')
    .eq('reply_id', replyId)
    .eq('user_id', id)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    const { error } = await supabase.from('reply_likes').delete().eq('reply_id', replyId).eq('user_id', id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('reply_likes').insert({ reply_id: replyId, user_id: id });
    if (error) throw error;
  }
  const { count, error } = await supabase
    .from('reply_likes')
    .select('*', { count: 'exact', head: true })
    .eq('reply_id', replyId);
  if (error) throw error;
  return { likes: count ?? 0, likedByMe: !existing.data };
}

export async function markBestAnswer(topicId: string, replyId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const reset = await supabase.from('replies').update({ is_best_answer: false }).eq('topic_id', topicId);
  if (reset.error) throw reset.error;
  const set = await supabase.from('replies').update({ is_best_answer: true }).eq('id', replyId);
  if (set.error) throw set.error;
  await supabase.from('topics').update({ solved: true }).eq('id', topicId);
}

export async function sendChatMessage(text: string, author: Member): Promise<void> {
  if (!isSupabaseConfigured) return;
  const id = await currentUserId();
  const { error } = await supabase.from('chat_messages').insert({
    user_id: id || null,
    author_name: author.name,
    author_initials: author.initials,
    author_color: author.avatarColor,
    author_role: author.role,
    body: text,
  });
  if (error) throw error;
  if (id) {
    await supabase.rpc('award_reputation', { target_user_id: id, delta: 2, badge: 'Live Chatter' });
  }
}

export async function toggleChatReaction(messageId: string, emoji: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const id = await currentUserId();
  if (!id) throw new Error('Log eerst in om te reageren.');
  const existing = await supabase
    .from('chat_reactions')
    .select('message_id')
    .eq('message_id', Number(messageId))
    .eq('user_id', id)
    .eq('emoji', emoji)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    await supabase
      .from('chat_reactions')
      .delete()
      .eq('message_id', Number(messageId))
      .eq('user_id', id)
      .eq('emoji', emoji);
  } else {
    await supabase.from('chat_reactions').insert({
      message_id: Number(messageId),
      user_id: id,
      emoji,
    });
  }
}

export async function toggleProjectLike(projectId: string): Promise<{ likes: number; likedByMe: boolean }> {
  if (!isSupabaseConfigured) return { likes: 0, likedByMe: false };
  const id = await currentUserId();
  if (!id) throw new Error('Log eerst in om te liken.');
  const existing = await supabase
    .from('project_likes')
    .select('project_id')
    .eq('project_id', projectId)
    .eq('user_id', id)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    await supabase.from('project_likes').delete().eq('project_id', projectId).eq('user_id', id);
  } else {
    await supabase.from('project_likes').insert({ project_id: projectId, user_id: id });
  }
  const { count, error } = await supabase
    .from('project_likes')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId);
  if (error) throw error;
  return { likes: count ?? 0, likedByMe: !existing.data };
}

export async function createProject(input: {
  title: string;
  description: string;
  stack: string;
  previewPreset: GalleryProject['previewPreset'];
  customMarkup?: string;
  codeSnippet: CodeSnippet;
  author: Member;
}): Promise<void> {
  if (!isSupabaseConfigured) return;
  const id = await currentUserId();
  const { error } = await supabase.from('gallery_projects').insert({
    title: input.title,
    description: input.description,
    stack: input.stack,
    preview_preset: input.previewPreset,
    custom_markup: input.customMarkup ?? null,
    code_snippet: input.codeSnippet,
    author_id: id || null,
    author_name: input.author.name,
    author_initials: input.author.initials,
    author_color: input.author.avatarColor,
  });
  if (error) throw error;
  if (id) {
    await supabase.rpc('award_reputation', { target_user_id: id, delta: 15, badge: 'Project Pionier' });
  }
}

export async function votePoll(optionId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const id = await currentUserId();
  if (!id) throw new Error('Log eerst in om te stemmen.');
  const poll = await supabase.from('polls').select('id').eq('active', true).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (poll.error) throw poll.error;
  if (!poll.data) return;
  const pollId = str((poll.data as Row).id);
  const { error } = await supabase
    .from('poll_votes')
    .upsert({ poll_id: pollId, option_id: optionId, user_id: id }, { onConflict: 'poll_id,user_id' });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Realtime
// ---------------------------------------------------------------------------
export interface PresenceTypingUser {
  name: string;
  initials: string;
  avatarColor: string;
}

export interface ChatPresence {
  broadcastTyping: () => void;
  stopTyping: () => void;
  unsubscribe: () => void;
}

/**
 * Presence + typeer-indicatie voor de live chat. `watcherCount` komt uit echte
 * presence-data in plaats van de vaste `+ 3` uit de oude demo.
 */
export function subscribeToChatPresence(input: {
  user: Member;
  onTyping: (user: PresenceTypingUser) => void;
  onStopTyping: (name: string) => void;
  onOnlineChange: (count: number) => void;
}): ChatPresence {
  const empty: ChatPresence = {
    broadcastTyping: () => undefined,
    stopTyping: () => undefined,
    unsubscribe: () => undefined,
  };
  if (!isSupabaseConfigured) return empty;

  let typingTimer: ReturnType<typeof setTimeout> | undefined;
  const channel = supabase.channel('forum-chat-presence', {
    config: { presence: { key: input.user.id } },
  });

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<Record<string, unknown>>();
      input.onOnlineChange(Object.keys(state).length);
    })
    .on('broadcast', { event: 'typing' }, ({ payload }) => {
      const p = payload as Partial<PresenceTypingUser>;
      if (!p.name || p.name === input.user.name) return;
      input.onTyping({
        name: p.name,
        initials: p.initials ?? p.name.slice(0, 2).toUpperCase(),
        avatarColor: p.avatarColor ?? '#a88bfa',
      });
      if (typingTimer) clearTimeout(typingTimer);
      typingTimer = setTimeout(() => input.onStopTyping(p.name as string), 2500);
    })
    .on('broadcast', { event: 'stop-typing' }, ({ payload }) => {
      const name = (payload as { name?: string }).name;
      if (name) input.onStopTyping(name);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          name: input.user.name,
          initials: input.user.initials,
          avatarColor: input.user.avatarColor,
          online_at: new Date().toISOString(),
        });
      }
    });

  return {
    broadcastTyping: () => {
      void channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          name: input.user.name,
          initials: input.user.initials,
          avatarColor: input.user.avatarColor,
        },
      });
    },
    stopTyping: () => {
      void channel.send({ type: 'broadcast', event: 'stop-typing', payload: { name: input.user.name } });
    },
    unsubscribe: () => {
      if (typingTimer) clearTimeout(typingTimer);
      void supabase.removeChannel(channel);
    },
  };
}

export function subscribeToChat(handlers: {
  onInsert: (message: ChatMessage) => void;
  onDelete: (id: string) => void;
  onUpdate: (message: ChatMessage) => void;
  members: () => Member[];
}): () => void {
  if (!isSupabaseConfigured) return () => undefined;
  const channel = supabase
    .channel('forum-live-chat')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages' },
      (payload) => {
        handlers.onInsert(chatFromRow(payload.new as Row, handlers.members(), []));
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'chat_messages' },
      (payload) => handlers.onDelete(idStr((payload.old as Row).id))
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'chat_messages' },
      (payload) => handlers.onUpdate(chatFromRow(payload.new as Row, handlers.members(), []))
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
