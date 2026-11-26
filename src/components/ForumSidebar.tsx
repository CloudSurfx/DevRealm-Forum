import React from 'react';
import { Users, UserPlus, Trophy, MessageSquare } from 'lucide-react';
import { Member } from '../types/forum';

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
    <aside className={`surface ${className || ''}`} aria-label="Forum zijbalk">
      {/* Forum Statistics */}
      <div className="p-4 grid grid-cols-2 gap-3 mb-6">
        <div className="bg-[var(--forum-bg-elevated)] rounded-lg p-3 text-center">
          <div className="font-display font-bold text-xl text-[var(--color-text)]">{totalMembers.toLocaleString()}</div>
          <div className="text-xs text-[var(--color-text-dim)]">Leden</div>
        </div>
        <div className="bg-[var(--forum-bg-elevated)] rounded-lg p-3 text-center">
          <div className="font-display font-bold text-xl text-[var(--color-text)]">{totalTopics.toLocaleString()}</div>
          <div className="text-xs text-[var(--color-text-dim)]">Topics</div>
        </div>
        <div className="bg-[var(--forum-bg-elevated)] rounded-lg p-3 text-center">
          <div className="font-display font-bold text-xl text-[var(--color-text)]">{totalPosts.toLocaleString()}</div>
          <div className="text-xs text-[var(--color-text-dim)]">Berichten</div>
        </div>
        <div className="bg-[var(--forum-bg-elevated)] rounded-lg p-3 text-center">
          <div className="font-display font-bold text-xl text-[var(--color-text)]">{onlineCount}</div>
          <div className="text-xs text-[var(--color-text-dim)]">Online</div>
        </div>
      </div>

      {/* Newest Member */}
      {newestMember && (
        <div className="px-4 mb-6">
          <h4 className="font-semibold text-sm text-[var(--color-text-muted)] flex items-center gap-2 mb-3">
            <UserPlus className="w-4 h-4" aria-hidden="true" />
            Nieuwste lid
          </h4>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-[var(--color-text-inverse)]"
              style={{ backgroundColor: newestMember.avatarColor }}
            >
              {newestMember.initials}
            </div>
            <div className="flex-1 min-w-0">
              <a href={`/profiel/${newestMember.id}`} onClick={(e) => e.preventDefault()} className="font-medium text-[var(--color-text)] hover:text-[var(--forum-accent)] truncate block transition-colors">
                {newestMember.name}
              </a>
              <span className="text-xs text-[var(--color-text-dim)]">Geregistreerd: {newestMember.joinedAt}</span>
            </div>
          </div>
        </div>
      )}

      {/* Who's Online */}
      <div className="px-4 mb-6">
        <h4 className="font-semibold text-sm text-[var(--color-text-muted)] flex items-center gap-2 mb-3">
          <Users className="w-4 h-4" aria-hidden="true" />
          Wie is er online ({onlineCount})
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {onlineMembers.filter(m => m.isOnline).slice(0, 20).map((member) => (
            <a
              key={member.id}
              href={`/profiel/${member.id}`}
              onClick={(e) => e.preventDefault()}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--forum-bg-elevated)] hover:bg-[var(--color-bg-hover)] transition-colors"
              title={member.name}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs text-[var(--color-text-inverse)]"
                style={{ backgroundColor: member.avatarColor }}
              >
                {member.initials}
              </div>
              <span className="text-sm truncate max-w-[100px] text-[var(--color-text)]">{member.name}</span>
            </a>
          ))}
          {onlineCount > 20 && (
            <span className="px-2 py-1 text-xs text-[var(--color-text-dim)]">+ {onlineCount - 20} meer</span>
          )}
        </div>
      </div>

      {/* Latest Posts */}
      {latestPosts.length > 0 && (
        <div className="px-4 mb-6">
          <h4 className="font-semibold text-sm text-[var(--color-text-muted)] flex items-center gap-2 mb-3">
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
                  className="font-medium text-[var(--color-text)] hover:text-[var(--forum-accent)] block truncate transition-colors"
                >
                  {post.topicTitle}
                </a>
                <div className="flex items-center gap-2 mt-1 text-xs text-[var(--color-text-dim)]">
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[10px] text-[var(--color-text-inverse)]"
                    style={{ backgroundColor: post.authorColor }}
                  >
                    {post.authorName.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="text-[var(--color-text-muted)]">{post.authorName}</span>
                  <span>·</span>
                  <time>{post.timestamp}</time>
                  <span>·</span>
                  <span className="text-[var(--forum-accent)]">{post.forumName}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Posters */}
      {topPosters.length > 0 && (
        <div className="px-4 mb-6">
          <h4 className="font-semibold text-sm text-[var(--color-text-muted)] flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4" aria-hidden="true" />
            Top posters deze week
          </h4>
          <ol className="space-y-2">
            {topPosters.slice(0, 10).map((poster, index) => (
              <li key={poster.name} className="flex items-center gap-3 forum-sidebar-item">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-[var(--color-text-dim)] bg-[var(--forum-bg-elevated)] flex-shrink-0">
                  {index + 1}
                </span>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 text-[var(--color-text-inverse)]"
                  style={{ backgroundColor: poster.avatarColor }}
                >
                  {poster.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate text-[var(--color-text)]">{poster.name}</div>
                  <div className="text-xs text-[var(--color-text-dim)]">{poster.postsCount} berichten</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Forum Legend */}
      <div className="px-4 pt-4 border-t border-[var(--forum-border)]">
        <h4 className="font-semibold text-sm text-[var(--color-text-muted)] flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4" aria-hidden="true" />
          Legenda
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-[var(--color-warning-muted)] border border-[var(--color-warning)]/50" aria-hidden="true" />
            <span className="text-[var(--color-text-muted)]">Gepind topic</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-[var(--color-error-muted)] border border-[var(--color-error)]/50" aria-hidden="true" />
            <span className="text-[var(--color-text-muted)]">Aankondiging</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-[var(--color-success-muted)] border border-[var(--color-success)]/50" aria-hidden="true" />
            <span className="text-[var(--color-text-muted)]">Opgelost</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[var(--color-text-dim)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-[var(--color-text-muted)]">Gesloten topic</span>
          </div>
        </div>
      </div>
    </aside>
  );
};