import React from 'react';
import { ReplyIcon, Edit2, Flag, MessageSquare, User } from 'lucide-react';
import { Member, Reply, Topic } from '../types/forum';
import { UserRank } from './UserRank';
import { cx, formatRelative } from '../components/admin/ui';
import { createInitialsAvatarDataUri } from '../utils/notificationAvatar';

interface PostbitProps {
  post: Reply;
  topic: Topic;
  currentUser: Member | null;
  postNumber: number;
  totalPosts: number;
  isFirstPost: boolean;
  onQuote: (post: Reply) => void;
  onReply: (post?: Reply) => void;
  onEdit: (post: Reply) => void;
  onReport: (post: Reply) => void;
  canEdit: boolean;
  canModerate: boolean;
  alt?: boolean;
}

export const Postbit: React.FC<PostbitProps> = ({
  post,
  topic,
  currentUser,
  postNumber,
  totalPosts,
  isFirstPost,
  onQuote,
  onReply,
  onEdit,
  onReport,
  canEdit,
  canModerate,
  alt = false,
}) => {
  const authorInitials = post.authorInitials || post.authorName.slice(0, 2).toUpperCase();
  const authorColor = post.authorColor || '#a88bfa';
  const avatarUrl = post.authorAvatarUrl || createInitialsAvatarDataUri(authorInitials, authorColor);

  const isAuthor = currentUser?.name === post.authorName;

  return (
    <article className={cx('postbit', alt && 'alt')}>
      {/* User info column */}
      <aside className="postbit-user" aria-label={`Post by ${post.authorName}`}>
        {post.authorAvatarUrl ? (
          <img src={post.authorAvatarUrl} alt="" className="postbit-avatar" />
        ) : (
          <div className="postbit-avatar-placeholder" style={{ backgroundColor: authorColor, color: '#0f0c18' }}>
            {authorInitials}
          </div>
        )}
        <div className="postbit-name">{post.authorName}</div>
        <UserRank postsCount={0} role={post.authorRole} showPips={true} />

        {post.authorRole && post.authorRole !== 'Lid' && (
          <span className={cx(
            'px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider',
            post.authorRole === 'Beheerder' && 'bg-red-500/20 text-red-400 border border-red-500/30',
            post.authorRole === 'Moderator' && 'bg-violet-500/20 text-violet-400 border border-violet-500/30',
            post.authorRole === 'Supporter' && 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          )}>
            {post.authorRole}
          </span>
        )}

        <div className="postbit-stats">
          <div className="postbit-stat">
            <span className="postbit-stat-label">Geregistreerd</span>
            <span className="postbit-stat-value">{post.authorJoinedAt || 'Onbekend'}</span>
          </div>
          <div className="postbit-stat">
            <span className="postbit-stat-label">Berichten</span>
            <span className="postbit-stat-value">—</span>
          </div>
          <div className="postbit-stat">
            <span className="postbit-stat-label">Reputatie</span>
            <span className="postbit-stat-value">—</span>
          </div>
        </div>

        <div className="postbit-badges">
          {/* Badges would go here - keeping minimal for now */}
        </div>

        <div className="postbit-online-indicator" style={{ marginTop: '0.5rem' }}>
          <span className={cx(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
            post.isOnline
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-slate-500/20 text-slate-500'
          )}>
            <span className={cx('w-1.5 h-1.5 rounded-full', post.isOnline ? 'bg-emerald-400' : 'bg-slate-500')} />
            {post.isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </aside>

      {/* Content column */}
      <div className="postbit-content">
        <header className="postbit-header">
          <div>
            <h3 className="postbit-title">{isFirstPost ? topic.title : `Re: ${topic.title}`}</h3>
            <div className="postbit-meta">
              <span>#{postNumber} / {totalPosts}</span>
              <time dateTime={post.createdAt}>{formatRelative(post.createdAt)}</time>
            </div>
          </div>
        </header>

        <div className="postbit-body" dangerouslySetInnerHTML={{ __html: post.content }} />

        {post.codeSnippet && (
          <div className="mt-4">
            <pre className="bg-slate-900/50 dark:bg-slate-950 border border-slate-700 dark:border-slate-600 rounded-lg p-4 overflow-x-auto">
              <code className={`language-${post.codeSnippet.language} text-sm font-mono`}>
                {post.codeSnippet.code}
              </code>
            </pre>
          </div>
        )}

        {post.attachments && post.attachments.length > 0 && (
          <div className="mt-4 space-y-2">
            {post.attachments.map((att) => (
              <div key={att.id} className="flex items-center gap-3 p-3 bg-slate-800/50 dark:bg-slate-900/50 border border-slate-700 dark:border-slate-600 rounded-lg">
                <span className="text-slate-400">{att.kind === 'image' ? '🖼️' : '📎'}</span>
                <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm text-violet-400 hover:underline truncate">{att.name}</a>
                <span className="text-xs text-slate-500">{att.sizeLabel}</span>
              </div>
            ))}
          </div>
        )}

        {post.isBestAnswer && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-2 text-emerald-400">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            <span className="font-medium">Gemarkeerd als beste antwoord</span>
          </div>
        )}

        <footer className="postbit-actions">
          <button
            type="button"
            onClick={() => onQuote(post)}
            className="postbit-action-btn"
            aria-label="Citeer dit bericht"
          >
            <MessageSquare className="w-4 h-4" aria-hidden="true" />
            <span>Citeer</span>
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={() => onEdit(post)}
              className="postbit-action-btn"
              aria-label="Bewerk dit bericht"
            >
              <Edit2 className="w-4 h-4" aria-hidden="true" />
              <span>Bewerken</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onReply(post)}
            className="postbit-action-btn"
            aria-label="Antwoorden op dit bericht"
          >
            <ReplyIcon className="w-4 h-4" aria-hidden="true" />
            <span>Antwoorden</span>
          </button>

          {canModerate && (
            <button
              type="button"
              onClick={() => onReport(post)}
              className="postbit-action-btn text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
              aria-label="Rapporteer dit bericht"
            >
              <Flag className="w-4 h-4" aria-hidden="true" />
              <span>Rapporteren</span>
            </button>
          )}
        </footer>
      </div>
    </article>
  );
};