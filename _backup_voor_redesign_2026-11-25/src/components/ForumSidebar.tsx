import React from 'react';
import { Users, UserPlus, Trophy, MessageSquare } from 'lucide-react';
import { Member } from '../types/forum';
import { cx } from '../components/admin/ui';

interface ForumSidebarProps {
  onlineMembers: Member[];
  totalMembers: number;
  totalTopics: number;
  totalPosts: number;
  newestMember: Member | null;
  latestPosts: Array<{ topicId: string; topicTitle: string; authorName: string; authorColor: string; timestamp: string; forumName: string }>;
  topPosters: Array<{ name: string; postsCount: number; avatarColor: string; initials: string }>;
  className?: string;
  /** Optioneel: opent een topic direct (anders degraderen links naar niet-navigerend). */
  onNavigateToTopic?: (topicId: string) => void;
}

export const ForumSidebar: React.FC<ForumSidebarProps> = ({
  onlineMembers,
  totalMembers,
  totalTopics,
  totalPosts,
  newestMember,
  latestPosts,
  topPosters,
  className,
  onNavigateToTopic,
}) => {
  const onlineCount = onlineMembers.filter(m => m.isOnline).length;

  return (
    <aside className={cx('forum-sidebar', className)}>
      {/* Forum Statistics */}
      <div className="forum-stats">
        <div className="forum-stat-card">
          <div className="forum-stat-value">{totalMembers.toLocaleString()}</div>
          <div className="forum-stat-label">Leden</div>
        </div>
        <div className="forum-stat-card">
          <div className="forum-stat-value">{totalTopics.toLocaleString()}</div>
          <div className="forum-stat-label">Topics</div>
        </div>
        <div className="forum-stat-card">
          <div className="forum-stat-value">{totalPosts.toLocaleString()}</div>
          <div className="forum-stat-label">Berichten</div>
        </div>
        <div className="forum-stat-card">
          <div className="forum-stat-value">{onlineCount}</div>
          <div className="forum-stat-label">Online</div>
        </div>
      </div>

      {/* Newest Member */}
      {newestMember && (
        <div className="mb-6">
          <h4 className="forum-sidebar-title flex items-center gap-2">
            <UserPlus className="w-4 h-4" aria-hidden="true" />
            Nieuwste lid
          </h4>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
              style={{ backgroundColor: newestMember.avatarColor, color: '#0f0c18' }}
            >
              {newestMember.initials}
            </div>
            <div className="flex-1 min-w-0">
              <a href={`/profiel/${newestMember.id}`} onClick={(e) => e.preventDefault()} className="font-medium text-slate-900 dark:text-white hover:text-violet-500 dark:hover:text-[#a88bfa] truncate block">
                {newestMember.name}
              </a>
              <span className="text-xs text-slate-500 dark:text-[#8d87a4]">Geregistreerd: {newestMember.joinedAt}</span>
            </div>
          </div>
        </div>
      )}

      {/* Who's Online */}
      <div className="mb-6">
        <h4 className="forum-sidebar-title flex items-center gap-2">
          <Users className="w-4 h-4" aria-hidden="true" />
          Wie is er online ({onlineCount})
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {onlineMembers.filter(m => m.isOnline).slice(0, 20).map((member) => (
            <a
              key={member.id}
              href={`/profiel/${member.id}`}
              onClick={(e) => e.preventDefault()}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/50 dark:bg-slate-900/50 hover:bg-slate-700/50 transition-colors"
              title={member.name}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs"
                style={{ backgroundColor: member.avatarColor, color: '#0f0c18' }}
              >
                {member.initials}
              </div>
              <span className="text-sm truncate max-w-[100px]">{member.name}</span>
            </a>
          ))}
          {onlineCount > 20 && (
            <span className="px-2 py-1 text-xs text-slate-500 dark:text-[#8d87a4]">+ {onlineCount - 20} meer</span>
          )}
        </div>
      </div>

      {/* Latest Posts */}
      {latestPosts.length > 0 && (
        <div className="mb-6">
          <h4 className="forum-sidebar-title flex items-center gap-2">
            <MessageSquare className="w-4 h-4" aria-hidden="true" />
            Laatste berichten
          </h4>
          <div className="space-y-3">
            {latestPosts.slice(0, 5).map((post) => (
              <div key={post.topicId} className="forum-sidebar-item">
                <a
                  href={`/forum/t/${post.topicId}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigateToTopic?.(post.topicId);
                  }}
                  className="font-medium text-slate-900 dark:text-white hover:text-violet-500 dark:hover:text-[#a88bfa] block truncate"
                >
                  {post.topicTitle}
                </a>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-[#8d87a4]">
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[10px]"
                    style={{ backgroundColor: post.authorColor, color: '#0f0c18' }}
                  >
                    {post.authorName.slice(0, 2).toUpperCase()}
                  </span>
                  <span>{post.authorName}</span>
                  <span>·</span>
                  <time>{post.timestamp}</time>
                  <span>·</span>
                  <span className="text-violet-400">{post.forumName}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Posters */}
      {topPosters.length > 0 && (
        <div className="mb-6">
          <h4 className="forum-sidebar-title flex items-center gap-2">
            <Trophy className="w-4 h-4" aria-hidden="true" />
            Top posters deze week
          </h4>
          <ol className="space-y-2">
            {topPosters.slice(0, 10).map((poster, index) => (
              <li key={poster.name} className="flex items-center gap-3 forum-sidebar-item">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-800/50 dark:bg-slate-900/50 flex-shrink-0">
                  {index + 1}
                </span>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: poster.avatarColor, color: '#0f0c18' }}
                >
                  {poster.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{poster.name}</div>
                  <div className="text-xs text-slate-500 dark:text-[#8d87a4]">{poster.postsCount} berichten</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Forum Legend */}
      <div>
        <h4 className="forum-sidebar-title flex items-center gap-2">
          <MessageSquare className="w-4 h-4" aria-hidden="true" />
          Legenda
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-yellow-500/30 border border-yellow-500/50" aria-hidden="true" />
            <span>Gepind topic</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-red-500/30 border border-red-500/50" aria-hidden="true" />
            <span>Aankondiging</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50" aria-hidden="true" />
            <span>Opgelost</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Gesloten topic</span>
          </div>
        </div>
      </div>
    </aside>
  );
};