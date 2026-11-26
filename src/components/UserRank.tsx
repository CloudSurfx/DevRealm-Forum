import React from 'react';
import { getUserRank, USER_RANKS } from '../data/forumData';
import { cx } from '../components/admin/ui';

interface UserRankProps {
  postsCount: number;
  role?: string; // 'Beheerder', 'Moderator', etc.
  className?: string;
  showPips?: boolean;
}

export const UserRank: React.FC<UserRankProps> = ({ postsCount, role, className, showPips = true }) => {
  // Special roles override post-based rank
  if (role === 'Beheerder') {
    return (
      <span className={cx('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold', 'bg-red-500/20 text-red-400 dark:text-red-300 border border-red-500/30', className)}>
        Administrator
      </span>
    );
  }
  if (role === 'Moderator') {
    return (
      <span className={cx('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold', 'bg-violet-500/20 text-violet-400 dark:text-violet-300 border border-violet-500/30', className)}>
        Moderator
      </span>
    );
  }

  const rank = getUserRank(postsCount);
  const rankIndex = USER_RANKS.findIndex(r => r.title === rank.title);

  // Calculate pips (1-5) based on rank progression
  const maxPips = 5;
  const pips = Math.min(maxPips, Math.max(1, Math.floor((rankIndex + 1) * maxPips / USER_RANKS.length)));

  return (
    <div className={cx('flex flex-col items-center gap-1', className)}>
      <span className={cx('px-2 py-0.5 rounded text-xs font-semibold border', `border-[${rank.color}] text-[${rank.color}] bg-[${rank.color}]/15`)}>{rank.title}</span>
      {showPips && (
        <div className="flex items-center gap-0.5" aria-label={`Rank: ${pips} of ${maxPips} pips`}>
          {Array.from({ length: maxPips }, (_, i) => (
            <span
              key={i}
              className={cx(
                'w-2 h-2 rounded-sm transition-colors',
                i < pips ? `bg-[${rank.color}]` : 'bg-slate-700 dark:bg-slate-600'
              )}
              aria-hidden="true"
            />
          ))}
        </div>
      )}
    </div>
  );
};

export function getRankTitle(postsCount: number, role?: string): string {
  if (role === 'Beheerder') return 'Administrator';
  if (role === 'Moderator') return 'Moderator';
  return getUserRank(postsCount).title;
}