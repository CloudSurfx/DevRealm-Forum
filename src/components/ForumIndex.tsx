import React, { useMemo } from 'react';
import { MessageSquare, FolderOpen, ArrowUpRight, Sparkles } from 'lucide-react';
import { Forum, Member, Topic } from '../types/forum';
import { FORUM_CATEGORIES } from '../data/forumData';
import { ForumSidebar } from './ForumSidebar';
import { Breadcrumbs } from './Breadcrumbs';
import { formatRelative } from './admin/ui';

interface ForumIndexProps {
  topics: Topic[];
  members: Member[];
  onNavigateToForum: (forumId: string) => void;
  onNavigateToTopic: (topicId: string) => void;
}

export const ForumIndex: React.FC<ForumIndexProps> = ({
  topics,
  members,
  onNavigateToForum,
  onNavigateToTopic,
}) => {
  // Compute stats per forum from topics
  const forumsWithStats = useMemo(() => {
    return FORUM_CATEGORIES.map(category => ({
      ...category,
      forums: category.forums.map(forum => {
        const forumTopics = topics.filter(t => t.category === forum.id);
        const forumPosts = forumTopics.reduce((sum, t) => sum + t.replies.length + 1, 0);

        // Find last post
        let lastPost: Forum['lastPost'];
        const sortedTopics = [...forumTopics].sort((a, b) => {
          const timeA = new Date(a.lastActivity).getTime();
          const timeB = new Date(b.lastActivity).getTime();
          return timeB - timeA;
        });

        if (sortedTopics.length > 0) {
          const latestTopic = sortedTopics[0];
          const latestReply = latestTopic.replies[latestTopic.replies.length - 1];
          lastPost = {
            topicId: latestTopic.id,
            topicTitle: latestTopic.title,
            authorName: latestReply?.authorName || latestTopic.authorName,
            authorId: latestReply?.authorId || 'unknown',
            timestamp: latestReply?.createdAt || latestTopic.lastActivity,
          };
        }

        return {
          ...forum,
          topicCount: forumTopics.length,
          postCount: forumPosts,
          lastPost,
        };
      }),
    }));
  }, [topics]);

  // Overall stats
  const totalMembers = members.length;
  const totalTopics = topics.length;
  const totalPosts = topics.reduce((sum, t) => sum + t.replies.length + 1, 0);

  // Newest member
  const newestMember = [...members].sort((a, b) =>
    new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
  )[0];

  // Latest posts for sidebar
  const latestPosts = useMemo(() => {
    const allPosts: Array<{ topicId: string; topicTitle: string; authorName: string; authorColor: string; timestamp: string; forumName: string }> = [];

    topics.forEach(topic => {
      const forum = FORUM_CATEGORIES.flatMap(c => c.forums).find(f => f.id === topic.category);
      topic.replies.forEach(reply => {
        allPosts.push({
          topicId: topic.id,
          topicTitle: topic.title,
          authorName: reply.authorName,
          authorColor: reply.authorColor,
          timestamp: reply.createdAt,
          forumName: forum?.name || 'Onbekend',
        });
      });
      // Also include topic starter as a "post"
      allPosts.push({
        topicId: topic.id,
        topicTitle: topic.title,
        authorName: topic.authorName,
        authorColor: topic.authorColor,
        timestamp: topic.lastActivity,
        forumName: forum?.name || 'Onbekend',
      });
    });

    return allPosts
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  }, [topics]);

  // Top posters
  const topPosters = useMemo(() => {
    const posterMap = new Map<string, { name: string; postsCount: number; avatarColor: string; initials: string }>();

    topics.forEach(topic => {
      // Topic starter
      const starter = posterMap.get(topic.authorName) || {
        name: topic.authorName,
        postsCount: 0,
        avatarColor: topic.authorColor,
        initials: topic.authorInitials
      };
      starter.postsCount += 1;
      posterMap.set(topic.authorName, starter);

      // Replies
      topic.replies.forEach(reply => {
        const replier = posterMap.get(reply.authorName) || {
          name: reply.authorName,
          postsCount: 0,
          avatarColor: reply.authorColor,
          initials: reply.authorInitials
        };
        replier.postsCount += 1;
        posterMap.set(reply.authorName, replier);
      });
    });

    return Array.from(posterMap.values())
      .sort((a, b) => b.postsCount - a.postsCount)
      .slice(0, 10);
  }, [topics]);

  const breadcrumbs: { label: string; path?: string }[] = [
    { label: 'Forum', path: '/forum' },
    { label: 'Index' },
  ];

  return (
    <div className="forum-page page-enter">
      <Breadcrumbs items={breadcrumbs} />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <section className="forum-index-hero surface mb-6 overflow-hidden">
          <div className="p-6 lg:p-8 lg:grid lg:grid-cols-[1fr_280px] lg:gap-8 items-center">
            <div className="forum-index-hero__copy">
              <span className="forum-index-eyebrow inline-flex items-center gap-2">
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                <span>HET GESPREK BEGINT HIER</span>
              </span>
              <h1 className="font-display font-extrabold text-3xl lg:text-4xl text-[var(--color-text)] leading-tight mt-3 mb-4">
                Ideeën worden<br /><em className="text-[var(--forum-accent)] not-italic">verder gebracht.</em>
              </h1>
              <p className="text-[var(--color-text-muted)] max-w-xl mb-6">
                Een community voor nieuwsgierige mensen. Stel je vraag, deel wat je maakt en help elkaar vooruit.
              </p>
              <a
                className="btn btn-primary"
                href="#forum-categorieen"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('forum-categorieen')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Ontdek de forums <ArrowUpRight size={16} />
              </a>
            </div>
            <div className="forum-hero-aside hidden lg:block border-l border-[var(--forum-border)] pl-6 lg:pl-8 mt-6 lg:mt-0">
              <span className="forum-hero-index font-mono text-xs text-[var(--color-text-dim)] tracking-widest uppercase flex items-center gap-2">
                <span className="w-4 h-px bg-[var(--forum-accent-2)]"></span>
                01 <span aria-hidden="true">/</span> COMMUNITY INDEX
              </span>
              <div className="forum-live-note flex items-center gap-2 mt-3 text-sm text-[var(--color-text-muted)]">
                <span className="forum-live-dot w-2 h-2 rounded-full bg-[var(--color-success)] shadow-[0_0_0_3px_var(--color-success)/20]" aria-hidden="true" />
                De community is actief
              </div>
              <p className="font-display font-bold text-[var(--color-text)] text-lg leading-tight mt-3">
                Goede gesprekken<br />beginnen met één vraag.
              </p>
              <span className="forum-hero-mark absolute right-4 bottom-0 text-5xl text-[var(--forum-border)]" aria-hidden="true">↗</span>
            </div>
          </div>
        </section>

        <div className="forum-index-section-label flex items-baseline justify-between mb-4" id="forum-categorieen">
          <span className="font-mono text-xs text-[var(--color-text-dim)] tracking-widest uppercase">01 / VERKEN</span>
          <span className="font-display font-bold text-[var(--color-text)]">Vind jouw gesprek</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main forum list */}
          <div className="lg:col-span-3 space-y-6">
            {forumsWithStats.map((category) => (
              <section key={category.id} className="surface overflow-hidden">
                {/* Category header */}
                <div className="px-4 py-3 bg-[var(--forum-bg-elevated)] border-b border-[var(--forum-border)] flex items-center gap-3">
                  <span className="text-[var(--forum-accent)]"><FolderOpen className="w-4 h-4" aria-hidden="true" /></span>
                  <span className="font-semibold text-[var(--color-text)]">{category.name}</span>
                  <span className="ml-auto font-mono text-xs text-[var(--color-text-dim)]">{category.forums.length} forums</span>
                </div>

                {/* Forum table */}
                <table className="w-full" role="grid">
                  <thead>
                    <tr className="border-b border-[var(--forum-border)]">
                      <th className="px-4 py-3 text-left font-mono text-xs uppercase tracking-wider text-[var(--color-text-dim)]">Forum</th>
                      <th className="px-4 py-3 text-center font-mono text-xs uppercase tracking-wider text-[var(--color-text-dim)] w-24">Topics</th>
                      <th className="px-4 py-3 text-center font-mono text-xs uppercase tracking-wider text-[var(--color-text-dim)] w-24">Berichten</th>
                      <th className="px-4 py-3 text-left font-mono text-xs uppercase tracking-wider text-[var(--color-text-dim)] w-64">Laatste bericht</th>
                    </tr>
                  </thead>
                  <tbody>
                    {category.forums.map((forum) => (
                      <tr
                        key={forum.id}
                        onClick={() => onNavigateToForum(forum.id)}
                        className="border-t border-[var(--forum-border)] hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--forum-bg-elevated)] border border-[var(--forum-border)]">
                              <MessageSquare className="w-5 h-5 text-[var(--color-text-dim)]" aria-hidden="true" />
                            </div>
                            <div>
                              <a
                                href={`/forum/f/${forum.id}`}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onNavigateToForum(forum.id); }}
                                className="thread-title block font-medium text-[var(--color-text)] hover:text-[var(--forum-accent)] transition-colors"
                              >
                                {forum.name}
                              </a>
                              <p className="thread-meta text-sm text-[var(--color-text-dim)] mt-1">{forum.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center font-mono tabular-nums text-[var(--color-text)]">{forum.topicCount.toLocaleString()}</td>
                        <td className="px-4 py-4 text-center font-mono tabular-nums text-[var(--color-text)]">{forum.postCount.toLocaleString()}</td>
                        <td className="px-4 py-4">
                          {forum.lastPost ? (() => {
                            const lastPost = forum.lastPost!;
                            return (
                              <div className="lastpost-info">
                                <a
                                  href={`/forum/t/${lastPost.topicId}`}
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onNavigateToTopic(lastPost.topicId); }}
                                  className="font-medium text-[var(--color-text)] hover:text-[var(--forum-accent)] transition-colors block truncate"
                                >
                                  {lastPost.topicTitle.length > 50
                                    ? lastPost.topicTitle.slice(0, 50) + '...'
                                    : lastPost.topicTitle}
                                </a>
                                <span className="text-sm text-[var(--color-text-dim)] block mt-1">
                                  door <a href="#" className="font-medium text-[var(--color-text)] hover:text-[var(--forum-accent)]">{lastPost.authorName}</a>
                                  <br />
                                  {formatRelative(lastPost.timestamp)}
                                </span>
                                <ArrowUpRight className="forum-lastpost-arrow w-4 h-4 text-[var(--color-text-dim)] inline-block mt-1" aria-hidden="true" />
                              </div>
                            );
                          })() : (
                            <span className="text-sm text-[var(--color-text-dim)]">Geen berichten</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <ForumSidebar
              onlineMembers={members}
              totalMembers={totalMembers}
              totalTopics={totalTopics}
              totalPosts={totalPosts}
              newestMember={newestMember}
              latestPosts={latestPosts}
              topPosters={topPosters}
              onNavigateToTopic={onNavigateToTopic}
            />
          </div>
        </div>
      </main>
    </div>
  );
};