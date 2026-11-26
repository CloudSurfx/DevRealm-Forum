import { useCallback, useEffect, useRef, useState } from 'react';
import AdminDashboard from './components/AdminDashboard';
import { AuthModal } from './components/AuthModal';
import { ForumIndex } from './components/ForumIndex';
import { HomeFeed } from './components/HomeFeed';
import { LandingHome } from './components/LandingHome';
import {
  BrowserNotificationPermission,
  LiveChat,
  TypingUser,
} from './components/LiveChat';
import {
  NewProjectModal,
  ProjectDetailModal,
  ProjectGalleryView,
} from './components/ProjectGallery';
import { ReleasesView } from './components/Releases';
import { RightSidebar } from './components/RightSidebar';
import { SidebarNav } from './components/SidebarNav';
import { NewTopicModal, TopicDetailModal } from './components/TopicModal';
import { TopBar } from './components/TopBar';
import {
  DocsView,
  LegalModal,
  NewsDetailModal,
  NewsView,
  ProfileView,
  SupportModal,
} from './components/Views';
import {
  buildCustomThemePalette,
  CATEGORIES,
  FORUM_CATEGORIES,
  INITIAL_CHAT_MESSAGES,
  INITIAL_GALLERY_PROJECTS,
  INITIAL_NEWS,
  INITIAL_ONLINE_MEMBERS,
  INITIAL_POLL,
  INITIAL_TOPICS,
  SIMULATED_CHAT_REPLIES,
  THEME_ACCENT_PRESETS,
} from './data/forumData';
import {
  addReply,
  awardReputation as awardServerReputation,
  createProject,
  createTopic,
  getCurrentMember,
  loadForumData,
  markBestAnswer,
  onAuthChange,
  sendChatMessage,
  signIn,
  signOut,
  signUp,
  subscribeToChat,
  subscribeToChatPresence,
  toggleChatReaction,
  toggleProjectLike,
  toggleReplyLike,
  toggleTopicVote,
  updateMemberProfile,
  votePoll,
} from './lib/forumApi';
import { describeError } from './lib/errors';
import { isSupabaseConfigured } from './lib/supabase';
import {
  CategoryId,
  ChatMessage,
  CodeLanguage,
  CodeSnippet,
  CommunityPoll,
  GalleryProject,
  GlowIntensity,
  Member,
  NavTab,
  NewsItem,
  PreviewPresetId,
  ThemeAccentId,
  Topic,
  TopicAttachment,
} from './types/forum';
import {
  BadgeActionType,
  evaluateMemberBadges,
} from './utils/badgeSystem';
import {
  createInitialsAvatarDataUri,
  resolveChatNotificationIcon,
} from './utils/notificationAvatar';

const TAB_TO_PATH: Record<NavTab, string> = {
  landing: '/',
  forum: '/forum',
  releases: '/releases',
  news: '/nieuws',
  gallery: '/galerij',
  docs: '/regels',
  profile: '/profiel',
};

const FORUM_IDS = new Set<string>(
  FORUM_CATEGORIES.flatMap((category) => category.forums.map((forum) => forum.id))
);

/** /forum/f/<id> → dat forum; /forum (of een onbekend id) → null = de forumindex. */
function pathToForumCategory(pathname: string): CategoryId | null {
  const match = pathname.match(/^\/forum\/f\/([^/]+)\/?$/);
  if (!match) return null;
  const id = decodeURIComponent(match[1]);
  return FORUM_IDS.has(id) ? (id as CategoryId) : null;
}

function pathToTab(pathname: string): NavTab {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean.startsWith('/forum/')) return 'forum';
  switch (clean) {
    case '/forum':
      return 'forum';
    case '/releases':
      return 'releases';
    case '/nieuws':
      return 'news';
    case '/galerij':
      return 'gallery';
    case '/regels':
      return 'docs';
    case '/profiel':
      return 'profile';
    default:
      return 'landing';
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || 'LD';
}

function getCurrentTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [activeThemeAccent, setActiveThemeAccent] = useState<ThemeAccentId>(() => {
    if (typeof window === 'undefined') return 'violet';
    const saved = window.localStorage.getItem('forum-theme-accent') as ThemeAccentId | null;
    if (saved === 'custom') return 'custom';
    return THEME_ACCENT_PRESETS.some((p) => p.id === saved) && saved ? saved : 'violet';
  });
  const [customThemeHex, setCustomThemeHex] = useState<string>(() => {
    if (typeof window === 'undefined') return '#a88bfa';
    return window.localStorage.getItem('forum-custom-theme-hex') || '#a88bfa';
  });
  const [glowIntensity, setGlowIntensity] = useState<GlowIntensity>(() => {
    if (typeof window === 'undefined') return 'normal';
    const saved = window.localStorage.getItem('forum-glow-intensity') as GlowIntensity | null;
    return saved === 'subtle' || saved === 'normal' || saved === 'intense' ? saved : 'normal';
  });
  const [tintedSurfaces, setTintedSurfaces] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem('forum-tinted-surfaces') !== 'false';
  });
  const [activeTab, setActiveTab] = useState<NavTab>(() => pathToTab(window.location.pathname));
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [onlineMembers, setOnlineMembers] = useState<Member[]>(INITIAL_ONLINE_MEMBERS);
  const [topics, setTopics] = useState<Topic[]>(INITIAL_TOPICS);
  const [galleryProjects, setGalleryProjects] =
    useState<GalleryProject[]>(INITIAL_GALLERY_PROJECTS);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES);
  const [news, setNews] = useState<NewsItem[]>(INITIAL_NEWS);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [poll, setPoll] = useState<CommunityPoll>(INITIAL_POLL);
  const [selectedPollOption, setSelectedPollOption] = useState<string | null>(null);
  const [supportRaised, setSupportRaised] = useState(34);
  const supportGoal = 50;
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [dataError, setDataError] = useState<string | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [presenceCount, setPresenceCount] = useState(0);
  const presenceRef = useRef<ReturnType<typeof subscribeToChatPresence> | null>(null);
  const lastTypingBroadcastRef = useRef(0);

  // Modals
  const [authModal, setAuthModal] = useState<{ open: boolean; mode: 'register' | 'login' }>({
    open: false,
    mode: 'login',
  });
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  // /forum toont altijd de forumindex; /forum/f/<id> toont de topics van één forum.
  const [forumCategory, setForumCategory] = useState<CategoryId | null>(() =>
    pathToForumCategory(window.location.pathname)
  );
  const [newTopicOpen, setNewTopicOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);

  // Browser notification state for background-tab live chat alerts
  const [notificationPermission, setNotificationPermission] =
    useState<BrowserNotificationPermission>(() =>
      typeof window !== 'undefined' && 'Notification' in window
        ? Notification.permission
        : 'unsupported'
    );
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('forum-live-chat-notifications') !== 'false';
  });
  const unreadBackgroundRef = useRef(0);
  const prevMessageCountRef = useRef(chatMessages.length);
  const baseTitleRef = useRef('Forum — Community, Discussies & Live Chat');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  useEffect(() => {
    const palette =
      activeThemeAccent === 'custom'
        ? buildCustomThemePalette(customThemeHex)
        : THEME_ACCENT_PRESETS.find((p) => p.id === activeThemeAccent) ??
          THEME_ACCENT_PRESETS[0];

    const root = document.documentElement;
    root.style.setProperty('--forum-accent', palette.hex);
    root.style.setProperty('--forum-accent-hover', palette.hoverHex);
    root.style.setProperty('--forum-accent-rgb', palette.rgb);

    if (tintedSurfaces) {
      root.style.setProperty('--forum-bg-dark', palette.darkCanvas);
      root.style.setProperty('--forum-nav-dark', palette.darkNav);
      root.style.setProperty('--forum-surface-dark', palette.darkSurface);
      root.style.setProperty('--forum-elevated-dark', palette.darkElevated);
    } else {
      root.style.setProperty('--forum-bg-dark', '#09090d');
      root.style.setProperty('--forum-nav-dark', '#0e0e14');
      root.style.setProperty('--forum-surface-dark', '#12121a');
      root.style.setProperty('--forum-elevated-dark', '#191924');
    }

    const glowMap: Record<
      GlowIntensity,
      { primary: string; secondary: string; hero: string }
    > = {
      subtle: { primary: '0.13', secondary: '0.04', hero: '0.1' },
      normal: { primary: '0.24', secondary: '0.08', hero: '0.18' },
      intense: { primary: '0.38', secondary: '0.15', hero: '0.28' },
    };
    const activeGlow = glowMap[glowIntensity];
    root.style.setProperty('--forum-glow-alpha-primary', activeGlow.primary);
    root.style.setProperty('--forum-glow-alpha-secondary', activeGlow.secondary);
    root.style.setProperty('--forum-hero-alpha', activeGlow.hero);

    window.localStorage.setItem('forum-theme-accent', activeThemeAccent);
    window.localStorage.setItem('forum-custom-theme-hex', customThemeHex);
    window.localStorage.setItem('forum-glow-intensity', glowIntensity);
    window.localStorage.setItem('forum-tinted-surfaces', String(tintedSurfaces));
  }, [activeThemeAccent, customThemeHex, glowIntensity, tintedSurfaces]);

  // Escape sluit het bovenste venster (topic, login, nieuws, projecten, ...)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const overlays = document.querySelectorAll<HTMLElement>('.forum-modal-overlay');
      const top = overlays[overlays.length - 1];
      if (top) {
        e.preventDefault();
        top.click();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setActiveTab(pathToTab(window.location.pathname));
      setForumCategory(pathToForumCategory(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // -------------------------------------------------------------------------
  // Supabase: sessie, data en realtime
  // -------------------------------------------------------------------------
  const refreshData = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const data = await loadForumData();
      setOnlineMembers(data.members);
      setTopics(data.topics);
      setNews(data.news);
      setGalleryProjects(data.projects);
      if (data.poll) setPoll(data.poll);
      setChatMessages(data.chat);
      setDataError(null);
    } catch (err) {
      setDataError(
        describeError(err, 'Forumgegevens konden niet worden geladen.')
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Optimistische UI blijft direct reageren; daarna synchroniseren we met Supabase.
  const persist = useCallback(
    (task: Promise<unknown>) => {
      if (!isSupabaseConfigured) return;
      void task.then(refreshData).catch((err: unknown) => {
        setDataError(
          describeError(err, 'De wijziging kon niet worden opgeslagen.')
        );
      });
    },
    [refreshData]
  );

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    void refreshData();

    getCurrentMember().then(setCurrentUser).catch(() => setCurrentUser(null));
    const unsubscribeAuth = onAuthChange((member) => setCurrentUser(member));
    return unsubscribeAuth;
  }, [refreshData]);

  // Realtime chat: INSERT/UPDATE/DELETE komen direct binnen bij alle tabbladen.
  const onlineMembersRef = useRef(onlineMembers);
  useEffect(() => {
    onlineMembersRef.current = onlineMembers;
  }, [onlineMembers]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const unsubscribe = subscribeToChat({
      members: () => onlineMembersRef.current,
      onInsert: (message) => {
        setChatMessages((prev) =>
          prev.some((m) => String(m.id) === String(message.id)) ? prev : [...prev, message]
        );
      },
      onUpdate: (message) => {
        setChatMessages((prev) =>
          prev.map((m) => (String(m.id) === String(message.id) ? message : m))
        );
      },
      onDelete: (id) => {
        setChatMessages((prev) => prev.filter((m) => String(m.id) !== id));
      },
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !currentUser) return;
    const presence = subscribeToChatPresence({
      user: currentUser,
      onTyping: (user) => {
        setTypingUsers((prev) =>
          prev.some((u) => u.name === user.name) ? prev : [...prev, user]
        );
      },
      onStopTyping: (name) => {
        setTypingUsers((prev) => prev.filter((u) => u.name !== name));
      },
      onOnlineChange: (count) => setPresenceCount(count),
    });
    presenceRef.current = presence;
    return () => {
      presence.unsubscribe();
      if (presenceRef.current === presence) presenceRef.current = null;
    };
  }, [currentUser]);

  // Reset background unread count & document title when user returns to tab
  useEffect(() => {
    const clearUnreadOnFocus = () => {
      if (!document.hidden && document.hasFocus()) {
        unreadBackgroundRef.current = 0;
        document.title = baseTitleRef.current;
      }
    };
    document.addEventListener('visibilitychange', clearUnreadOnFocus);
    window.addEventListener('focus', clearUnreadOnFocus);
    return () => {
      document.removeEventListener('visibilitychange', clearUnreadOnFocus);
      window.removeEventListener('focus', clearUnreadOnFocus);
    };
  }, []);

  // Warn user with native browser Notification + title update when new chat messages arrive in background
  useEffect(() => {
    if (chatMessages.length <= prevMessageCountRef.current) {
      prevMessageCountRef.current = chatMessages.length;
      return;
    }

    const latest = chatMessages[chatMessages.length - 1];
    prevMessageCountRef.current = chatMessages.length;

    const isFromOtherUser = !currentUser || latest.authorName !== currentUser.name;
    const isBackgroundTab = document.hidden || !document.hasFocus();

    if (!isFromOtherUser || !isBackgroundTab) return;

    unreadBackgroundRef.current += 1;
    document.title = `(${unreadBackgroundRef.current}) Nieuw bericht — Forum`;

    if (
      notificationsEnabled &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      try {
        const senderIcon = resolveChatNotificationIcon(latest, onlineMembers);
        const notification = new Notification(`Live chat · ${latest.authorName}`, {
          body: latest.text,
          ...(senderIcon ? { icon: senderIcon, badge: senderIcon } : {}),
          tag: 'forum-live-chat',
        });
        notification.onclick = () => {
          window.focus();
          navigateTo('forum');
          window.setTimeout(() => {
            document.getElementById('live-chat')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 80);
          notification.close();
        };
      } catch {
        // Ignore if sandboxed iframe blocks Notification constructor
      }
    }
  }, [chatMessages, currentUser, notificationsEnabled, onlineMembers]);

  const handleToggleNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      return;
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        window.localStorage.setItem('forum-live-chat-notifications', 'true');
        try {
          const previewIcon = currentUser
            ? currentUser.avatarUrl ??
              createInitialsAvatarDataUri(currentUser.initials, currentUser.avatarColor)
            : createInitialsAvatarDataUri('F', '#a88bfa');
          new Notification('Live chat meldingen ingeschakeld', {
            body: 'Je krijgt voortaan een seintje bij nieuwe berichten als deze tab op de achtergrond staat.',
            ...(previewIcon ? { icon: previewIcon } : {}),
            tag: 'forum-live-chat-enabled',
          });
        } catch {
          // Ignore in restricted environments
        }
      }
      return;
    }

    setNotificationPermission(Notification.permission);
    if (Notification.permission === 'granted') {
      setNotificationsEnabled((prev) => {
        const next = !prev;
        window.localStorage.setItem('forum-live-chat-notifications', String(next));
        return next;
      });
    }
  };

  const navigateTo = (tab: NavTab) => {
    const isNewPage = tab !== activeTab || (tab === 'forum' && forumCategory !== null);
    setActiveTab(tab);
    // Naar "Forum" gaan brengt je altijd terug naar de forumindex.
    if (tab === 'forum') setForumCategory(null);
    setMobileMenuOpen(false);
    const targetPath = TAB_TO_PATH[tab];
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
    // Nieuwe pagina: direct bovenaan beginnen (de pagina fadet zelf in).
    // Zelfde pagina: rustig terug omhoog scrollen.
    window.scrollTo({ top: 0, behavior: isNewPage ? 'instant' : 'smooth' });
  };

  /** Open één forum (null = terug naar de forumindex op /forum). */
  const openForumCategory = (id: CategoryId | null) => {
    setActiveTab('forum');
    setForumCategory(id);
    const targetPath = id ? `/forum/f/${encodeURIComponent(id)}` : '/forum';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const awardReputation = (
    memberName: string,
    delta: number,
    badgeToGrant?: string,
    action?: BadgeActionType
  ) => {
    setOnlineMembers((prev) =>
      prev.map((m) => {
        if (m.name !== memberName) return m;
        const nextReputation = Math.max(0, m.reputation + delta);
        const badges = evaluateMemberBadges(
          { ...m, reputation: nextReputation },
          action,
          badgeToGrant
        );
        return {
          ...m,
          reputation: nextReputation,
          lastSeen: `Nu actief · om ${getCurrentTime()}`,
          badges,
        };
      })
    );

    setCurrentUser((prev) => {
      if (!prev || prev.name !== memberName) return prev;
      const nextReputation = Math.max(0, prev.reputation + delta);
      const badges = evaluateMemberBadges(
        { ...prev, reputation: nextReputation },
        action,
        badgeToGrant
      );
      return {
        ...prev,
        reputation: nextReputation,
        lastSeen: `Nu actief · om ${getCurrentTime()}`,
        badges,
      };
    });
  };

  const handleToggleSidebar = () => {
    if (window.innerWidth < 768) {
      setMobileMenuOpen((prev) => !prev);
    } else {
      setSidebarExpanded((prev) => !prev);
    }
  };

  const handleAuthenticate = async ({
    mode,
    name,
    color,
    email,
    password,
    githubHandle,
    discordHandle,
  }: {
    mode: 'register' | 'login';
    name: string;
    color: string;
    email: string;
    password: string;
    githubHandle?: string;
    discordHandle?: string;
  }) => {
    const matchedPreset =
      THEME_ACCENT_PRESETS.find((p) => p.hex.toLowerCase() === color.toLowerCase()) ??
      THEME_ACCENT_PRESETS[0];
    setActiveThemeAccent(matchedPreset.id);

    if (isSupabaseConfigured) {
      const member =
        mode === 'register'
          ? await signUp({
              email,
              password,
              name,
              githubHandle,
              discordHandle,
            })
          : await signIn(email, password);
      setCurrentUser(member);
      setDataError(null);
      await refreshData();
      return;
    }

    // Demo-modus zonder Supabase: het oude lokale gedrag blijven gebruiken.
    const hasSocials = Boolean(githubHandle || discordHandle);
    const initialRep = hasSocials ? 35 : 25;
    const baseBadges = hasSocials
      ? ['Lid sinds 2026', 'GitHub & Discord', 'Nieuw Lid']
      : ['Lid sinds 2026', 'Nieuw Lid'];

    const newMember: Member = {
      id: `user-${Date.now()}`,
      name: name || 'Joris van Dijk',
      handle: `@${(name || 'lid').toLowerCase().replace(/[^a-z0-9]/g, '') || 'lid'}`,
      role: 'Lid',
      initials: getInitials(name || 'Joris van Dijk'),
      avatarColor: color,
      themeAccent: matchedPreset.id,
      githubHandle,
      discordHandle,
      statusText: 'Actief op /forum',
      isOnline: true,
      lastSeen: `Nu actief · om ${getCurrentTime()}`,
      joinedAt: 'Nov 2026',
      postsCount: 1,
      reputation: initialRep,
      badges: evaluateMemberBadges({
        reputation: initialRep,
        postsCount: 1,
        joinedAt: 'Nov 2026',
        githubHandle,
        discordHandle,
        role: 'Lid',
        badges: baseBadges,
      }),
    };
    setCurrentUser(newMember);
    setOnlineMembers((prev) => [newMember, ...prev.filter((m) => m.id !== newMember.id)]);
  };

  const handleSelectThemeAccent = (accent: ThemeAccentId, syncAvatarColor = true) => {
    setActiveThemeAccent(accent);
    const palette =
      accent === 'custom'
        ? buildCustomThemePalette(customThemeHex)
        : THEME_ACCENT_PRESETS.find((p) => p.id === accent);
    if (!palette || !currentUser) return;

    const nextAvatarColor = syncAvatarColor ? palette.hex : currentUser.avatarColor;
    setCurrentUser((prev) =>
      prev ? { ...prev, themeAccent: accent, avatarColor: nextAvatarColor } : null
    );
    setOnlineMembers((prev) =>
      prev.map((m) =>
        m.id === currentUser.id
          ? { ...m, themeAccent: accent, avatarColor: nextAvatarColor }
          : m
      )
    );
    persist(updateMemberProfile({ themeAccent: accent, avatarColor: nextAvatarColor }));
  };

  const handleChangeCustomThemeHex = (hex: string, syncAvatarColor = true) => {
    setCustomThemeHex(hex);
    setActiveThemeAccent('custom');
    if (!currentUser) return;
    const nextAvatarColor = syncAvatarColor ? hex : currentUser.avatarColor;
    setCurrentUser((prev) =>
      prev ? { ...prev, themeAccent: 'custom', avatarColor: nextAvatarColor } : null
    );
    setOnlineMembers((prev) =>
      prev.map((m) =>
        m.id === currentUser.id
          ? { ...m, themeAccent: 'custom', avatarColor: nextAvatarColor }
          : m
      )
    );
    persist(updateMemberProfile({ themeAccent: 'custom', avatarColor: nextAvatarColor }));
  };

  const handleUpdateSocialLinks = ({
    githubHandle,
    discordHandle,
  }: {
    githubHandle?: string;
    discordHandle?: string;
  }) => {
    if (!currentUser) return;
    const hadSocialsBefore = Boolean(currentUser.githubHandle || currentUser.discordHandle);
    const hasSocialsNow = Boolean(githubHandle || discordHandle);

    setCurrentUser((prev) => {
      if (!prev) return null;
      const nextRep = !hadSocialsBefore && hasSocialsNow ? prev.reputation + 10 : prev.reputation;
      const badges = evaluateMemberBadges(
        {
          ...prev,
          githubHandle,
          discordHandle,
          reputation: nextRep,
        },
        hasSocialsNow ? 'link_socials' : undefined
      );
      return {
        ...prev,
        githubHandle,
        discordHandle,
        reputation: nextRep,
        lastSeen: `Nu actief · om ${getCurrentTime()}`,
        badges,
      };
    });

    setOnlineMembers((prev) =>
      prev.map((m) => {
        if (m.id !== currentUser.id) return m;
        const nextRep = !hadSocialsBefore && hasSocialsNow ? m.reputation + 10 : m.reputation;
        const badges = evaluateMemberBadges(
          {
            ...m,
            githubHandle,
            discordHandle,
            reputation: nextRep,
          },
          hasSocialsNow ? 'link_socials' : undefined
        );
        return {
          ...m,
          githubHandle,
          discordHandle,
          reputation: nextRep,
          lastSeen: `Nu actief · om ${getCurrentTime()}`,
          badges,
        };
      })
    );
    persist(updateMemberProfile({ githubHandle, discordHandle }));
    if (!hadSocialsBefore && hasSocialsNow) {
      persist(awardServerReputation(10, 'GitHub & Discord'));
    }
  };

  const handleLogout = async () => {
    if (!currentUser) return;
    setOnlineMembers((prev) => prev.filter((m) => m.id !== currentUser.id));
    setCurrentUser(null);
    if (isSupabaseConfigured) {
      try {
        await signOut();
      } catch (err) {
        setDataError(err instanceof Error ? err.message : 'Uitloggen is niet gelukt.');
      }
    }
  };

  const handleTypingChange = (typing: boolean) => {
    if (!isSupabaseConfigured || !presenceRef.current) return;
    if (!typing) {
      presenceRef.current.stopTyping();
      return;
    }
    const now = Date.now();
    if (now - lastTypingBroadcastRef.current < 800) return;
    lastTypingBroadcastRef.current = now;
    presenceRef.current.broadcastTyping();
  };

  const handleSendChatMessage = (text: string) => {
    if (!currentUser) return;
    if (isSupabaseConfigured) {
      // Het bericht komt via Realtime terug; geen lokale duplicaat meer.
      persist(sendChatMessage(text, currentUser));
      return;
    }
    const msg: ChatMessage = {
      id: `c-${Date.now()}`,
      authorName: currentUser.name,
      authorInitials: currentUser.initials,
      authorColor: currentUser.avatarColor,
      authorAvatarUrl: currentUser.avatarUrl,
      authorRole: currentUser.role,
      text,
      timestamp: getCurrentTime(),
    };
    setChatMessages((prev) => [...prev, msg]);
    awardReputation(currentUser.name, 2, 'Live Chatter', 'send_chat');

    const mentionedMember = onlineMembers.find((m) => {
      if (m.id === currentUser.id) return false;
      const cleanHandle = m.handle.replace(/^@/, '').toLowerCase();
      return text.toLowerCase().includes(`@${cleanHandle}`);
    });

    const responder =
      mentionedMember ?? INITIAL_ONLINE_MEMBERS[Math.floor(Math.random() * 3)];
    const baseReply =
      SIMULATED_CHAT_REPLIES[Math.floor(Math.random() * SIMULATED_CHAT_REPLIES.length)];
    const replyText = mentionedMember
      ? `${currentUser.handle} ${baseReply}`
      : baseReply;

    window.setTimeout(() => {
      setTypingUsers((prev) =>
        prev.some((u) => u.name === responder.name)
          ? prev
          : [
              ...prev,
              {
                name: responder.name,
                initials: responder.initials,
                avatarColor: responder.avatarColor,
              },
            ]
      );
    }, 350);

    window.setTimeout(() => {
      setTypingUsers((prev) => prev.filter((u) => u.name !== responder.name));
      setChatMessages((prev) => [
        ...prev,
        {
          id: `c-auto-${Date.now()}`,
          authorName: responder.name,
          authorInitials: responder.initials,
          authorColor: responder.avatarColor,
          authorAvatarUrl: responder.avatarUrl,
          authorRole: responder.role,
          text: replyText,
          timestamp: getCurrentTime(),
        },
      ]);
    }, 1800);
  };

  const handleToggleChatReaction = (messageId: string, emoji: string) => {
    persist(toggleChatReaction(messageId, emoji));
    setChatMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        const existing = msg.reactions ?? [];
        const match = existing.find((r) => r.emoji === emoji);
        if (match) {
          const updated = existing
            .map((r) =>
              r.emoji === emoji
                ? {
                    ...r,
                    active: !r.active,
                    count: r.active ? r.count - 1 : r.count + 1,
                  }
                : r
            )
            .filter((r) => r.count > 0);
          return { ...msg, reactions: updated };
        }
        return {
          ...msg,
          reactions: [...existing, { emoji, count: 1, active: true }],
        };
      })
    );
  };

  const handleToggleTopicVote = (topicId: string) => {
    persist(toggleTopicVote(topicId));
    const target = topics.find((t) => t.id === topicId);
    if (target) {
      awardReputation(target.authorName, target.votedByMe ? -2 : 2);
    }
    setTopics((prev) =>
      prev.map((t) =>
        t.id === topicId
          ? {
              ...t,
              votedByMe: !t.votedByMe,
              votes: t.votedByMe ? t.votes - 1 : t.votes + 1,
            }
          : t
      )
    );
  };

  const handleToggleReplyLike = (topicId: string, replyId: string) => {
    persist(toggleReplyLike(replyId));
    const topic = topics.find((t) => t.id === topicId);
    const reply = topic?.replies.find((r) => r.id === replyId);
    if (reply) {
      awardReputation(reply.authorName, reply.likedByMe ? -2 : 2);
    }

    setTopics((prev) =>
      prev.map((t) =>
        t.id === topicId
          ? {
              ...t,
              replies: t.replies.map((r) =>
                r.id === replyId
                  ? {
                      ...r,
                      likedByMe: !r.likedByMe,
                      likes: r.likedByMe ? r.likes - 1 : r.likes + 1,
                    }
                  : r
              ),
            }
          : t
      )
    );
  };

  const handleMarkBestAnswer = (topicId: string, replyId: string) => {
    persist(markBestAnswer(topicId, replyId));
    const topic = topics.find((t) => t.id === topicId);
    const reply = topic?.replies.find((r) => r.id === replyId);
    if (reply && !reply.isBestAnswer) {
      awardReputation(reply.authorName, 15, 'Beste Antwoord', 'best_answer');
    }

    setTopics((prev) =>
      prev.map((t) =>
        t.id === topicId
          ? {
              ...t,
              solved: true,
              replies: t.replies.map((r) => ({
                ...r,
                isBestAnswer: r.id === replyId,
              })),
            }
          : t
      )
    );
  };

  const handleAddReply = (
    topicId: string,
    content: string,
    codeSnippet?: CodeSnippet,
    attachments?: TopicAttachment[]
  ) => {
    if (!currentUser) return;
    persist(
      addReply({
        topicId,
        content,
        codeSnippet,
        attachments,
        author: currentUser,
      })
    );
    setTopics((prev) =>
      prev.map((t) =>
        t.id === topicId
          ? {
              ...t,
              lastActivity: 'Zojuist',
              replies: [
                ...t.replies,
                {
                  id: `r-${Date.now()}`,
                  authorId: currentUser.id,
                  authorName: currentUser.name,
                  authorInitials: currentUser.initials,
                  authorColor: currentUser.avatarColor,
                  authorRole: currentUser.role,
                  content,
                  codeSnippet,
                  attachments,
                  createdAt: 'Zojuist',
                  likes: 0,
                },
              ],
            }
          : t
      )
    );
    setCurrentUser((prev) => (prev ? { ...prev, postsCount: prev.postsCount + 1 } : null));
    awardReputation(currentUser.name, 5, 'Actieve Helper', 'add_reply');
  };

  const handleOpenNewTopic = () => {
    if (!currentUser) {
      setAuthModal({ open: true, mode: 'register' });
      return;
    }
    setNewTopicOpen(true);
  };

  const handleCreateTopic = ({
    title,
    category,
    body,
    codeSnippet,
    attachments,
  }: {
    title: string;
    category: Exclude<CategoryId, 'all'>;
    body: string;
    codeSnippet?: CodeSnippet;
    attachments?: TopicAttachment[];
  }) => {
    if (!currentUser) return;
    persist(
      createTopic({
        title,
        category,
        body,
        codeSnippet,
        attachments,
        author: currentUser,
      })
    );
    const catLabel = CATEGORIES.find((c) => c.id === category)?.label ?? 'Algemeen';
    const newTopic: Topic = {
      id: `t-${Date.now()}`,
      title,
      excerpt: body.length > 140 ? `${body.slice(0, 140)}...` : body,
      body,
      codeSnippet,
      attachments,
      category,
      categoryLabel: catLabel,
      authorName: currentUser.name,
      authorInitials: currentUser.initials,
      authorColor: currentUser.avatarColor,
      authorRole: currentUser.role,
      createdAt: 'Zojuist',
      lastActivity: 'Zojuist',
      votes: 1,
      votedByMe: true,
      views: 1,
      replies: [],
    };
    setTopics((prev) => [newTopic, ...prev]);
    setCurrentUser((prev) => (prev ? { ...prev, postsCount: prev.postsCount + 1 } : null));
    awardReputation(currentUser.name, 10, 'Topic Starter', 'create_topic');
  };

  const handleToggleProjectLike = (projectId: string) => {
    persist(toggleProjectLike(projectId));
    setGalleryProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? {
              ...p,
              likedByMe: !p.likedByMe,
              likes: p.likedByMe ? p.likes - 1 : p.likes + 1,
            }
          : p
      )
    );
  };

  const handleOpenNewProject = () => {
    if (!currentUser) {
      setAuthModal({ open: true, mode: 'register' });
      return;
    }
    setNewProjectOpen(true);
  };

  const handleCreateProject = ({
    title,
    description,
    stack,
    previewPreset,
    customMarkup,
    language,
    code,
  }: {
    title: string;
    description: string;
    stack: string;
    previewPreset: PreviewPresetId;
    customMarkup?: string;
    language: CodeLanguage;
    code: string;
  }) => {
    if (!currentUser) return;
    persist(
      createProject({
        title,
        description,
        stack,
        previewPreset,
        customMarkup,
        codeSnippet: { language, code },
        author: currentUser,
      })
    );
    const newProject: GalleryProject = {
      id: `gp-${Date.now()}`,
      title,
      description,
      stack,
      authorName: currentUser.name,
      authorInitials: currentUser.initials,
      authorColor: currentUser.avatarColor,
      createdAt: 'Zojuist',
      likes: 1,
      likedByMe: true,
      previewPreset,
      customMarkup,
      codeSnippet: {
        language,
        code,
      },
    };
    setGalleryProjects((prev) => [newProject, ...prev]);
    awardReputation(currentUser.name, 15, 'Project Pionier', 'create_project');
  };

  const handleVotePoll = (optionId: string) => {
    persist(votePoll(optionId));
    setPoll((prev) => ({
      ...prev,
      options: prev.options.map((opt) => {
        if (opt.id === optionId && selectedPollOption !== optionId) {
          return { ...opt, votes: opt.votes + 1 };
        }
        if (opt.id === selectedPollOption && selectedPollOption !== optionId) {
          return { ...opt, votes: Math.max(0, opt.votes - 1) };
        }
        return opt;
      }),
    }));
    setSelectedPollOption(optionId);
  };

  const handleScrollToChat = () => {
    const el = document.getElementById('live-chat');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const selectedTopic = topics.find((t) => t.id === selectedTopicId) ?? null;
  const selectedProject = galleryProjects.find((p) => p.id === selectedProjectId) ?? null;
  const totalOnline = isSupabaseConfigured
    ? Math.max(onlineMembers.length, presenceCount)
    : onlineMembers.length + 3;

  return (
    <div className="isolate min-h-screen bg-[#f4f3f8] dark:bg-[#0b0a12] text-slate-900 dark:text-[#f5f3ff] transition-colors duration-200">
      {/* Bewegende achtergrond (stijl in src/index.css → "Bewegende achtergrond") */}
      <div className="forum-aurora" aria-hidden="true">
        <div className="forum-aurora__blob forum-aurora__blob--a" />
        <div className="forum-aurora__blob forum-aurora__blob--b" />
      </div>

      <SidebarNav
        activeTab={activeTab}
        onSelectTab={navigateTo}
        expanded={sidebarExpanded}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        currentUser={currentUser}
        topicsCount={topics.length}
        newsCount={news.length}
        galleryCount={galleryProjects.length}
        canAdmin={currentUser?.role === 'Beheerder' || currentUser?.role === 'Moderator'}
        onOpenAdmin={() => setAdminOpen(true)}
      />

      <div
        className={`min-h-screen flex flex-col transition-all duration-200 ease-out ${
          sidebarExpanded ? 'md:pl-[224px]' : 'md:pl-[68px]'
        }`}
      >
        <TopBar
          onToggleSidebar={handleToggleSidebar}
          onlineCount={totalOnline}
          isDark={isDark}
          onToggleTheme={() => setIsDark((prev) => !prev)}
          activeThemeAccent={activeThemeAccent}
          customThemeHex={customThemeHex}
          glowIntensity={glowIntensity}
          tintedSurfaces={tintedSurfaces}
          onSelectThemeAccent={handleSelectThemeAccent}
          onChangeCustomThemeHex={handleChangeCustomThemeHex}
          onChangeGlowIntensity={setGlowIntensity}
          onToggleTintedSurfaces={() => setTintedSurfaces((prev) => !prev)}
          currentUser={currentUser}
          onOpenLogin={() => setAuthModal({ open: true, mode: 'login' })}
          onLogout={handleLogout}
          onOpenNewTopic={handleOpenNewTopic}
          topics={topics}
          news={news}
          projects={galleryProjects}
          onSelectTopic={(topic) => {
            navigateTo('forum');
            setSelectedTopicId(topic.id);
          }}
          onSelectNews={(item) => {
            setSelectedNews(item);
          }}
          onSelectProject={(project) => {
            navigateTo('gallery');
            setSelectedProjectId(project.id);
          }}
        />

        <main className="flex-1 w-full max-w-[1260px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {(isLoading || dataError) && (
            <div className="mb-4 space-y-2">
              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#9c96b2]">
                  <span className="w-3 h-3 rounded-full border-2 border-[#a88bfa] border-t-transparent animate-spin" />
                  Forumgegevens worden geladen...
                </div>
              )}
              {dataError && (
                <div
                  role="alert"
                  className="flex items-start justify-between gap-3 rounded-xl border border-red-300/60 bg-red-500/10 px-4 py-3 text-xs text-red-700 dark:text-red-300"
                >
                  <span>{dataError}</span>
                  <button
                    type="button"
                    onClick={() => setDataError(null)}
                    className="shrink-0 font-semibold underline cursor-pointer"
                  >
                    Sluiten
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
            <div
              key={activeTab === 'forum' ? `forum:${forumCategory ?? 'index'}` : activeTab}
              className="space-y-6 min-w-0 forum-page-enter"
            >
              {activeTab === 'landing' && (
                <>
                  <LandingHome
                    topics={topics}
                    galleryProjects={galleryProjects}
                    news={news}
                    members={onlineMembers}
                    poll={poll}
                    selectedPollOption={selectedPollOption}
                    onVotePoll={handleVotePoll}
                    onNavigate={navigateTo}
                    onOpenTopicInForum={(topicId) => {
                      navigateTo('forum');
                      setSelectedTopicId(topicId);
                    }}
                  />

                  <LiveChat
                    messages={chatMessages}
                    watcherCount={totalOnline}
                    currentUser={currentUser}
                    onlineMembers={onlineMembers}
                    typingUsers={typingUsers}
                    onSendMessage={handleSendChatMessage}
                    onTypingChange={handleTypingChange}
                    onToggleReaction={handleToggleChatReaction}
                    onOpenAuth={(mode) => setAuthModal({ open: true, mode })}
                    notificationsEnabled={notificationsEnabled}
                    notificationPermission={notificationPermission}
                    onToggleNotifications={handleToggleNotifications}
                  />
                </>
              )}

              {/* /forum → altijd de forumindex; /forum/f/<id> → topics van dat forum */}
              {activeTab === 'forum' && (
                <>
                  {forumCategory === null ? (
                    <ForumIndex
                      topics={topics}
                      members={onlineMembers}
                      onNavigateToForum={(forumId) => openForumCategory(forumId as CategoryId)}
                      onNavigateToTopic={(topicId) => setSelectedTopicId(topicId)}
                    />
                  ) : (
                    <HomeFeed
                      topics={topics}
                      galleryProjects={galleryProjects}
                      onlineMembers={onlineMembers}
                      poll={poll}
                      selectedPollOption={selectedPollOption}
                      onVotePoll={handleVotePoll}
                      onSelectTopic={(topic) => setSelectedTopicId(topic.id)}
                      onToggleTopicVote={handleToggleTopicVote}
                      onSelectProject={(project) => setSelectedProjectId(project.id)}
                      onToggleProjectLike={handleToggleProjectLike}
                      onOpenNewTopic={handleOpenNewTopic}
                      onScrollToChat={handleScrollToChat}
                      onViewAllTopics={() => openForumCategory(null)}
                      onViewGallery={() => navigateTo('gallery')}
                      initialCategory={forumCategory}
                    />
                  )}

                  <LiveChat
                    messages={chatMessages}
                    watcherCount={totalOnline}
                    currentUser={currentUser}
                    onlineMembers={onlineMembers}
                    typingUsers={typingUsers}
                    onSendMessage={handleSendChatMessage}
                    onTypingChange={handleTypingChange}
                    onToggleReaction={handleToggleChatReaction}
                    onOpenAuth={(mode) => setAuthModal({ open: true, mode })}
                    notificationsEnabled={notificationsEnabled}
                    notificationPermission={notificationPermission}
                    onToggleNotifications={handleToggleNotifications}
                  />
                </>
              )}

              {activeTab === 'releases' && (
                <ReleasesView
                  currentUser={currentUser}
                  onlineMembers={onlineMembers}
                  onOpenAuth={(mode) => setAuthModal({ open: true, mode })}
                />
              )}

              {activeTab === 'news' && (
                <NewsView
                  news={news}
                  onSelectNews={setSelectedNews}
                  onBackHome={() => navigateTo('forum')}
                />
              )}

              {activeTab === 'gallery' && (
                <>
                  <ProjectGalleryView
                    projects={galleryProjects}
                    onlineMembers={onlineMembers}
                    onToggleLike={handleToggleProjectLike}
                    onSelectProject={(project) => setSelectedProjectId(project.id)}
                    onOpenSubmit={handleOpenNewProject}
                  />
                  <LiveChat
                    messages={chatMessages}
                    watcherCount={totalOnline}
                    currentUser={currentUser}
                    onlineMembers={onlineMembers}
                    typingUsers={typingUsers}
                    onSendMessage={handleSendChatMessage}
                    onTypingChange={handleTypingChange}
                    onToggleReaction={handleToggleChatReaction}
                    onOpenAuth={(mode) => setAuthModal({ open: true, mode })}
                    notificationsEnabled={notificationsEnabled}
                    notificationPermission={notificationPermission}
                    onToggleNotifications={handleToggleNotifications}
                  />
                </>
              )}

              {activeTab === 'docs' && <DocsView />}

              {activeTab === 'profile' && (
                <ProfileView
                  currentUser={currentUser}
                  members={onlineMembers}
                  activeThemeAccent={activeThemeAccent}
                  customThemeHex={customThemeHex}
                  glowIntensity={glowIntensity}
                  tintedSurfaces={tintedSurfaces}
                  onSelectThemeAccent={handleSelectThemeAccent}
                  onChangeCustomThemeHex={handleChangeCustomThemeHex}
                  onChangeGlowIntensity={setGlowIntensity}
                  onToggleTintedSurfaces={() => setTintedSurfaces((prev) => !prev)}
                  onUpdateSocialLinks={handleUpdateSocialLinks}
                  onOpenAuth={(mode) => setAuthModal({ open: true, mode })}
                  onLogout={handleLogout}
                />
              )}
            </div>

            <RightSidebar
              currentUser={currentUser}
              onlineMembers={onlineMembers}
              news={news}
              supportRaised={supportRaised}
              supportGoal={supportGoal}
              onOpenAuth={(mode) => setAuthModal({ open: true, mode })}
              onNavigate={navigateTo}
              onSelectNews={setSelectedNews}
              onOpenSupport={() => setSupportOpen(true)}
            />
          </div>
        </main>

        <footer className="border-t border-slate-200 dark:border-white/[0.06] py-5 px-4 text-center text-xs text-slate-500 dark:text-[#756f8c]">
          <div className="flex items-center justify-center flex-wrap gap-2">
            <span>Copyright © 2026</span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setLegalModal('terms')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Algemene voorwaarden
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setLegalModal('privacy')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Privacybeleid
            </button>
          </div>
        </footer>
      </div>

      {adminOpen && <AdminDashboard onClose={() => setAdminOpen(false)} />}

      <AuthModal
        isOpen={authModal.open}
        initialMode={authModal.mode}
        onClose={() => setAuthModal((prev) => ({ ...prev, open: false }))}
        onAuthenticate={handleAuthenticate}
      />

      <TopicDetailModal
        topic={selectedTopic}
        currentUser={currentUser}
        onlineMembers={onlineMembers}
        onClose={() => setSelectedTopicId(null)}
        onToggleTopicVote={handleToggleTopicVote}
        onToggleReplyLike={handleToggleReplyLike}
        onMarkBestAnswer={handleMarkBestAnswer}
        onAddReply={handleAddReply}
        onOpenAuth={(mode) => {
          setSelectedTopicId(null);
          setAuthModal({ open: true, mode });
        }}
      />

      <NewTopicModal
        isOpen={newTopicOpen}
        onClose={() => setNewTopicOpen(false)}
        onCreateTopic={handleCreateTopic}
      />

      <ProjectDetailModal
        project={selectedProject}
        onClose={() => setSelectedProjectId(null)}
        onToggleLike={handleToggleProjectLike}
      />

      <NewProjectModal
        isOpen={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        onCreateProject={handleCreateProject}
      />

      <NewsDetailModal item={selectedNews} onClose={() => setSelectedNews(null)} />

      <SupportModal
        isOpen={supportOpen}
        onClose={() => setSupportOpen(false)}
        onContribute={(amount) => {
          setSupportRaised((prev) => prev + amount);
          persist(awardServerReputation(15, 'Supporter'));
          if (currentUser) {
            awardReputation(currentUser.name, 15, 'Supporter', 'support_forum');
          }
        }}
      />

      <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />
    </div>
  );
}
