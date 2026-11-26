import React from 'react';
import {
  Clock,
  FileText,
  Home,
  Layers,
  Megaphone,
  MessageSquareText,
  Package,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { Member, NavTab } from '../types/forum';

const DUTCH_MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mrt: 2,
  apr: 3,
  mei: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  okt: 9,
  nov: 10,
  dec: 11,
};

function getMemberTenure(joinedAt: string): {
  durationLabel: string;
  tierLabel: string;
  progressPercent: number;
  tooltip: string;
} {
  const lower = joinedAt.trim().toLowerCase();
  if (lower === 'vandaag' || lower === 'zojuist') {
    return {
      durationLabel: 'Vandaag gestart',
      tierLabel: 'Nieuw lid',
      progressPercent: 15,
      tooltip: 'Actief sinds vandaag',
    };
  }

  const match = lower.match(/^([a-z]{3})\s+(\d{4})$/);
  if (match && DUTCH_MONTHS[match[1]] !== undefined) {
    const startYear = Number(match[2]);
    const startMonth = DUTCH_MONTHS[match[1]];
    const now = new Date();
    const totalMonths = Math.max(
      1,
      (now.getFullYear() - startYear) * 12 + (now.getMonth() - startMonth)
    );

    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    const durationLabel =
      years > 0
        ? months > 0
          ? `${years} jr ${months} mnd actief`
          : `${years} jaar actief`
        : `${totalMonths} mnd actief`;

    const tierLabel =
      totalMonths >= 18 ? 'Veteraan' : totalMonths >= 6 ? 'Vaste kracht' : 'Actief lid';
    const progressPercent = Math.min(100, Math.max(18, Math.round((totalMonths / 24) * 100)));

    return {
      durationLabel,
      tierLabel,
      progressPercent,
      tooltip: `Lid sinds ${joinedAt} (${durationLabel})`,
    };
  }

  return {
    durationLabel: `Sinds ${joinedAt}`,
    tierLabel: 'Communitylid',
    progressPercent: 40,
    tooltip: `Lid sinds ${joinedAt}`,
  };
}

interface SidebarNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  expanded: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  currentUser: Member | null;
  topicsCount: number;
  newsCount: number;
  galleryCount: number;
  canAdmin?: boolean;
  onOpenAdmin?: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTab,
  onSelectTab,
  expanded,
  mobileOpen,
  onCloseMobile,
  currentUser,
  topicsCount,
  newsCount,
  galleryCount,
  canAdmin = false,
  onOpenAdmin,
}) => {
  const navItems: {
    id: NavTab;
    label: string;
    pathHint: string;
    icon: React.FC<{ className?: string }>;
    count?: number;
  }[] = [
    { id: 'landing', label: 'Startpagina', pathHint: '/', icon: Home },
    { id: 'forum', label: 'Forum', pathHint: '/forum', icon: MessageSquareText, count: topicsCount },
    { id: 'releases', label: 'Releases', pathHint: '/releases', icon: Package },
    { id: 'news', label: 'Nieuws', pathHint: '/nieuws', icon: Megaphone, count: newsCount },
    { id: 'gallery', label: 'Project-galerij', pathHint: '/galerij', icon: Layers, count: galleryCount },
    { id: 'docs', label: 'Regels & Gids', pathHint: '/regels', icon: FileText },
  ];

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Hoofdnavigatie"
        className={`fixed left-0 top-0 bottom-0 z-50 flex flex-col justify-between bg-slate-50 dark:bg-[#100e18] border-r border-slate-200 dark:border-white/[0.07] transition-all duration-200 ease-out ${
          expanded ? 'md:w-[224px]' : 'md:w-[68px]'
        } ${
          mobileOpen ? 'translate-x-0 w-[236px]' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col">
          <div
            className={`h-16 flex items-center border-b border-slate-200 dark:border-white/[0.07] ${
              expanded || mobileOpen ? 'justify-between px-3.5' : 'justify-center px-2'
            }`}
          >
            <button
              type="button"
              onClick={() => handleNavClick('forum')}
              className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a88bfa] rounded-xl cursor-pointer"
              title="Naar /forum"
            >
              <span className="w-9 h-9 rounded-xl bg-[#a88bfa] text-[#0f0c18] font-display font-extrabold text-base flex items-center justify-center shrink-0 shadow-sm shadow-[#a88bfa]/20 transition-transform duration-150 group-hover:scale-[1.03]">
                F
              </span>
              {(expanded || mobileOpen) && (
                <span className="font-display font-bold text-base text-slate-900 dark:text-white whitespace-nowrap">
                  Forum
                </span>
              )}
            </button>

            {mobileOpen && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                aria-label="Sluit menu"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <nav className="flex flex-col gap-1.5 p-2.5 mt-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  title={!expanded ? `${item.label} (${item.pathHint})` : undefined}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center rounded-xl transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a88bfa] ${
                    expanded || mobileOpen
                      ? 'justify-between px-3 py-2.5'
                      : 'justify-center w-11 h-11 mx-auto'
                  } ${
                    isActive
                      ? 'bg-[#a88bfa]/15 text-violet-700 dark:bg-[#1e1a2e] dark:text-white border border-violet-300/60 dark:border-white/[0.08]'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 dark:text-[#7e7894] dark:hover:text-slate-100 dark:hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-[18px] h-[18px] shrink-0 ${
                        isActive ? 'text-violet-600 dark:text-[#a88bfa]' : ''
                      }`}
                    />
                    {(expanded || mobileOpen) && (
                      <span className="text-sm font-medium whitespace-nowrap truncate">
                        {item.label}
                      </span>
                    )}
                  </span>

                  {(expanded || mobileOpen) && item.count !== undefined && (
                    <span className="text-xs font-mono tabular-nums text-slate-400 dark:text-[#6e6885] ml-2">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}

            {canAdmin && onOpenAdmin && (
              <button
                type="button"
                onClick={() => {
                  onOpenAdmin();
                  onCloseMobile();
                }}
                title={!expanded ? 'Beheerdashboard' : undefined}
                className={`flex items-center rounded-xl transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a88bfa] ${
                  expanded || mobileOpen
                    ? 'justify-between px-3 py-2.5'
                    : 'justify-center w-11 h-11 mx-auto'
                } text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 dark:text-[#7e7894] dark:hover:text-slate-100 dark:hover:bg-white/[0.04] border border-transparent`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <ShieldCheck className="w-[18px] h-[18px] shrink-0" />
                  {(expanded || mobileOpen) && (
                    <span className="text-sm font-medium whitespace-nowrap truncate">
                      Beheer
                    </span>
                  )}
                </span>
              </button>
            )}
          </nav>
        </div>

        <div className="p-2.5 border-t border-slate-200 dark:border-white/[0.06]">
          {(() => {
            const tenure = currentUser ? getMemberTenure(currentUser.joinedAt) : null;
            return (
              <button
                type="button"
                onClick={() => handleNavClick('profile')}
                title={
                  !expanded
                    ? currentUser && tenure
                      ? `${currentUser.name} · ${tenure.tooltip} · ${currentUser.reputation} rep`
                      : 'Account & Profiel'
                    : tenure?.tooltip
                }
                aria-current={activeTab === 'profile' ? 'page' : undefined}
                className={`w-full flex items-center rounded-xl transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a88bfa] ${
                  expanded || mobileOpen
                    ? 'gap-3 px-3 py-2.5'
                    : 'flex-col justify-center w-11 py-1.5 mx-auto gap-1'
                } ${
                  activeTab === 'profile'
                    ? 'bg-[#a88bfa]/15 text-violet-700 dark:bg-[#1e1a2e] dark:text-white border border-violet-300/60 dark:border-white/[0.08]'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 dark:text-[#7e7894] dark:hover:text-slate-100 dark:hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                {currentUser ? (
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-[#0f0c18] shrink-0"
                    style={{ backgroundColor: currentUser.avatarColor }}
                  >
                    {currentUser.initials}
                  </span>
                ) : (
                  <User className="w-[18px] h-[18px] shrink-0" />
                )}

                {!expanded && !mobileOpen && currentUser && tenure && (
                  <span
                    aria-hidden="true"
                    className="w-7 h-1 rounded-full bg-slate-200 dark:bg-white/[0.1] overflow-hidden"
                  >
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-[#a88bfa] to-[#e8b353]"
                      style={{ width: `${tenure.progressPercent}%` }}
                    />
                  </span>
                )}

                {(expanded || mobileOpen) && (
                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <span className="text-sm font-medium truncate max-w-[144px]">
                      {currentUser ? currentUser.name : 'Profiel'}
                    </span>

                    {currentUser && tenure ? (
                      <div className="w-full mt-1 space-y-1">
                        <div className="flex items-center justify-between gap-1.5 text-[11px] text-slate-500 dark:text-[#8d87a4]">
                          <span className="inline-flex items-center gap-1 truncate">
                            <Clock className="w-3 h-3 text-[#a88bfa] shrink-0" />
                            <span className="truncate tabular-nums">{tenure.durationLabel}</span>
                          </span>
                          <span className="text-[10px] font-mono text-[#d99b26] dark:text-[#e8b353] shrink-0">
                            {tenure.tierLabel}
                          </span>
                        </div>
                        <div
                          className="h-1 w-full rounded-full bg-slate-200 dark:bg-white/[0.08] overflow-hidden"
                          aria-label={`Community-ervaring: ${tenure.durationLabel}`}
                        >
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#a88bfa] to-[#e8b353] transition-all duration-300"
                            style={{ width: `${tenure.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-[#716b88] truncate max-w-[144px]">
                        Gastweergave
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })()}
        </div>
      </aside>
    </>
  );
};
