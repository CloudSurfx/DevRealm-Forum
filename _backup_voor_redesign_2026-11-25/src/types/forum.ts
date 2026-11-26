export type NavTab = 'landing' | 'forum' | 'releases' | 'news' | 'gallery' | 'docs' | 'profile';

export type CategoryId =
  | 'all'
  | 'algemeen'
  | 'development'
  | 'hulp'
  | 'tutorials'
  | 'requests'
  | 'react-vue'
  | 'showcase';

/** Labels voor topics, zoals [HULP] of [TUTORIAL] op DevBest. */
export type TopicPrefix =
  | 'HULP'
  | 'DEVELOPMENT'
  | 'TUTORIAL'
  | 'REQUEST'
  | 'RELEASE'
  | 'SHOWCASE'
  | 'DISCUSSIE';

/** Eén bord binnen een forum-categorie (klassieke board-index, zie ForumIndex.tsx). */
export interface Forum {
  id: string;
  name: string;
  description: string;
  topicCount: number;
  postCount: number;
  lastPost?: {
    topicId: string;
    topicTitle: string;
    authorName: string;
    authorId: string;
    timestamp: string;
  };
}

/** Groep van boards op de forum-index (bv. "Discussie" of "Development & Hulp"). */
export interface Category {
  id: string;
  name: string;
  forums: Forum[];
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export type CodeLanguage = 'tsx' | 'vue' | 'ts' | 'css' | 'bash';

export interface CodeSnippet {
  language: CodeLanguage;
  filename?: string;
  code: string;
}

export interface TopicAttachment {
  id: string;
  name: string;
  sizeLabel: string;
  kind: 'image' | 'file';
  url: string;
}

export type ThemeAccentId = 'violet' | 'gold' | 'emerald' | 'sky' | 'rose' | 'custom';

export type GlowIntensity = 'subtle' | 'normal' | 'intense';

export interface Member {
  id: string;
  name: string;
  handle: string;
  role: string;
  initials: string;
  avatarColor: string;
  avatarUrl?: string;
  themeAccent?: ThemeAccentId;
  githubHandle?: string;
  discordHandle?: string;
  statusText: string;
  isOnline: boolean;
  lastSeen?: string;
  joinedAt: string;
  postsCount: number;
  reputation: number;
  badges: string[];
}

export interface Reply {
  id: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  authorRole: string;
  content: string;
  codeSnippet?: CodeSnippet;
  attachments?: TopicAttachment[];
  isBestAnswer?: boolean;
  createdAt: string;
  likes: number;
  likedByMe?: boolean;
}

export interface Topic {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  codeSnippet?: CodeSnippet;
  attachments?: TopicAttachment[];
  category: Exclude<CategoryId, 'all'>;
  categoryLabel: string;
  prefix?: TopicPrefix;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  authorRole: string;
  createdAt: string;
  lastActivity: string;
  votes: number;
  votedByMe?: boolean;
  views: number;
  pinned?: boolean;
  solved?: boolean;
  replies: Reply[];
}

export type PreviewPresetId = 'state-bridge' | 'theme-card' | 'chat-pulse' | 'custom-html';

export interface GalleryProject {
  id: string;
  title: string;
  description: string;
  stack: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  createdAt: string;
  likes: number;
  likedByMe?: boolean;
  previewPreset: PreviewPresetId;
  customMarkup?: string;
  codeSnippet: CodeSnippet;
}

export interface ChatMessage {
  id: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  authorAvatarUrl?: string;
  authorRole?: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
  reactions?: { emoji: string; count: number; active?: boolean }[];
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: string;
  publishedAt: string;
  author: string;
  readTime: string;
}

export interface PollOption {
  id: string;
  label: string;
  votes: number;
}

export interface CommunityPoll {
  id: string;
  question: string;
  closesIn: string;
  options: PollOption[];
}

// ---------------------------------------------------------------------------
// Releases
// ---------------------------------------------------------------------------
export type ReleaseCategoryId =
  | 'web'
  | 'cms'
  | 'game'
  | 'bot'
  | 'tool'
  | 'library'
  | 'design'
  | 'overig';

export interface ReleaseVersion {
  id: string;
  version: string;
  changelog: string;
  fileName?: string;
  fileSize?: number;
  /** Pad in de opslagmap (Supabase Storage). */
  filePath?: string;
  externalUrl?: string;
  downloads: number;
  createdAt: string;
  createdAtIso: string;
}

export interface ReleaseComment {
  id: string;
  authorId?: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  authorRole: string;
  body: string;
  createdAt: string;
}

export interface Release {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  category: ReleaseCategoryId;
  tags: string[];
  authorId?: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  authorRole: string;
  coverUrl?: string;
  screenshotUrls: string[];
  githubUrl?: string;
  demoUrl?: string;
  license?: string;
  latestVersion?: string;
  downloads: number;
  stars: number;
  starredByMe: boolean;
  views: number;
  featured: boolean;
  hidden: boolean;
  createdAt: string;
  createdAtIso: string;
  updatedAt: string;
  versions?: ReleaseVersion[];
  comments?: ReleaseComment[];
}
