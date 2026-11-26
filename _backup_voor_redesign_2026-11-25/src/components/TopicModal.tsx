import React, { useRef, useState } from 'react';
import {
  ArrowUp,
  Award,
  CheckCircle2,
  Code2,
  Heart,
  MessageSquare,
  Paperclip,
  Send,
  Table,
  X,
} from 'lucide-react';
import { CATEGORIES } from '../data/forumData';
import {
  CategoryId,
  CodeLanguage,
  CodeSnippet,
  Member,
  Topic,
  TopicAttachment,
} from '../types/forum';
import { CodeBlock } from './CodeBlock';
import { RichTopicBody } from './RichTopicBody';
import { UserBadges } from './UserBadges';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function filesToAttachments(files: FileList | null): TopicAttachment[] {
  if (!files) return [];
  return Array.from(files).map((file, idx) => ({
    id: `att-${Date.now()}-${idx}`,
    name: file.name,
    sizeLabel: formatFileSize(file.size),
    kind: file.type.startsWith('image/') ? 'image' : 'file',
    url: URL.createObjectURL(file),
  }));
}

interface TopicDetailModalProps {
  topic: Topic | null;
  currentUser: Member | null;
  onlineMembers?: Member[];
  onClose: () => void;
  onToggleTopicVote: (topicId: string) => void;
  onToggleReplyLike: (topicId: string, replyId: string) => void;
  onMarkBestAnswer: (topicId: string, replyId: string) => void;
  onAddReply: (
    topicId: string,
    content: string,
    codeSnippet?: CodeSnippet,
    attachments?: TopicAttachment[]
  ) => void;
  onOpenAuth: (mode: 'register' | 'login') => void;
}

export const TopicDetailModal: React.FC<TopicDetailModalProps> = ({
  topic,
  currentUser,
  onlineMembers = [],
  onClose,
  onToggleTopicVote,
  onToggleReplyLike,
  onMarkBestAnswer,
  onAddReply,
  onOpenAuth,
}) => {
  const [replyText, setReplyText] = useState('');
  const [includeCode, setIncludeCode] = useState(false);
  const [replyLang, setReplyLang] = useState<CodeLanguage>('tsx');
  const [replyCode, setReplyCode] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<TopicAttachment[]>([]);
  const replyFileRef = useRef<HTMLInputElement>(null);

  if (!topic) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !currentUser) return;
    const snippet: CodeSnippet | undefined =
      includeCode && replyCode.trim()
        ? { language: replyLang, code: replyCode.trim() }
        : undefined;
    onAddReply(
      topic.id,
      replyText.trim(),
      snippet,
      replyAttachments.length > 0 ? replyAttachments : undefined
    );
    setReplyText('');
    setReplyCode('');
    setReplyAttachments([]);
    setIncludeCode(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs forum-modal-overlay"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={topic.title}
        className="w-full max-w-2xl max-h-[88vh] flex flex-col bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.1] rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.07] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#8d87a4]">
            <span className="font-semibold text-violet-600 dark:text-[#a88bfa]">
              {topic.categoryLabel}
            </span>
            <span aria-hidden="true">·</span>
            <span>{topic.createdAt}</span>
            {topic.solved && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Opgelost
                </span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#1c1829] hover:bg-slate-200 dark:hover:bg-[#262138] text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div>
            <div className="flex items-start gap-3.5">
              <button
                type="button"
                onClick={() => onToggleTopicVote(topic.id)}
                className={`w-11 py-2 rounded-xl border flex flex-col items-center justify-center shrink-0 transition-colors cursor-pointer ${
                  topic.votedByMe
                    ? 'bg-[#a88bfa]/15 border-[#a88bfa]/50 text-violet-700 dark:text-[#c7b5ff]'
                    : 'bg-slate-50 dark:bg-[#181524] border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-[#8d87a4]'
                }`}
              >
                <ArrowUp className="w-4 h-4" />
                <span className="text-xs font-mono font-semibold tabular-nums mt-0.5">
                  {topic.votes}
                </span>
              </button>

              <div className="flex-1 min-w-0">
                <h2 className="font-display font-bold text-lg sm:text-xl text-slate-900 dark:text-white leading-snug">
                  {topic.title}
                </h2>
                <div className="flex items-center flex-wrap gap-2 mt-2 text-xs text-slate-500 dark:text-[#8d87a4]">
                  <span
                    className="w-5 h-5 rounded-md inline-flex items-center justify-center text-[10px] font-bold text-[#0f0c18]"
                    style={{ backgroundColor: topic.authorColor }}
                  >
                    {topic.authorInitials}
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {topic.authorName}
                  </span>
                  <UserBadges
                    authorName={topic.authorName}
                    onlineMembers={onlineMembers}
                    maxVisible={3}
                  />
                  <span aria-hidden="true">·</span>
                  <span>{topic.authorRole}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-4 pl-0 sm:pl-14">
              <RichTopicBody body={topic.body} attachments={topic.attachments} />
              {topic.codeSnippet && <CodeBlock snippet={topic.codeSnippet} />}
            </div>
          </div>

          <div className="pt-5 border-t border-slate-200 dark:border-white/[0.07]">
            <div className="flex items-center gap-2 text-sm font-display font-bold text-slate-900 dark:text-white mb-4">
              <MessageSquare className="w-4 h-4 text-[#a88bfa]" />
              <span>Reacties ({topic.replies.length})</span>
            </div>

            <div className="space-y-4">
              {topic.replies.map((reply) => (
                <div
                  key={reply.id}
                  className={`p-4 rounded-xl border space-y-3 ${
                    reply.isBestAnswer
                      ? 'bg-emerald-500/[0.05] border-emerald-500/35'
                      : 'bg-slate-50 dark:bg-[#181524] border-slate-200/80 dark:border-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span
                        className="w-6 h-6 rounded-lg inline-flex items-center justify-center text-[10px] font-bold text-[#0f0c18]"
                        style={{ backgroundColor: reply.authorColor }}
                      >
                        {reply.authorInitials}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {reply.authorName}
                      </span>
                      <UserBadges
                        authorName={reply.authorName}
                        onlineMembers={onlineMembers}
                        maxVisible={2}
                      />
                      <span className="text-violet-600 dark:text-[#a88bfa]">
                        {reply.authorRole}
                      </span>
                      <span className="text-slate-400 dark:text-[#6e6885]">· {reply.createdAt}</span>
                      {reply.isBestAnswer && (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                          · <Award className="w-3.5 h-3.5" /> Beste antwoord (+15 rep)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!reply.isBestAnswer && (
                        <button
                          type="button"
                          onClick={() => onMarkBestAnswer(topic.id, reply.id)}
                          title="Markeer als beste antwoord (+15 reputatie)"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-slate-500 dark:text-[#86809e] hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-200/60 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Beste antwoord</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onToggleReplyLike(topic.id, reply.id)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                          reply.likedByMe
                            ? 'bg-[#a88bfa]/20 text-violet-700 dark:text-[#c7b5ff]'
                            : 'text-slate-500 dark:text-[#86809e] hover:bg-slate-200/60 dark:hover:bg-white/[0.05]'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${reply.likedByMe ? 'fill-current' : ''}`} />
                        <span className="tabular-nums font-medium">{reply.likes}</span>
                      </button>
                    </div>
                  </div>

                  <RichTopicBody body={reply.content} attachments={reply.attachments} />
                  {reply.codeSnippet && <CodeBlock snippet={reply.codeSnippet} compact />}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-white/[0.07] bg-slate-50 dark:bg-[#110f19]">
          {currentUser ? (
            <form onSubmit={handleSubmit} className="space-y-2.5">
              {replyAttachments.length > 0 && (
                <div className="flex items-center flex-wrap gap-2">
                  {replyAttachments.map((att) => (
                    <span
                      key={att.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-[#1a1726] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-700 dark:text-slate-200"
                    >
                      <span className="truncate max-w-[140px]">{att.name}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setReplyAttachments((prev) => prev.filter((a) => a.id !== att.id))
                        }
                        className="text-slate-400 hover:text-red-400 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {includeCode && (
                <div className="space-y-2 p-3 rounded-xl bg-white dark:bg-[#161322] border border-slate-200 dark:border-white/[0.08]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Code-snippet bijvoegen
                    </span>
                    <select
                      value={replyLang}
                      onChange={(e) => setReplyLang(e.target.value as CodeLanguage)}
                      className="h-7 px-2 rounded-lg bg-slate-100 dark:bg-[#1e1a2e] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-white"
                    >
                      <option value="tsx">React (TSX)</option>
                      <option value="vue">Vue 3 (SFC)</option>
                      <option value="ts">TypeScript</option>
                      <option value="css">CSS</option>
                      <option value="bash">Terminal</option>
                    </select>
                  </div>
                  <textarea
                    rows={3}
                    value={replyCode}
                    onChange={(e) => setReplyCode(e.target.value)}
                    placeholder="Plak hier je code..."
                    className="w-full p-2.5 rounded-lg bg-[#0e0c16] border border-white/[0.08] text-xs font-mono text-slate-100 resize-none focus:outline-none focus:ring-2 focus:ring-[#a88bfa]/60"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  ref={replyFileRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const added = filesToAttachments(e.target.files);
                    setReplyAttachments((prev) => [...prev, ...added]);
                    e.target.value = '';
                  }}
                />

                <button
                  type="button"
                  onClick={() => replyFileRef.current?.click()}
                  title="Bestand of afbeelding uploaden"
                  className="w-10 h-10 rounded-xl border bg-white dark:bg-[#1a1726] border-slate-200 dark:border-white/[0.09] text-slate-500 dark:text-[#9c96b2] hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIncludeCode((prev) => !prev)}
                  title="Code-snippet toevoegen"
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                    includeCode
                      ? 'bg-[#a88bfa]/20 border-[#a88bfa]/60 text-violet-700 dark:text-[#c7b5ff]'
                      : 'bg-white dark:bg-[#1a1726] border-slate-200 dark:border-white/[0.09] text-slate-500 dark:text-[#9c96b2]'
                  }`}
                >
                  <Code2 className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Schrijf een reactie..."
                  className="flex-1 h-10 px-3.5 rounded-xl bg-white dark:bg-[#1a1726] border border-slate-200 dark:border-white/[0.09] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#6e6885] focus:outline-none focus:ring-2 focus:ring-[#a88bfa]/60"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  aria-label="Plaatsen"
                  className="h-10 px-3 sm:px-4 rounded-xl bg-[#a88bfa] hover:bg-[#b79dff] disabled:opacity-40 text-[#0f0c18] text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span className="hidden sm:inline">Plaatsen</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs sm:text-sm text-slate-600 dark:text-[#9c96b2]">
                Log in om reacties, tabellen, bestanden of code-snippets te plaatsen.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenAuth('register')}
                  className="px-3.5 py-2 rounded-xl bg-[#a88bfa] hover:bg-[#b79dff] text-[#0f0c18] text-xs font-semibold cursor-pointer"
                >
                  Aanmelden
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#1b1828] border border-slate-200 dark:border-white/[0.09] text-slate-800 dark:text-white text-xs font-semibold cursor-pointer"
                >
                  Inloggen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface NewTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTopic: (payload: {
    title: string;
    category: Exclude<CategoryId, 'all'>;
    body: string;
    codeSnippet?: CodeSnippet;
    attachments?: TopicAttachment[];
  }) => void;
}

export const NewTopicModal: React.FC<NewTopicModalProps> = ({
  isOpen,
  onClose,
  onCreateTopic,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Exclude<CategoryId, 'all'>>('algemeen');
  const [body, setBody] = useState('');
  const [withSnippet, setWithSnippet] = useState(false);
  const [snippetLang, setSnippetLang] = useState<CodeLanguage>('tsx');
  const [snippetFilename, setSnippetFilename] = useState('Component.tsx');
  const [snippetCode, setSnippetCode] = useState('');
  const [attachments, setAttachments] = useState<TopicAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const insertMarkdownTable = () => {
    const tableTemplate = `\n| Optie | Voordeel | Snelheid |\n| --- | --- | --- |\n| React 19 | Groot ecosysteem | Snel |\n| Vue 3 | Compacte SFC | Snel |\n`;
    setBody((prev) => `${prev}${prev.endsWith('\n') || !prev ? '' : '\n'}${tableTemplate}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    const codeSnippet: CodeSnippet | undefined =
      withSnippet && snippetCode.trim()
        ? {
            language: snippetLang,
            filename: snippetFilename.trim() || undefined,
            code: snippetCode.trim(),
          }
        : undefined;

    onCreateTopic({
      title: title.trim(),
      category,
      body: body.trim(),
      codeSnippet,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
    setTitle('');
    setBody('');
    setCategory('algemeen');
    setWithSnippet(false);
    setSnippetCode('');
    setAttachments([]);
    onClose();
  };

  const categoryChoices = CATEGORIES.filter((c) => c.id !== 'all') as {
    id: Exclude<CategoryId, 'all'>;
    label: string;
  }[];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs forum-modal-overlay"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Nieuw topic starten"
        className="w-full max-w-lg max-h-[90vh] flex flex-col bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.1] rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.07] flex items-center justify-between">
          <h2 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white">
            Nieuw topic starten
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#1c1829] hover:bg-slate-200 dark:hover:bg-[#262138] text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Titel
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Waar wil je het over hebben?"
              className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-[#1a1726] border border-slate-200 dark:border-white/[0.09] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#6e6885] focus:outline-none focus:ring-2 focus:ring-[#a88bfa]/60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Categorie
            </label>
            <div className="grid grid-cols-2 gap-2">
              {categoryChoices.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border text-left transition-colors cursor-pointer ${
                    category === cat.id
                      ? 'bg-[#a88bfa]/15 border-[#a88bfa]/60 text-violet-700 dark:text-white'
                      : 'bg-slate-50 dark:bg-[#1a1726] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-[#9c96b2]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Bericht (ondersteunt Markdown-tabellen)
              </label>
              <button
                type="button"
                onClick={insertMarkdownTable}
                className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-[#a88bfa] hover:underline cursor-pointer"
              >
                <Table className="w-3.5 h-3.5" />
                <span>Tabel invoegen</span>
              </button>
            </div>
            <textarea
              required
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Leg je vraag, idee of showcase uit. Gebruik | Kolom | ... | voor tabellen..."
              className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-[#1a1726] border border-slate-200 dark:border-white/[0.09] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#6e6885] focus:outline-none focus:ring-2 focus:ring-[#a88bfa]/60 resize-y font-sans"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const added = filesToAttachments(e.target.files);
                setAttachments((prev) => [...prev, ...added]);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border bg-slate-50 dark:bg-[#1a1726] border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-700 dark:text-[#cfc9e6] hover:border-[#a88bfa]/50 cursor-pointer"
            >
              <Paperclip className="w-4 h-4 text-[#a88bfa]" />
              <span>Bestand / foto uploaden</span>
            </button>

            <button
              type="button"
              onClick={() => setWithSnippet((prev) => !prev)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                withSnippet
                  ? 'bg-[#a88bfa]/15 border-[#a88bfa]/50 text-violet-700 dark:text-[#c7b5ff]'
                  : 'bg-slate-50 dark:bg-[#1a1726] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-[#9c96b2]'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>{withSnippet ? 'Code-snippet verbergen' : 'Code-snippet toevoegen'}</span>
            </button>
          </div>

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((att) => (
                <span
                  key={att.id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#181524] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-700 dark:text-slate-200"
                >
                  <span className="truncate max-w-[180px]">{att.name}</span>
                  <span className="text-slate-400 font-mono">{att.sizeLabel}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setAttachments((prev) => prev.filter((a) => a.id !== att.id))
                    }
                    className="text-slate-400 hover:text-red-400 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {withSnippet && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#181524] border border-slate-200 dark:border-white/[0.08] space-y-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                <select
                  value={snippetLang}
                  onChange={(e) => setSnippetLang(e.target.value as CodeLanguage)}
                  className="h-9 px-2.5 rounded-lg bg-white dark:bg-[#1e1a2e] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-white"
                >
                  <option value="tsx">React (TSX)</option>
                  <option value="vue">Vue 3 (SFC)</option>
                  <option value="ts">TypeScript</option>
                  <option value="css">CSS / Tailwind</option>
                  <option value="bash">Terminal</option>
                </select>
                <input
                  type="text"
                  value={snippetFilename}
                  onChange={(e) => setSnippetFilename(e.target.value)}
                  placeholder="Bestandsnaam"
                  className="h-9 px-2.5 rounded-lg bg-white dark:bg-[#1e1a2e] border border-slate-200 dark:border-white/[0.08] text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>
              <textarea
                rows={4}
                value={snippetCode}
                onChange={(e) => setSnippetCode(e.target.value)}
                placeholder="Plak hier je React, Vue of TypeScript code..."
                className="w-full p-3 rounded-lg bg-[#0e0c16] border border-white/[0.08] text-xs font-mono text-slate-100 resize-none focus:outline-none focus:ring-2 focus:ring-[#a88bfa]/60"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#1c1829] text-slate-700 dark:text-slate-200 text-sm font-semibold cursor-pointer"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !body.trim()}
              className="px-4 py-2 rounded-xl bg-[#a88bfa] hover:bg-[#b79dff] disabled:opacity-40 text-[#0f0c18] text-sm font-semibold cursor-pointer"
            >
              Topic plaatsen (+10 rep)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
