import React, { useMemo } from 'react';
import { MessageSquare, FolderOpen, ArrowUpRight, Sparkles } from 'lucide-react';
import { Forum, Member, Topic } from '../types/forum';
import { FORUM_CATEGORIES } from '../data/forumData';
import { ForumSidebar } from './ForumSidebar';
import { Breadcrumbs } from './Breadcrumbs';
import { formatRelative } from '../components/admin/ui';

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
    <div className="forum-page">
      <Breadcrumbs items={breadcrumbs} />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <section className="forum-index-hero">
          <div className="forum-index-hero__copy">
            <span className="forum-index-eyebrow"><Sparkles size={14} /> HET GESPREK BEGINT HIER</span>
            <h1>Ideeën worden<br /><em>verder gebracht.</em></h1>
            <p>Een community voor nieuwsgierige mensen. Stel je vraag, deel wat je maakt en help elkaar vooruit.</p>
            <a className="forum-hero-button" href="#forum-categorieen">Ontdek de forums <ArrowUpRight size={16} /></a>
          </div>
          <div className="forum-hero-aside">
            <span className="forum-hero-index">01 <span /> COMMUNITY INDEX</span>
            <div className="forum-live-note"><span className="forum-live-dot" /> De community is actief</div>
            <p>Goede gesprekken<br />beginnen met één vraag.</p>
            <span className="forum-hero-mark" aria-hidden="true">↗</span>
          </div>
        </section>
        <div className="forum-index-section-label" id="forum-categorieen"><span>01 / VERKEN</span><span>Vind jouw gesprek</span></div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main forum list */}
          <div className="lg:col-span-3 space-y-6">
            {forumsWithStats.map((category) => (
              <section key={category.id} className="forum-category-section space-y-3">
                {/* Category header */}
                <div className="forum-category-header flex items-center gap-3">
                  <span className="forum-category-icon"><FolderOpen className="w-4 h-4" aria-hidden="true" /></span>
                  <span>{category.name}</span>
                  <span className="forum-category-count">{category.forums.length} forums</span>
                </div>

                {/* Forum table */}
                <table className="forum-table forum-index-table" role="grid">
                  <thead>
                    <tr>
                      <th className="col-thread" scope="col">Forum</th>
                      <th className="col-replies" scope="col">Topics</th>
                      <th className="col-views" scope="col">Berichten</th>
                      <th className="col-lastpost" scope="col">Laatste bericht</th>
                    </tr>
                  </thead>
                  <tbody>
                    {category.forums.map((forum) => (
                      <tr key={forum.id} onClick={() => onNavigateToForum(forum.id)} style={{ cursor: 'pointer' }}>
                        <td className="col-thread">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-slate-800/50 dark:bg-slate-900/50 border border-slate-700 dark:border-slate-600">
                                <MessageSquare className="w-5 h-5" aria-hidden="true" />
                            </div>
                            <div>
                              <a
                                href={`/forum/f/${forum.id}`}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onNavigateToForum(forum.id); }}
                                className="thread-title block"
                              >
                                {forum.name}
                              </a>
                              <p className="thread-meta">{forum.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="col-replies text-center font-mono tabular-nums">
                          {forum.topicCount.toLocaleString()}
                        </td>
                        <td className="col-views text-center font-mono tabular-nums">
                          {forum.postCount.toLocaleString()}
                        </td>
                        <td className="col-lastpost">
                          {forum.lastPost ? (() => {
                            const lastPost = forum.lastPost!;
                            return (
                              <div className="lastpost-info">
                              <a
                                href={`/forum/t/${lastPost.topicId}`}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onNavigateToTopic(lastPost.topicId); }}
                                className="font-medium"
                              >
                                  {lastPost.topicTitle.length > 50
                                  ? lastPost.topicTitle.slice(0, 50) + '...'
                                  : lastPost.topicTitle}
                              </a>
                              <span className="lastpost-time">
                                door <a href="#" className="font-medium">{lastPost.authorName}</a>
                                <br />
                                {formatRelative(lastPost.timestamp)}
                              </span>
                                <ArrowUpRight className="forum-lastpost-arrow" size={15} aria-hidden="true" />
                              </div>
                            );
                          })() : (
                            <span className="text-slate-500 dark:text-slate-400 text-sm">Geen berichten</span>
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
