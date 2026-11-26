import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AtSign, Bell, BellOff, BellRing, Send, Smile } from 'lucide-react';
import { ChatMessage, Member } from '../types/forum';
import { UserBadges } from './UserBadges';

export type BrowserNotificationPermission = 'default' | 'granted' | 'denied' | 'unsupported';

export interface TypingUser {
  name: string;
  initials: string;
  avatarColor: string;
}

interface LiveChatProps {
  messages: ChatMessage[];
  watcherCount: number;
  currentUser: Member | null;
  onlineMembers?: Member[];
  typingUsers?: TypingUser[];
  onSendMessage: (text: string) => void;
  onTypingChange?: (typing: boolean) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onOpenAuth: (mode: 'register' | 'login') => void;
  notificationsEnabled: boolean;
  notificationPermission: BrowserNotificationPermission;
  onToggleNotifications: () => void;
}

const QUICK_EMOJIS = ['🔥', '💜', '👍', '🚀', '👀'];

interface MentionContext {
  query: string;
  startIndex: number;
  endIndex: number;
}

function detectMentionContext(text: string, cursorIndex: number): MentionContext | null {
  const beforeCursor = text.slice(0, cursorIndex);
  const match = beforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_.-]*)$/);
  if (!match) return null;
  const query = match[1];
  const startIndex = beforeCursor.lastIndexOf('@');
  return {
    query,
    startIndex,
    endIndex: cursorIndex,
  };
}

export const LiveChat: React.FC<LiveChatProps> = ({
  messages,
  watcherCount,
  currentUser,
  onlineMembers = [],
  typingUsers = [],
  onSendMessage,
  onTypingChange,
  onToggleReaction,
  onOpenAuth,
  notificationsEnabled,
  notificationPermission,
  onToggleNotifications,
}) => {
  const [draft, setDraft] = useState('');
  const [isLocalTyping, setIsLocalTyping] = useState(false);
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const [mentionContext, setMentionContext] = useState<MentionContext | null>(null);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, isLocalTyping, typingUsers.length]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current !== null) {
        window.clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const mentionSuggestions = useMemo(() => {
    if (!mentionContext) return [];
    const q = mentionContext.query.toLowerCase();
    return onlineMembers.filter((member) => {
      const cleanHandle = member.handle.replace(/^@/, '').toLowerCase();
      const cleanName = member.name.toLowerCase();
      return cleanHandle.includes(q) || cleanName.includes(q);
    });
  }, [mentionContext, onlineMembers]);

  useEffect(() => {
    setSelectedMentionIndex(0);
  }, [mentionContext?.query, mentionSuggestions.length]);

  const updateDraftWithTyping = (nextValue: string, cursorPos?: number) => {
    setDraft(nextValue);

    const effectiveCursor = cursorPos ?? nextValue.length;
    setMentionContext(detectMentionContext(nextValue, effectiveCursor));

    if (typingTimeoutRef.current !== null) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    if (nextValue.trim().length > 0 && currentUser) {
      setIsLocalTyping(true);
      typingTimeoutRef.current = window.setTimeout(() => {
        setIsLocalTyping(false);
        onTypingChange?.(false);
      }, 2800);
      onTypingChange?.(true);
    } else {
      setIsLocalTyping(false);
      onTypingChange?.(false);
    }
  };

  const insertMention = (member: Member) => {
    const handleWithAt = member.handle.startsWith('@') ? member.handle : `@${member.handle}`;
    if (!mentionContext) {
      const next = `${draft}${draft && !draft.endsWith(' ') ? ' ' : ''}${handleWithAt} `;
      updateDraftWithTyping(next, next.length);
      setMentionContext(null);
      inputRef.current?.focus();
      return;
    }

    const prefix = draft.slice(0, mentionContext.startIndex);
    const suffix = draft.slice(mentionContext.endIndex);
    const inserted = `${prefix}${handleWithAt} ${suffix.replace(/^\s+/, '')}`;
    const newCursor = `${prefix}${handleWithAt} `.length;

    setDraft(inserted);
    setMentionContext(null);

    window.requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursor, newCursor);
      }
    });
  };

  const handleTriggerMentionButton = () => {
    if (!currentUser) return;
    const needsSpace = draft.length > 0 && !draft.endsWith(' ');
    const nextValue = `${draft}${needsSpace ? ' ' : ''}@`;
    updateDraftWithTyping(nextValue, nextValue.length);
    window.requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(nextValue.length, nextValue.length);
      }
    });
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!mentionContext || mentionSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedMentionIndex((prev) => (prev + 1) % mentionSuggestions.length);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedMentionIndex((prev) =>
        prev === 0 ? mentionSuggestions.length - 1 : prev - 1
      );
      return;
    }

    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const target = mentionSuggestions[selectedMentionIndex] ?? mentionSuggestions[0];
      if (target) {
        insertMention(target);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setMentionContext(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || !currentUser) return;
    if (typingTimeoutRef.current !== null) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    setIsLocalTyping(false);
    onTypingChange?.(false);
    setMentionContext(null);
    onSendMessage(trimmed);
    setDraft('');
    setShowEmojiBar(false);
  };

  const renderMessageWithMentions = (text: string) => {
    const parts = text.split(/(@[a-zA-Z0-9_.-]+)/g);
    return parts.map((part, idx) => {
      if (!part.startsWith('@') || part.length <= 1) {
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      }

      const rawToken = part.slice(1).toLowerCase();
      const matchedMember = onlineMembers.find(
        (m) =>
          m.handle.replace(/^@/, '').toLowerCase() === rawToken ||
          m.name.toLowerCase().replace(/\s+/g, '') === rawToken
      );
      const isMe =
        currentUser &&
        (currentUser.handle.replace(/^@/, '').toLowerCase() === rawToken ||
          currentUser.name.toLowerCase().replace(/\s+/g, '') === rawToken);

      return (
        <span
          key={idx}
          title={
            matchedMember
              ? `${matchedMember.name} (${matchedMember.role}) · ${matchedMember.statusText}`
              : `Vermelding ${part}`
          }
          className={`inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md text-xs font-mono font-semibold transition-colors ${
            isMe
              ? 'bg-[#e8b353]/25 text-amber-800 dark:text-[#f5c872] ring-1 ring-[#e8b353]/50'
              : 'bg-[#a88bfa]/18 text-violet-700 dark:text-[#d0c0ff]'
          }`}
        >
          {part}
        </span>
      );
    });
  };

  const activeTypers = useMemo<TypingUser[]>(() => {
    const list: TypingUser[] = [...typingUsers];
    if (currentUser && (isLocalTyping || draft.trim().length > 0)) {
      const alreadyIncluded = list.some((u) => u.name === currentUser.name);
      if (!alreadyIncluded) {
        list.unshift({
          name: currentUser.name,
          initials: currentUser.initials,
          avatarColor: currentUser.avatarColor,
        });
      }
    }
    return list;
  }, [typingUsers, currentUser, isLocalTyping, draft]);

  const typingLabel = useMemo(() => {
    if (activeTypers.length === 0) return '';
    if (activeTypers.length === 1) {
      return `${activeTypers[0].name} is aan het typen...`;
    }
    if (activeTypers.length === 2) {
      return `${activeTypers[0].name} en ${activeTypers[1].name} zijn aan het typen...`;
    }
    return `${activeTypers[0].name} en ${activeTypers.length - 1} anderen zijn aan het typen...`;
  }, [activeTypers]);

  const isActive = notificationsEnabled && notificationPermission === 'granted';
  const isDenied = notificationPermission === 'denied';
  const isUnsupported = notificationPermission === 'unsupported';

  return (
    <section
      id="live-chat"
      aria-label="Live chat"
      className="bg-white dark:bg-[#13111c] border border-slate-200 dark:border-white/[0.08] rounded-2xl overflow-hidden shadow-xs"
    >
      {/* Header matching the reference screenshot */}
      <div className="px-5 py-4 border-b border-slate-200 dark:border-white/[0.07] flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
            Live chat
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#8e8e93] mt-0.5 truncate">
            Zeg gerust hoi. Met <span className="font-semibold text-violet-600 dark:text-[#a88bfa]">@naam</span> tag je iemand.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleNotifications}
            disabled={isUnsupported}
            title={
              isUnsupported
                ? 'Browsermeldingen worden niet ondersteund; tab-titel waarschuwt wel op de achtergrond'
                : isDenied
                  ? 'Meldingen zijn geblokkeerd in je browserinstellingen'
                  : isActive
                    ? 'Meldingen bij achtergrond-berichten uitschakelen'
                    : 'Ontvang browsermeldingen als de tab op de achtergrond staat'
            }
            aria-pressed={isActive}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${
              isActive
                ? 'bg-[#a88bfa]/15 border-[#a88bfa]/40 text-violet-700 dark:text-[#d6c8ff]'
                : isDenied
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-300'
                  : 'bg-slate-100 dark:bg-[#1a1726] border-slate-200 dark:border-white/[0.07] text-slate-600 dark:text-[#b1b1b4] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {isActive ? (
              <BellRing className="w-3.5 h-3.5 text-[#a88bfa] shrink-0" />
            ) : isDenied || isUnsupported ? (
              <BellOff className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Bell className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>
              {isActive
                ? 'Meldingen aan'
                : isDenied
                  ? 'Geblokkeerd'
                  : 'Meldingen'}
            </span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-[#1a1726] border border-slate-200 dark:border-white/[0.07] text-xs font-medium text-slate-700 dark:text-[#c7c2da] shrink-0 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" aria-hidden="true" />
            <span className="tabular-nums">
              {watcherCount} {watcherCount === 1 ? 'kijkt mee' : 'kijken mee'}
            </span>
          </div>
        </div>
      </div>

      {isDenied && (
        <div className="px-5 py-2 bg-rose-500/[0.06] border-b border-rose-500/20 text-xs text-rose-700 dark:text-rose-300">
          Browsermeldingen staan geblokkeerd in je browser. De tab-titel blijft je wel waarschuwen
          bij nieuwe berichten op de achtergrond.
        </div>
      )}

      {/* Live messages feed */}
      <div
        ref={scrollRef}
        className="h-[300px] sm:h-[320px] overflow-y-auto px-5 py-4 space-y-4 bg-slate-50/50 dark:bg-[#0e0f12]"
      >
        {messages.map((msg) => (
          <div key={msg.id} className="group flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-[#0c0d10] shrink-0 mt-0.5 overflow-hidden"
              style={{ backgroundColor: msg.authorColor }}
            >
              {msg.authorAvatarUrl ? (
                <img
                  src={msg.authorAvatarUrl}
                  alt={msg.authorName}
                  className="w-full h-full object-cover"
                />
              ) : (
                msg.authorInitials
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {msg.authorName}
                </span>
                <UserBadges
                  authorName={msg.authorName}
                  onlineMembers={onlineMembers}
                  maxVisible={2}
                />
                {msg.authorRole && (
                  <span className="text-xs text-violet-600 dark:text-[#a88bfa] font-medium">
                    {msg.authorRole}
                  </span>
                )}
                <span className="text-xs text-slate-400 dark:text-[#6a6b6c] font-mono tabular-nums">
                  {msg.timestamp}
                </span>
              </div>

              <p className="text-sm text-slate-700 dark:text-[#d6d6d8] leading-relaxed mt-0.5 break-words">
                {renderMessageWithMentions(msg.text)}
              </p>

              {/* Reactions & quick react hover action */}
              <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                {msg.reactions?.map((r) => (
                  <button
                    key={r.emoji}
                    type="button"
                    onClick={() => onToggleReaction(msg.id, r.emoji)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs transition-colors cursor-pointer ${
                      r.active
                        ? 'bg-[#a88bfa]/20 border border-[#a88bfa]/40 text-violet-700 dark:text-[#d6c8ff]'
                        : 'bg-slate-200/70 dark:bg-white/[0.05] border border-transparent hover:border-slate-300 dark:hover:border-white/[0.1] text-slate-600 dark:text-[#9c9c9d]'
                    }`}
                  >
                    <span>{r.emoji}</span>
                    <span className="tabular-nums font-medium">{r.count}</span>
                  </button>
                ))}

                <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-1">
                  {QUICK_EMOJIS.slice(0, 3).map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => onToggleReaction(msg.id, emoji)}
                      title={`Reageer met ${emoji}`}
                      className="px-1.5 py-0.5 rounded-md text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Visual 'X is aan het typen...' indicator at the bottom of the LiveChat component */}
      {activeTypers.length > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="px-5 py-2 bg-slate-100/80 dark:bg-[#161321] border-t border-slate-200/80 dark:border-white/[0.06] flex items-center gap-2.5 text-xs text-slate-600 dark:text-[#b1b1b4]"
        >
          <div className="flex items-center -space-x-1.5 shrink-0">
            {activeTypers.slice(0, 3).map((typer) => (
              <span
                key={typer.name}
                className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-[#0c0d10] ring-2 ring-white dark:ring-[#161321]"
                style={{ backgroundColor: typer.avatarColor }}
              >
                {typer.initials}
              </span>
            ))}
          </div>

          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white dark:bg-[#1f1b2e] border border-slate-200/80 dark:border-white/[0.07]">
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#a88bfa] animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#a88bfa] animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#a88bfa] animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </span>

          <span className="font-medium truncate">{typingLabel}</span>
        </div>
      )}

      {/* Footer: Guest prompt (matching screenshot) OR live composer when signed in */}
      <div className="relative px-5 py-4 border-t border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#13111c]">
        {/* @-Mention Suggestion Popover for Online Members */}
        {currentUser && mentionContext && (
          <div
            role="listbox"
            aria-label="Online leden om te taggen"
            className="mb-3 rounded-xl bg-slate-50 dark:bg-[#181524] border border-slate-200 dark:border-white/[0.1] shadow-lg overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500 dark:text-[#8b8b90]">
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                Tag een online lid {mentionContext.query ? `(zoek: "@${mentionContext.query}")` : ''}
              </span>
              <span className="font-mono">↑↓ navigeer · Enter/Tab kies · Esc sluit</span>
            </div>

            {mentionSuggestions.length === 0 ? (
              <div className="px-3.5 py-2.5 text-xs text-slate-500 dark:text-[#8b8b90]">
                Geen online leden gevonden voor &ldquo;@{mentionContext.query}&rdquo;
              </div>
            ) : (
              <div className="max-h-44 overflow-y-auto divide-y divide-slate-200/60 dark:divide-white/[0.04]">
                {mentionSuggestions.map((member, index) => {
                  const isHighlighted = index === selectedMentionIndex;
                  return (
                    <button
                      key={member.id}
                      type="button"
                      role="option"
                      aria-selected={isHighlighted}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        insertMention(member);
                      }}
                      onMouseEnter={() => setSelectedMentionIndex(index)}
                      className={`w-full px-3.5 py-2 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                        isHighlighted
                          ? 'bg-[#a88bfa]/15 text-slate-900 dark:text-white'
                          : 'hover:bg-slate-100 dark:hover:bg-white/[0.04] text-slate-700 dark:text-[#d6d6d8]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <span
                            className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-[#0c0d10]"
                            style={{ backgroundColor: member.avatarColor }}
                          >
                            {member.initials}
                          </span>
                          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-white dark:ring-[#181524]" />
                        </div>

                        <div className="min-w-0 flex items-center gap-2">
                          <span className="text-xs font-semibold truncate">{member.name}</span>
                          <span className="text-xs font-mono text-violet-600 dark:text-[#a88bfa] shrink-0">
                            {member.handle}
                          </span>
                          <UserBadges
                            member={member}
                            maxVisible={1}
                            showOverflowCount={false}
                          />
                        </div>
                      </div>

                      <span className="text-[11px] text-slate-400 dark:text-[#737376] shrink-0">
                        {member.role}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {currentUser ? (
          <form onSubmit={handleSubmit} className="space-y-2.5">
            {showEmojiBar && (
              <div className="flex items-center gap-1.5 pb-1">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() =>
                      updateDraftWithTyping(`${draft}${draft ? ' ' : ''}${emoji} `)
                    }
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#1b1828] hover:bg-slate-200 dark:hover:bg-[#242036] text-sm transition-colors cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowEmojiBar((prev) => !prev)}
                aria-label="Emoji toevoegen"
                title="Emoji toevoegen"
                className="w-10 h-10 rounded-xl border border-slate-200 dark:border-white/[0.09] bg-slate-50 dark:bg-[#1a1726] hover:bg-slate-100 dark:hover:bg-[#221e31] text-slate-500 dark:text-[#9c9c9d] flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <Smile className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleTriggerMentionButton}
                aria-label="Tag een online lid met @"
                title="Tag een online lid (@)"
                className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                  mentionContext
                    ? 'bg-[#a88bfa]/20 border-[#a88bfa]/50 text-violet-700 dark:text-[#d6c8ff]'
                    : 'border-slate-200 dark:border-white/[0.09] bg-slate-50 dark:bg-[#1a1726] hover:bg-slate-100 dark:hover:bg-[#221e31] text-slate-500 dark:text-[#9c9c9d]'
                }`}
              >
                <AtSign className="w-4 h-4" />
              </button>

              <input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={(e) =>
                  updateDraftWithTyping(
                    e.target.value,
                    e.target.selectionStart ?? e.target.value.length
                  )
                }
                onKeyDown={handleInputKeyDown}
                onClick={(e) => {
                  const target = e.currentTarget;
                  setMentionContext(
                    detectMentionContext(target.value, target.selectionStart ?? target.value.length)
                  );
                }}
                placeholder={`Praat mee als ${currentUser.name}...`}
                className="flex-1 min-w-0 h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-[#1a1726] border border-slate-200 dark:border-white/[0.09] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#6a6b6c] focus:outline-none focus:ring-2 focus:ring-[#a88bfa]/60"
              />

              <button
                type="submit"
                disabled={!draft.trim()}
                aria-label="Verstuur"
                className="h-10 px-3 sm:px-4 rounded-xl bg-[#a88bfa] hover:bg-[#b79dff] disabled:opacity-40 disabled:cursor-not-allowed text-[#0c0d10] text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <span className="hidden sm:inline">Verstuur</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-xs sm:text-sm text-slate-600 dark:text-[#9c9c9d]">
              Je leest mee als gast. Log in om mee te praten.
            </p>
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => onOpenAuth('register')}
                className="px-4 py-2 rounded-xl bg-[#a88bfa] hover:bg-[#b79dff] text-[#0c0d10] text-sm font-semibold transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0"
              >
                Aanmelden
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#1b1828] hover:bg-slate-200 dark:hover:bg-[#202125] border border-slate-200 dark:border-white/[0.09] text-slate-800 dark:text-white text-sm font-semibold transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0"
              >
                Inloggen
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};


