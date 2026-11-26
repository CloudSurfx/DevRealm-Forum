import React, { useState } from 'react';
import { Code2, Eye, Heart, Layers, Play, Plus, X } from 'lucide-react';
import { CodeLanguage, GalleryProject, Member, PreviewPresetId } from '../types/forum';
import { CodeBlock } from './CodeBlock';
import { UserBadges } from './UserBadges';

/**
 * Interactive Live Preview Renderer — renders real live mini-apps
 * inside a clean browser frame (zero broken external iframes).
 */
export const LiveProjectPreviewFrame: React.FC<{
  project: GalleryProject;
  interactive?: boolean;
}> = ({ project, interactive = true }) => {
  const [bridgeCount, setBridgeCount] = useState(3);
  const [bridgeTheme, setBridgeTheme] = useState<'violet' | 'gold'>('violet');
  const [cardOnline, setCardOnline] = useState(true);
  const [chatPing, setChatPing] = useState(14);

  if (project.previewPreset === 'state-bridge') {
    return (
      <div className="h-full w-full bg-[#0d0b14] p-4 flex flex-col justify-between text-white">
        <div className="flex items-center justify-between text-[11px] text-[#8e8e93]">
          <span className="font-mono">nanostores · react ↔ vue</span>
          <span className="text-emerald-400 font-medium">Gesynchroniseerd</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 my-2">
          <div className="p-2.5 rounded-xl bg-[#141518] border border-white/[0.08]">
            <div className="text-[10px] text-[#a88bfa] font-semibold">React Shell</div>
            <div className="font-mono text-lg font-bold tabular-nums mt-0.5">{bridgeCount}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#141518] border border-white/[0.08]">
            <div className="text-[10px] text-emerald-400 font-semibold">Vue Widget</div>
            <div className="font-mono text-lg font-bold tabular-nums mt-0.5">{bridgeCount}</div>
          </div>
        </div>

        {interactive && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBridgeCount((c) => c + 1)}
              className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#a88bfa] hover:bg-[#b79dff] text-[#0c0d10] text-xs font-semibold cursor-pointer transition-colors"
            >
              +1 Sync event
            </button>
            <button
              type="button"
              onClick={() => setBridgeCount(0)}
              className="py-1.5 px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs text-slate-300 cursor-pointer"
            >
              Reset
            </button>
          </div>
        )}
      </div>
    );
  }

  if (project.previewPreset === 'theme-card') {
    const accent = bridgeTheme === 'violet' ? '#a88bfa' : '#e8b353';
    return (
      <div
        className="h-full w-full bg-[#0d0b14] p-4 flex flex-col justify-between text-white"
        style={{
          backgroundImage: `radial-gradient(circle at 85% 85%, ${accent}33, transparent 62%)`,
        }}
      >
        <div>
          <div className="text-xs font-semibold" style={{ color: accent }}>
            Tailwind v4 Theme Card
          </div>
          <p className="text-xs text-[#9c9c9d] mt-1">
            Subtiele radiale gloed met hoog contrast op #0d0b14.
          </p>
        </div>

        {interactive && (
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={() => setBridgeTheme('violet')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                bridgeTheme === 'violet'
                  ? 'bg-[#a88bfa] text-[#0c0d10]'
                  : 'bg-white/[0.06] text-slate-300'
              }`}
            >
              Violet
            </button>
            <button
              type="button"
              onClick={() => setBridgeTheme('gold')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                bridgeTheme === 'gold'
                  ? 'bg-[#e8b353] text-[#141008]'
                  : 'bg-white/[0.06] text-slate-300'
              }`}
            >
              Goud
            </button>
          </div>
        )}
      </div>
    );
  }

  if (project.previewPreset === 'chat-pulse') {
    return (
      <div className="h-full w-full bg-[#0d0b14] p-4 flex flex-col justify-between text-white">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">WebSocket Heartbeat</span>
          <span
            className={`text-[11px] font-medium ${
              cardOnline ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {cardOnline ? 'Verbonden' : 'Herverbinden...'}
          </span>
        </div>

        <div className="my-2 p-2.5 rounded-xl bg-[#141518] border border-white/[0.08] flex items-center justify-between">
          <span className="text-xs text-[#9c9c9d]">Actieve lezers</span>
          <span className="font-mono font-bold text-sm tabular-nums">{chatPing}</span>
        </div>

        {interactive && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCardOnline((v) => !v)}
              className="flex-1 py-1.5 px-2.5 rounded-lg bg-white/[0.07] hover:bg-white/[0.12] text-xs font-medium cursor-pointer"
            >
              Simuleer netwerk-switch
            </button>
            <button
              type="button"
              onClick={() => setChatPing((p) => p + 1)}
              className="py-1.5 px-2.5 rounded-lg bg-[#a88bfa] text-[#0c0d10] text-xs font-semibold cursor-pointer"
            >
              +1
            </button>
          </div>
        )}
      </div>
    );
  }

  // Custom HTML / Live preview snippet
  return (
    <div className="h-full w-full bg-[#0d0b14] p-4 flex flex-col justify-between text-white">
      <div className="text-[11px] text-[#a88bfa] font-mono">Live Component Embed</div>
      <div className="p-3 rounded-xl bg-[#141518] border border-white/[0.08] text-xs text-slate-200 leading-relaxed">
        {project.customMarkup || project.description}
      </div>
      <div className="text-[11px] text-[#7a7a7e]">{project.stack}</div>
    </div>
  );
};

export const ProjectGalleryView: React.FC<{
  projects: GalleryProject[];
  onlineMembers?: Member[];
  onToggleLike: (id: string) => void;
  onSelectProject: (project: GalleryProject) => void;
  onOpenSubmit: () => void;
}> = ({ projects, onlineMembers = [], onToggleLike, onSelectProject, onOpenSubmit }) => {
  const [viewModeById, setViewModeById] = useState<Record<string, 'preview' | 'code'>>({});

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-[#13111c] forum-hero-glow border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#a88bfa]" />
            <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-white">
              Project-galerij & Live Previews
            </h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-[#9c9c9d] mt-1.5">
            Test interactieve React- en Vue-componenten van leden direct live in je browser of
            bekijk de code.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenSubmit}
          className="px-4 py-2.5 rounded-xl bg-[#e8b353] hover:bg-[#f0be63] text-[#141008] text-sm font-bold inline-flex items-center gap-2 cursor-pointer shrink-0 self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Project delen</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {projects.map((project) => {
          const mode = viewModeById[project.id] ?? 'preview';
          return (
            <article
              key={project.id}
              className="bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.08] rounded-2xl overflow-hidden flex flex-col"
            >
              {/* Browser Frame Header */}
              <div className="px-4 py-2.5 bg-slate-100 dark:bg-[#181524] border-b border-slate-200 dark:border-white/[0.07] flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-white/15" />
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-white/15" />
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-white/15" />
                  <span className="text-[11px] font-mono text-slate-500 dark:text-[#7a7a7e] ml-2 truncate max-w-[140px]">
                    preview://{project.id}
                  </span>
                </div>

                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/80 dark:bg-[#0e0f12]">
                  <button
                    type="button"
                    onClick={() =>
                      setViewModeById((prev) => ({ ...prev, [project.id]: 'preview' }))
                    }
                    className={`px-2 py-1 rounded-md text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer ${
                      mode === 'preview'
                        ? 'bg-white dark:bg-[#26272b] text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-[#8b8b90]'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>Live</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewModeById((prev) => ({ ...prev, [project.id]: 'code' }))}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer ${
                      mode === 'code'
                        ? 'bg-white dark:bg-[#26272b] text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-[#8b8b90]'
                    }`}
                  >
                    <Code2 className="w-3 h-3" />
                    <span>Code</span>
                  </button>
                </div>
              </div>

              {/* Interactive Live Embed OR Code Snippet */}
              <div className="h-[190px] border-b border-slate-200 dark:border-white/[0.07] overflow-hidden">
                {mode === 'preview' ? (
                  <LiveProjectPreviewFrame project={project} />
                ) : (
                  <div className="h-full overflow-y-auto bg-[#0e0c16]">
                    <CodeBlock snippet={project.codeSnippet} compact />
                  </div>
                )}
              </div>

              {/* Project Details */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <button
                    type="button"
                    onClick={() => onSelectProject(project)}
                    className="text-left group cursor-pointer"
                  >
                    <h2 className="font-display font-bold text-base text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-[#a88bfa] transition-colors">
                      {project.title}
                    </h2>
                  </button>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-[#98989c] mt-1 line-clamp-2 leading-relaxed">
                    {project.description}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-200/80 dark:border-white/[0.06] text-xs">
                  <div className="flex items-center flex-wrap gap-1.5 text-slate-500 dark:text-[#8b8b90] min-w-0">
                    <span
                      className="w-5 h-5 rounded-md inline-flex items-center justify-center text-[10px] font-bold text-[#0c0d10] shrink-0"
                      style={{ backgroundColor: project.authorColor }}
                    >
                      {project.authorInitials}
                    </span>
                    <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                      {project.authorName}
                    </span>
                    <UserBadges
                      authorName={project.authorName}
                      onlineMembers={onlineMembers}
                      maxVisible={1}
                      showOverflowCount={false}
                    />
                    <span aria-hidden="true">·</span>
                    <span className="truncate text-violet-600 dark:text-[#a88bfa]">
                      {project.stack}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onSelectProject(project)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#1b1828] hover:bg-slate-200 dark:hover:bg-[#242035] text-slate-700 dark:text-slate-200 font-medium cursor-pointer"
                    >
                      <Play className="w-3 h-3" />
                      <span>Open</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleLike(project.id)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer transition-colors ${
                        project.likedByMe
                          ? 'bg-[#a88bfa]/20 text-violet-700 dark:text-[#c7b5ff]'
                          : 'text-slate-500 dark:text-[#8b8b90] hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${project.likedByMe ? 'fill-current' : ''}`} />
                      <span className="tabular-nums font-medium">{project.likes}</span>
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

export const ProjectDetailModal: React.FC<{
  project: GalleryProject | null;
  onClose: () => void;
  onToggleLike: (id: string) => void;
}> = ({ project, onClose, onToggleLike }) => {
  if (!project) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs forum-modal-overlay"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={project.title}
        className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.1] rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.07] flex items-center justify-between gap-4">
          <div className="text-xs text-slate-500 dark:text-[#8e8e93]">
            <span className="font-semibold text-violet-600 dark:text-[#a88bfa]">
              {project.stack}
            </span>
            <span> · Door {project.authorName} · {project.createdAt}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#1c1829] text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">
                {project.title}
              </h2>
              <p className="text-sm text-slate-600 dark:text-[#9c9c9d] mt-1.5">
                {project.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onToggleLike(project.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer shrink-0 ${
                project.likedByMe
                  ? 'bg-[#a88bfa]/20 border-[#a88bfa]/50 text-violet-700 dark:text-[#c7b5ff]'
                  : 'bg-slate-50 dark:bg-[#181524] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${project.likedByMe ? 'fill-current' : ''}`} />
              <span className="tabular-nums">{project.likes}</span>
            </button>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-[#8b8b90] mb-2">
              Interactieve live preview
            </div>
            <div className="h-[220px] rounded-xl overflow-hidden border border-slate-200 dark:border-white/[0.09]">
              <LiveProjectPreviewFrame project={project} />
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-[#8b8b90] mb-2">
              Broncode snippet
            </div>
            <CodeBlock snippet={project.codeSnippet} />
          </div>
        </div>
      </div>
    </div>
  );
};

export const NewProjectModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (payload: {
    title: string;
    description: string;
    stack: string;
    previewPreset: PreviewPresetId;
    customMarkup?: string;
    language: CodeLanguage;
    code: string;
  }) => void;
}> = ({ isOpen, onClose, onCreateProject }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stack, setStack] = useState('React + Vue');
  const [language, setLanguage] = useState<CodeLanguage>('tsx');
  const [code, setCode] = useState(
    `export function DemoCard() {\n  return <div className="card">Hallo Forum!</div>;\n}`
  );
  const [customMarkup, setCustomMarkup] = useState(
    'Interactieve module klaar voor de community om te testen!'
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    onCreateProject({
      title: title.trim(),
      description: description.trim(),
      stack: stack.trim() || 'React + Vue',
      previewPreset: 'custom-html',
      customMarkup: customMarkup.trim(),
      language,
      code: code.trim(),
    });
    setTitle('');
    setDescription('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs forum-modal-overlay"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Nieuw project delen"
        className="w-full max-w-lg max-h-[90vh] flex flex-col bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.1] rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.07] flex items-center justify-between">
          <h2 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white">
            Project toevoegen aan galerij
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#1c1829] text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Projectnaam
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bijv. Mini Vue + React State Sync"
              className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-[#1a1726] border border-slate-200 dark:border-white/[0.09] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#a88bfa]/60"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Stack
              </label>
              <input
                type="text"
                value={stack}
                onChange={(e) => setStack(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-[#1a1726] border border-slate-200 dark:border-white/[0.09] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#a88bfa]/60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Code-taal
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as CodeLanguage)}
                className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#1a1726] border border-slate-200 dark:border-white/[0.09] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#a88bfa]/60"
              >
                <option value="tsx">React (TSX)</option>
                <option value="vue">Vue 3 (SFC)</option>
                <option value="ts">TypeScript</option>
                <option value="css">CSS / Tailwind</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Korte omschrijving
            </label>
            <textarea
              required
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Wat doet jouw project?"
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#1a1726] border border-slate-200 dark:border-white/[0.09] text-sm text-slate-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-[#a88bfa]/60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Preview-tekst in live embed
            </label>
            <input
              type="text"
              value={customMarkup}
              onChange={(e) => setCustomMarkup(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-[#1a1726] border border-slate-200 dark:border-white/[0.09] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#a88bfa]/60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Code-snippet
            </label>
            <textarea
              rows={4}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#0e0c16] border border-white/[0.09] text-xs font-mono text-slate-100 resize-none focus:outline-none focus:ring-2 focus:ring-[#a88bfa]/60"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#1c1829] text-slate-700 dark:text-slate-200 text-sm font-semibold cursor-pointer"
            >
              Annuleren
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#e8b353] hover:bg-[#f0be63] text-[#141008] text-sm font-bold cursor-pointer"
            >
              Publiceren
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
