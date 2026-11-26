import React from 'react';
import { Home, ChevronRight } from 'lucide-react';
import { BreadcrumbItem } from '../types/forum';
import { cx } from '../components/admin/ui';

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className }) => {
  return (
    <nav className={cx('forum-breadcrumbs', className)} aria-label="Breadcrumb">
      <ol className="flex items-center flex-wrap gap-1.5 text-sm">
        <li className="flex items-center gap-1.5">
          <a
            href="/"
            className="flex items-center gap-1 text-slate-500 dark:text-[#8d87a4] hover:text-violet-500 dark:hover:text-[#a88bfa] transition-colors"
            aria-label="Home"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
          </a>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-[#6b6580] flex-shrink-0" aria-hidden="true" />
        </li>
        {items.map((item, index) => (
          <li key={item.path ?? index} className="flex items-center gap-1.5">
            {item.path ? (
              <a
                href={item.path}
                className="text-slate-500 dark:text-[#8d87a4] hover:text-violet-500 dark:hover:text-[#a88bfa] transition-colors"
              >
                {item.label}
              </a>
            ) : (
              <span className="font-medium text-slate-900 dark:text-white">{item.label}</span>
            )}
            {index < items.length - 1 && (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-[#6b6580] flex-shrink-0" aria-hidden="true" />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};