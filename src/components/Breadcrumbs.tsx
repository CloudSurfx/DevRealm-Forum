import React from 'react';
import { Home, ChevronRight } from 'lucide-react';
import { BreadcrumbItem } from '../types/forum';

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className }) => {
  return (
    <nav className={`forum-breadcrumbs ${className || ''}`} aria-label="Breadcrumb">
      <ol className="flex items-center flex-wrap gap-1.5 text-sm">
        <li className="flex items-center gap-1.5">
          <a
            href="/"
            className="flex items-center gap-1 text-[var(--color-text-dim)] hover:text-[var(--forum-accent)] transition-colors"
            aria-label="Home"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
          </a>
          <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-dim)] flex-shrink-0" aria-hidden="true" />
        </li>
        {items.map((item, index) => (
          <li key={item.path ?? index} className="flex items-center gap-1.5">
            {item.path ? (
              <a
                href={item.path}
                className="text-[var(--color-text-dim)] hover:text-[var(--forum-accent)] transition-colors"
              >
                {item.label}
              </a>
            ) : (
              <span className="font-medium text-[var(--color-text)]">{item.label}</span>
            )}
            {index < items.length - 1 && (
              <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-dim)] flex-shrink-0" aria-hidden="true" />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};