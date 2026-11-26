import React, { useState, useMemo, useCallback } from 'react';
import { MessageSquare, Flag, Lock, Pin, ChevronDown, ChevronUp, Search, Filter, ArrowUpDown, Plus } from 'lucide-react';
import { Topic, Member, Forum } from '../types/forum';
import { Breadcrumbs } from './Breadcrumbs';
import { ForumSidebar } from './ForumSidebar';
import { UserRank } from './UserRank';
import { Pagination } from '../components/admin/ui';
import { cx, formatRelative, debounce } from '../components/admin/ui';
import { createInitialsAvatarDataUri } from '../utils/notificationAvatar';

interface ThreadListProps {
  forum: Forum;
  topics: Topic[];
  members: Member[];
  currentUser: Member | null;
  onNavigateToThread: (topicId: string) => void;
  onCreateThread: () => void;
  onNavigateBack: () => void;
}

type SortOption = 'lastActivity' | 'createdAt' | 'replies' | 'views' | 'title';
type SortDirection = 'asc' | 'desc';

export const ThreadList: React.FC<ThreadListProps> = ({
  forum,
  topics,
  members,
  currentUser,
  onNavigateToThread,
  onCreateThread,
  onNavigateBack,
}) => {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>('lastActivity');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [filterPrefix, setFilterPrefix] = useState<string | 'all'>('all');
  const ITEMS_PER_PAGE = 25;

  // Get all prefixes from topics
  const allPrefixes = useMemo(() => {
    const prefixes = new Set<string>();
    topics.forEach(t => t.prefix && prefixes.add(t.prefix));
    return Array.from(prefixes).sort();
  }, [topics]);

  // Filter and sort topics
  const filteredTopics = useMemo(() => {
    let result = [...topics];

    // Filter by forum
    result = result.filter(t => t.category === forum.id);

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(query) ||
        t.authorName.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Pinned only
    if (showPinnedOnly) {
      result = result.filter(t => t.isPinned);
    }

    // Prefix filter
    if (filterPrefix !== 'all') {
      result = result.filter(t => t.prefix === filterPrefix);
    }

    // Sort
    result.sort((a, b) => {
      let valA: string | number | Date;
      let valB: string | number | Date;

      switch (sortBy) {
        case 'lastActivity':
          valA = new Date(a.lastActivity).getTime();
          valB = new Date(b.lastActivity).getTime();
          break;
        case 'createdAt':
          valA = new Date(a.createdAt).getTime();
          valB = new Date(b.createdAt).getTime();
          break;
        case 'replies':
          valA = a.replies.length;
          valB = b.replies.length;
          break;
        case 'views':
          valA = a.views || 0;
          valB = b.views || 0;
          break;
        case 'title':
          valA = a.title.toLowerCase();
          valB = b.title.toLowerCase();
          break;
        default:
          valA = new Date(a.lastActivity).getTime();
          valB = new Date(b.lastActivity).getTime();
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [topics, forum.id, searchQuery, showPinnedOnly, filterPrefix, sortBy, sortDir]);

  // Separate pinned and regular topics
  const pinnedTopics = useMemo(() => filteredTopics.filter(t => t.isPinned), [filteredTopics]);
  const regularTopics = useMemo(() => filteredTopics.filter(t => !t.isPinned), [filteredTopics]);

  // Pagination for regular topics only
  const totalPages = Math.ceil(regularTopics.length / ITEMS_PER_PAGE) || 1;
  const paginatedTopics = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return regularTopics.slice(start, start + ITEMS_PER_PAGE);
  }, [regularTopics, page]);

  // Combine pinned + paginated regular
  const displayTopics = [...pinnedTopics, ...paginatedTopics];

  // Stats for sidebar
  const forumTopics = topics.filter(t => t.category === forum.id);
  const totalPosts = forumTopics.reduce((sum, t) => sum + t.replies.length + 1, 0);
  const newestMember = [...members].sort((a, b) =>
    new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
  )[0];

  // Latest posts for sidebar
  const latestPosts = useMemo(() => {
    const allPosts: Array<{ topicId: string; topicTitle: string; authorName: string; authorColor: string; timestamp: string; forumName: string }> = [];
    forumTopics.forEach(topic => {
      topic.replies.forEach(reply => {
        allPosts.push({
          topicId: topic.id,
          topicTitle: topic.title,
          authorName: reply.authorName,
          authorColor: reply.authorColor,
          timestamp: reply.createdAt,
          forumName: forum.name,
        });
      });
      allPosts.push({
        topicId: topic.id,
        topicTitle: topic.title,
        authorName: topic.authorName,
        authorColor: topic.authorColor,
        timestamp: topic.lastActivity,
        forumName: forum.name,
      });
    });
    return allPosts
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  }, [forumTopics, forum.name]);

  // Top posters
  const topPosters = useMemo(() => {
    const posterMap = new Map<string, { name: string; postsCount: number; avatarColor: string; initials: string }>();
    forumTopics.forEach(topic => {
      const starter = posterMap.get(topic.authorName) || { name: topic.authorName, postsCount: 0, avatarColor: topic.authorColor, initials: topic.authorInitials };
      starter.postsCount += 1;
      posterMap.set(topic.authorName, starter);
      topic.replies.forEach(reply => {
        const replier = posterMap.get(reply.authorName) || { name: reply.authorName, postsCount: 0, avatarColor: reply.authorColor, initials: reply.authorInitials };
        replier.postsCount += 1;
        posterMap.set(reply.authorName, replier);
      });
    });
    return Array.from(posterMap.values())
      .sort((a, b) => b.postsCount - a.postsCount)
      .slice(0, 10);
  }, [forumTopics]);

  const breadcrumbs = [
    { label: 'Forum', path: '/forum' },
    { label: forum.name },
  ];

  const handleSort = useCallback((field: SortOption) => {
    if (sortBy === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
    setPage(1);
  }, [sortBy]);

  const SortIcon = ({ field }: { field: SortOption }) => {
    if (sortBy !== field) return <ArrowUpDown className="w-4 h-4 text-slate-500 ml-1" />;
    return sortDir === 'asc' ? <ChevronUp className="w-4 h-4 text-violet-400 ml-1" /> : <ChevronDown className="w-4 h-4 text-violet-400 ml-1" />;
  };

  return (
    <div className="forum-page min-h-screen">
      <Breadcrumbs items={breadcrumbs} />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main thread list */}
          <div className="lg:col-span-3 space-y-6">
            {/* Forum header with actions */}
            <div className="forum-header-actions flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{forum.name}</h1>
                <p className="text-slate-500 dark:text-[#8d87a4] mt-1">{forum.description}</p>
              </div>
              <div className="flex items-center gap-3">
                {currentUser && (
                  <button
                    onClick={onCreateThread}
                    className="btn-primary flex items-center gap-2 px-4 py-2"
                  >
                    <Plus className="w-4 h-4" />
                    Nieuw topic
                  </button>
                )}
              </div>
            </div>

            {/* Filter/Sort bar */}
            <div className="forum-filter-bar flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPinnedOnly}
                    onChange={e => { setShowPinnedOnly(e.target.checked); setPage(1); }}
                    className="rounded border-slate-600 text-violet-500 focus:ring-violet-500"
                  />
                  <span className="text-sm text-slate-500 dark:text-[#8d87a4]">Alleen gepind</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Zoek in dit forum..."
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                    className="input-field pl-10 w-64"
                  />
                </div>
                <select
                  value={filterPrefix}
                  onChange={e => { setFilterPrefix(e.target.value); setPage(1); }}
                  className="input-field w-40"
                >
                  <option value="all">Alle prefixes</option>
                  {allPrefixes.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 dark:text-[#8d87a4]">Sorteer:</span>
                <select
                  value={sortBy}
                  onChange={e => handleSort(e.target.value as SortOption)}
                  className="input-field w-40"
                >
                  <option value="lastActivity">Laatste activiteit</option>
                  <option value="createdAt">Aangemaakt</option>
                  <option value="replies">Antwoorden</option>
                  <option value="views">Weergaven</option>
                  <option value="title">Titel</option>
                </select>
              </div>
            </div>

            {/* Thread table */}
            <div className="forum-table-wrapper overflow-x-auto">
              <table className="forum-table" role="grid">
                <thead>
                  <tr>
                    <th className="col-thread" scope="col">
                      <button
                        onClick={() => handleSort('title')}
                        className="flex items-center gap-1 hover:text-violet-400 transition-colors"
                      >
                        Topic <SortIcon field="title" />
                      </button>
                    </th>
                    <th className="col-replies" scope="col">
                      <button
                        onClick={() => handleSort('replies')}
                        className="flex items-center gap-1 hover:text-violet-400 transition-colors justify-center"
                      >
                        Antwoorden <SortIcon field="replies" />
                      </button>
                    </th>
                    <th className="col-views" scope="col">
                      <button
                        onClick={() => handleSort('views')}
                        className="flex items-center gap-1 hover:text-violet-400 transition-colors justify-center"
                      >
                        Weergaven <SortIcon field="views" />
                      </button>
                    </th>
                    <th className="col-lastpost" scope="col">
                      <button
                        onClick={() => handleSort('lastActivity')}
                        className="flex items-center gap-1 hover:text-violet-400 transition-colors"
                      >
                        Laatste bericht <SortIcon field="lastActivity" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Pinned topics */}
                  {pinnedTopics.length > 0 && (
                    <>
                      <tr className="forum-table-section-header">
                        <th colSpan={4} scope="rowgroup">Belangrijk / Gepind</th>
                      </tr>
                      {pinnedTopics.map((topic, index) => (
                        <ThreadRow
                          key={topic.id}
                          topic={topic}
                          index={index}
                          isPinned={true}
                          onClick={() => onNavigateToThread(topic.id)}
                          currentUser={currentUser}
                        />
                      ))}
                    </>
                  )}

                  {/* Regular topics */}
                  {regularTopics.length > 0 && (
                    <>
                      <tr className="forum-table-section-header">
                        <th colSpan={4} scope="rowgroup">Topics</th>
                      </tr>
                      {paginatedTopics.map((topic, index) => (
                        <ThreadRow
                          key={topic.id}
                          topic={topic}
                          index={index + pinnedTopics.length}
                          isPinned={false}
                          onClick={() => onNavigateToThread(topic.id)}
                          currentUser={currentUser}
                        />
                      ))}
                    </>
                  )}

                  {filteredTopics.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-slate-500 dark:text-[#8d87a4]">
                        Geen topics gevonden in dit forum.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="forum-pagination-wrapper">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  showPageNumbers={true}
                  maxPageNumbers={5}
                />
              </div>
            )}

            {/* Thread status legend */}
            <div className="forum-legend flex flex-wrap gap-4 text-sm text-slate-500 dark:text-[#8d87a4]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-yellow-500/30 border border-yellow-500/50" />
                <span>Gepind</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-red-500/30 border border-red-500/50" />
                <span>Aankondiging</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50" />
                <span>Opgelost</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5" />
                <span>Gesloten</span>
              </div>
              <div className="flex items-center gap-2">
                <Pin className="w-3.5 h-3.5" />
                <span>Gepind</span>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <ForumSidebar
              onlineMembers={members}
              totalMembers={members.length}
              totalTopics={forumTopics.length}
              totalPosts={totalPosts}
              newestMember={newestMember}
              latestPosts={latestPosts}
              topPosters={topPosters}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

// Thread row component
interface ThreadRowProps {
  topic: Topic;
  index: number;
  isPinned: boolean;
  onClick: () => void;
  currentUser: Member | null;
}

const ThreadRow: React.FC<ThreadRowProps> = ({ topic, index, isPinned, onClick, currentUser }) => {
  const authorInitials = topic.authorInitials || topic.authorName.slice(0, 2).toUpperCase();
  const authorColor = topic.authorColor || '#a88bfa';

  // Find last reply author
  const lastReply = topic.replies[topic.replies.length - 1];
  const lastAuthor = lastReply?.authorName || topic.authorName;
  const lastAuthorColor = lastReply?.authorColor || topic.authorColor;
  const lastAuthorInitials = lastReply?.authorInitials || lastAuthor.slice(0, 2).toUpperCase();
  const lastActivity = lastReply?.createdAt || topic.lastActivity;

  const isUnread = currentUser && new Date(topic.lastActivity) > new Date(currentUser.lastSeen || 0);

  const getTopicIcons = () => {
    const icons = [];
    if (topic.isPinned) icons.push(<Pin key="pin" className="w-4 h-4 text-yellow-400" title="Gepind" />);
    if (topic.isAnnouncement) icons.push(<Flag key="announce" className="w-4 h-4 text-red-400" title="Aankondiging" />);
    if (topic.isLocked) icons.push(<Lock key="lock" className="w-4 h-4 text-slate-400" title="Gesloten" />);
    if (topic.isSolved) icons.push(
      <svg key="solved" className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20" title="Opgelost"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
    );
    return icons;
  };

  return (
    <tr
      className={cx(
        'forum-thread-row',
        isPinned && 'pinned',
        topic.isLocked && 'locked',
        isUnread && 'unread'
      )}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <td className="col-thread">
        <div className="flex items-start gap-3">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {getTopicIcons()}
            {topic.prefix && (
              <span className="topic-prefix px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border"
                style={{
                  backgroundColor: `${topic.prefixColor}20`,
                  color: topic.prefixColor,
                  borderColor: `${topic.prefixColor}50`
                }}
              >
                {topic.prefix}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <a
              href={`/forum/t/${topic.id}`}
              onClick={e => { e.stopPropagation(); onClick(); }}
              className={cx('thread-title block', isUnread && 'font-bold')}
            >
              {topic.title}
            </a>
            <div className="thread-meta flex flex-wrap items-center gap-3 mt-1">
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                {topic.replies.length} antwoorden
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                {topic.views || 0} weergaven
              </span>
              {topic.tags.length > 0 && (
                <span className="flex items-center gap-1">
                  <span className="text-slate-500 dark:text-[#8d87a4]">Tags:</span>
                  {topic.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="topic-tag px-1.5 py-0.5 rounded text-[10px] bg-slate-800/50 dark:bg-slate-900/50 border border-slate-700 dark:border-slate-600">
                      {tag}
                    </span>
                  ))}
                  {topic.tags.length > 3 && (
                    <span className="text-[10px] text-slate-500 dark:text-[#8d87a4]">+{topic.tags.length - 3} meer</span>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="col-replies text-center font-mono tabular-nums">
        {topic.replies.length.toLocaleString()}
      </td>
      <td className="col-views text-center font-mono tabular-nums">
        {(topic.views || 0).toLocaleString()}
      </td>
      <td className="col-lastpost">
        <div className="lastpost-info">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0" style={{ backgroundColor: lastAuthorColor, color: '#0f0c18' }}>
              {lastAuthorInitials}
            </div>
            <a
              href={`/profiel/${topic.authorId}`}
              onClick={e => e.stopPropagation()}
              className="font-medium text-sm truncate max-w-[150px]"
              style={{ color: lastAuthorColor }}
            >
              {lastAuthor}
            </a>
          </div>
          <time className="lastpost-time block" dateTime={lastActivity}>
            {lastActivity}
          </time>
        </div>
      </td>
    </tr>
  );
};