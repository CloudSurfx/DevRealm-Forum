import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  LoaderCircle,
  Menu,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { adminModules, MODULE_GROUPS } from "./admin/modules";
import { supabase } from "./admin/client";
import { Button, ToastProvider, cx, describeError, tone } from "./admin/ui";
import type { AdminModule, ModuleRole } from "../types/admin";

interface AdminDashboardProps {
  onClose: () => void;
}

type AccessState =
  | { status: "loading" }
  | { status: "no-session"; message: string }
  | { status: "denied"; reason: "no-role" | "member"; role?: string }
  | { status: "error"; message: string }
  | { status: "ready"; role: ModuleRole; userId: string; name: string };

const STORAGE_KEY = "forum.admin.module";

function readStoredModule(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function canSee(module: AdminModule, role: ModuleRole): boolean {
  return (module.minRole ?? "moderator") === "moderator" || role === "admin";
}

export default function AdminDashboard({ onClose }: AdminDashboardProps) {
  const [access, setAccess] = useState<AccessState>({ status: "loading" });
  const [activeId, setActiveId] = useState(() => readStoredModule() ?? "overview");
  const [focus, setFocus] = useState<string | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);
  const [navOpen, setNavOpen] = useState(false);

  const resolveAccess = useCallback(async () => {
    setAccess({ status: "loading" });
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        setAccess({
          status: "no-session",
          message: authError?.message ?? "Er is geen actieve sessie gevonden.",
        });
        return;
      }
      const user = authData.user;

      const [{ data: roleRow, error: roleError }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
      ]);

      if (roleError) {
        setAccess({ status: "error", message: describeError(roleError) });
        return;
      }
      if (!roleRow) {
        setAccess({ status: "denied", reason: "no-role" });
        return;
      }
      if (roleRow.role !== "admin" && roleRow.role !== "moderator") {
        setAccess({ status: "denied", reason: "member", role: roleRow.role });
        return;
      }

      setAccess({
        status: "ready",
        role: roleRow.role,
        userId: user.id,
        name: profile?.display_name ?? user.email ?? "Beheerder",
      });
    } catch (caught: unknown) {
      setAccess({ status: "error", message: describeError(caught) });
    }
  }, []);

  useEffect(() => {
    void resolveAccess();
  }, [resolveAccess]);

  // Esc sluit het dashboard, behalve als een venster binnen het dashboard hem al afhandelt.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const role = access.status === "ready" ? access.role : "moderator";
  const visibleModules = useMemo(() => adminModules.filter((m) => canSee(m, role)), [role]);
  const activeModule = visibleModules.find((m) => m.id === activeId) ?? visibleModules[0];

  const navigate = useCallback((moduleId: string, nextFocus?: string) => {
    setActiveId(moduleId);
    setFocus(nextFocus);
    setNavOpen(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, moduleId);
    } catch {
      /* niet erg */
    }
  }, []);

  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);

  const nav = (
    <nav aria-label="Dashboard modules" className="space-y-5">
      {MODULE_GROUPS.map((group) => {
        const items = visibleModules.filter((m) => m.group === group);
        if (items.length === 0) return null;
        return (
          <div key={group}>
            <p className={cx("px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em]", tone.faint)}>{group}</p>
            <ul className="space-y-0.5">
              {items.map((module) => {
                const Icon = module.icon;
                const isActive = module.id === activeModule?.id;
                const badge = module.badge ?? (module.hasNotifications ? 1 : null);
                return (
                  <li key={module.id}>
                    <button
                      type="button"
                      onClick={() => navigate(module.id)}
                      aria-current={isActive ? "page" : undefined}
                      className={cx(
                        "w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-left text-sm transition-colors cursor-pointer relative",
                        isActive
                          ? "bg-[#a88bfa]/12 text-violet-700 dark:text-white font-semibold"
                          : cx(tone.muted, "hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04] font-medium")
                      )}
                    >
                      <Icon className={cx("w-4 h-4 shrink-0", isActive && "text-[#a88bfa]")} />
                      <span className="truncate flex-1">{module.label}</span>
                      {module.minRole === "admin" && (
                        <span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-[#a88bfa]/80">admin</span>
                      )}
                      {badge !== null && badge !== undefined && badge > 0 && (
                        <span className="ml-auto w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {badge > 9 ? "9+" : badge}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  return (
    <ToastProvider>
      <div className="fixed inset-0 z-50 flex bg-slate-50 dark:bg-[#0b0a12] text-slate-900 dark:text-[#f5f3ff]">
        {/* Zijbalk (desktop) */}
        {access.status === "ready" && (
          <aside className={cx("hidden lg:flex w-64 shrink-0 flex-col border-r", tone.border, "bg-white dark:bg-[#100e18]")}>
            <div className="h-16 px-5 flex items-center gap-3 shrink-0">
              <span className="w-9 h-9 rounded-xl bg-[#a88bfa] text-[#0f0c18] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <p className="font-display font-extrabold leading-tight">Beheer</p>
                <p className={cx("text-[11px] truncate", tone.muted)}>Forum-dashboard</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">{nav}</div>
            <div className={cx("p-3 border-t", tone.border)}>
              <div className={cx("flex items-center gap-2.5 rounded-lg px-3 py-2", tone.sunken)}>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{access.name}</p>
                  <p className={cx("text-[11px]", tone.muted)}>{access.role === "admin" ? "Admin" : "Moderator"}</p>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Zijbalk (mobiel) */}
        {access.status === "ready" && navOpen && (
          <div className="lg:hidden fixed inset-0 z-[58] flex">
            <div className="absolute inset-0 bg-black/40" onClick={() => setNavOpen(false)} />
            <div className="relative w-72 max-w-[85vw] h-full bg-white dark:bg-[#100e18] p-3 overflow-y-auto">
              <div className="flex items-center justify-between px-2 py-2 mb-3">
                <span className="font-display font-extrabold">Beheer</span>
                <button
                  type="button"
                  aria-label="Menu sluiten"
                  onClick={() => setNavOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {nav}
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col">
          {/* Kopbalk */}
          <header className={cx("h-16 px-4 sm:px-6 border-b flex items-center gap-3 shrink-0 bg-white/80 dark:bg-[#0b0a12]/80 backdrop-blur", tone.border)}>
            {access.status === "ready" && (
              <button
                type="button"
                aria-label="Menu openen"
                onClick={() => setNavOpen(true)}
                className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer hover:bg-slate-100 dark:hover:bg-white/[0.06]"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="min-w-0 flex-1">
              {access.status === "ready" && activeModule ? (
                <p className={cx("text-sm truncate", tone.muted)}>
                  {activeModule.group} <span className="mx-1.5 opacity-50">/</span>
                  <span className={cx("font-semibold", tone.strong)}>{activeModule.label}</span>
                </p>
              ) : (
                <p className="font-display font-bold">Beheerdashboard</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {access.status === "ready" && (
                <Button icon={RefreshCw} onClick={refresh} title="Alles opnieuw laden">
                  <span className="hidden sm:inline">Vernieuwen</span>
                </Button>
              )}
              <Button icon={X} onClick={onClose} title="Dashboard sluiten (Esc)">
                <span className="hidden sm:inline">Sluiten</span>
              </Button>
            </div>
          </header>

          {/* Inhoud */}
          {access.status === "loading" && (
            <div className="flex-1 flex items-center justify-center p-6">
              <div role="status" className={cx("flex flex-col items-center gap-3 text-sm", tone.muted)}>
                <LoaderCircle className="w-8 h-8 animate-spin text-[#a88bfa]" />
                <span>Toegang controleren...</span>
              </div>
            </div>
          )}

          {access.status === "no-session" && (
            <CenteredState
              icon={<AlertTriangle className="w-7 h-7 text-amber-500" />}
              title="Inloggen vereist"
              message={
                <>
                  Je bent niet ingelogd of je sessie is verlopen. Log in om het beheerdashboard te openen.
                  <span className={cx("block mt-2 text-xs break-words", tone.faint)}>{access.message}</span>
                </>
              }
              onRetry={resolveAccess}
              onClose={onClose}
            />
          )}

          {access.status === "denied" && (
            <CenteredState
              icon={<ShieldAlert className="w-7 h-7 text-rose-500" />}
              title="Geen toegang"
              message={
                access.reason === "no-role" ? (
                  "Je account heeft nog geen rol. Vraag een beheerder om je toegang te geven."
                ) : (
                  <>
                    Je rol (<span className="font-semibold">{access.role ?? "lid"}</span>) heeft geen toegang tot het
                    beheerdashboard. Alleen moderators en admins kunnen deze pagina openen.
                  </>
                )
              }
              onRetry={resolveAccess}
              onClose={onClose}
            />
          )}

          {access.status === "error" && (
            <CenteredState
              icon={<AlertTriangle className="w-7 h-7 text-rose-500" />}
              title="Toegang kon niet worden gecontroleerd"
              message={
                <>
                  Er ging iets mis bij het ophalen van je rol. Controleer je verbinding en of de tabel{" "}
                  <code className="font-mono text-[#a88bfa]">user_roles</code> bestaat (draai anders{" "}
                  <code className="font-mono text-[#a88bfa]">supabase/setup_all.sql</code>).
                  <span className="block mt-2 text-xs text-rose-600/90 dark:text-rose-300/80 break-words">
                    {access.message}
                  </span>
                </>
              }
              onRetry={resolveAccess}
              onClose={onClose}
            />
          )}

          {access.status === "ready" && activeModule && (
            <main className="flex-1 min-h-0 overflow-y-auto">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
                <activeModule.Component
                  key={activeModule.id}
                  currentUserId={access.userId}
                  role={access.role}
                  refresh={refresh}
                  refreshKey={refreshKey}
                  navigate={navigate}
                  focus={focus}
                />
              </div>
            </main>
          )}
        </div>
      </div>
    </ToastProvider>
  );
}

function CenteredState({
  icon,
  title,
  message,
  onRetry,
  onClose,
}: {
  icon: React.ReactNode;
  title: string;
  message: React.ReactNode;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className={cx("w-full max-w-md rounded-2xl border p-6 text-center shadow-xl", tone.border, tone.surface)}>
        <div className={cx("w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4", tone.sunken)}>{icon}</div>
        <h2 className={cx("font-display font-bold text-lg", tone.strong)}>{title}</h2>
        <p className={cx("mt-2 text-sm leading-relaxed", tone.muted)}>{message}</p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Button onClick={() => void onRetry()}>Opnieuw proberen</Button>
          <Button variant="primary" onClick={onClose}>
            Terug
          </Button>
        </div>
      </div>
    </div>
  );
}
