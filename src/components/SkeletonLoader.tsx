import { cx, tone } from './admin/ui';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  count?: number;
  animation?: 'pulse' | 'wave';
}

export function Skeleton({
  className = '',
  variant = 'text',
  width = '100%',
  height,
  count = 1,
  animation = 'pulse',
}: SkeletonProps) {
  const baseStyles = cx(
    'overflow-hidden rounded',
    animation === 'pulse' ? 'animate-pulse' : 'animate-[shimmer_1.5s_infinite]',
    tone.sunken,
    className
  );

  const items = Array.from({ length: count }, (_, i) => (
    <div key={i} className={baseStyles} style={{ width, height: variant === 'text' ? '1rem' : height }}>
      {variant === 'circular' && <span className="sr-only">Loading avatar {i + 1}</span>}
      {variant === 'rectangular' && <span className="sr-only">Loading content {i + 1}</span>}
      {variant === 'card' && <span className="sr-only">Loading card {i + 1}</span>}
      {variant === 'text' && <span className="sr-only">Loading text line {i + 1}</span>}
    </div>
  ));

  return <>{items}</>;
}

export function TopicCardSkeleton() {
  return (
    <article className="bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.08] rounded-xl p-4">
      <Skeleton variant="text" width="60%" height="1.25rem" className="mb-2" />
      <Skeleton variant="text" width="100%" height="1rem" className="mb-1" />
      <Skeleton variant="text" width="100%" height="1rem" className="mb-1" />
      <Skeleton variant="text" width="40%" height="0.875rem" />
    </article>
  );
}

export function ProjectCardSkeleton() {
  return (
    <article className="bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
      <Skeleton variant="rectangular" width="100%" height="160px" className="aspect-video" />
      <div className="p-4 space-y-2">
        <Skeleton variant="text" width="70%" height="1.25rem" />
        <Skeleton variant="text" width="100%" height="1rem" />
        <Skeleton variant="text" width="50%" height="0.875rem" />
      </div>
    </article>
  );
}

export function ChatMessageSkeleton() {
  return (
    <div className="flex gap-3 pb-4">
      <Skeleton variant="circular" width="36px" height="36px" className="shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton variant="text" width="30%" height="0.875rem" />
        <Skeleton variant="text" width="80%" height="1rem" />
        <Skeleton variant="text" width="60%" height="1rem" />
      </div>
    </div>
  );
}

export function PollOptionSkeleton() {
  return (
    <div className="px-3.5 py-3 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-[#181524]">
      <Skeleton variant="text" width="60%" height="1rem" />
    </div>
  );
}

export function SidebarItemSkeleton() {
  return (
    <button type="button" className="w-full flex items-center gap-2.5 px-3 h-9 rounded-lg cursor-pointer" disabled>
      <Skeleton variant="circular" width="18px" height="18px" />
      <Skeleton variant="text" width="80px" height="1rem" />
    </button>
  );
}