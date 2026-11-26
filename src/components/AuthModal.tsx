import React, { useState } from 'react';
import { describeError } from '../lib/errors';
import { Github, Loader2, MessageSquare, UserPlus, X } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  initialMode: 'register' | 'login';
  onClose: () => void;
  onAuthenticate: (payload: {
    mode: 'register' | 'login';
    name: string;
    color: string;
    email: string;
    password: string;
    githubHandle?: string;
    discordHandle?: string;
  }) => Promise<void>;
}

const AVATAR_COLORS = ['#a88bfa', '#e8b353', '#34d399', '#60a5fa', '#f472b6'];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode,
  onClose,
  onAuthenticate,
}) => {
  const [mode, setMode] = useState<'register' | 'login'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [githubHandle, setGithubHandle] = useState('');
  const [discordHandle, setDiscordHandle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    setMode(initialMode);
    setError('');
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const cleanName = name.trim() || (mode === 'login' ? '' : 'Joris van Dijk');
      const cleanGithub = githubHandle
        .trim()
        .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
        .replace(/^@/, '')
        .replace(/\/+$/, '');
      const cleanDiscord = discordHandle.trim().replace(/^@/, '');

      await onAuthenticate({
        mode,
        name: cleanName,
        color: selectedColor,
        email: email.trim(),
        password,
        githubHandle: cleanGithub || undefined,
        discordHandle: cleanDiscord || undefined,
      });
      setPassword('');
      onClose();
    } catch (err) {
      setError(describeError(err, 'Inloggen is niet gelukt. Probeer het opnieuw.'));
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    'w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-[#1a1726] border border-slate-200 dark:border-white/[0.09] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#6a6b6c] focus:outline-none focus:ring-2 focus:ring-[#a88bfa]/60';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs forum-modal-overlay"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'register' ? 'Account aanmaken' : 'Inloggen'}
        className="w-full max-w-md bg-white dark:bg-[#13111c] forum-card-glow border border-slate-200 dark:border-white/[0.1] rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.07] flex items-center justify-between">
          <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white">
            {mode === 'register' ? 'Gratis account aanmaken' : 'Inloggen op Forum'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#1c1829] hover:bg-slate-200 dark:hover:bg-[#26272b] text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-slate-600 dark:text-[#9c9c9d]">
            {mode === 'register'
              ? 'Maak een account aan met e-mail en wachtwoord, kies een themakleur en koppel optioneel je GitHub of Discord.'
              : 'Log in met je e-mailadres en wachtwoord.'}
          </p>

          {isSupabaseConfigured && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  E-mailadres
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jij@voorbeeld.nl"
                  required
                  autoComplete="email"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Wachtwoord
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimaal 6 tekens"
                  required
                  minLength={6}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  className={inputClass}
                />
              </div>
            </>
          )}

          {(mode === 'register' || !isSupabaseConfigured) && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Weergavenaam
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Bijv. Bram Verhoeven"
                autoFocus={!isSupabaseConfigured}
                className={inputClass}
              />
            </div>
          )}

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Kies je profiel- & themakleur
                </label>
                <div className="flex items-center gap-2.5">
                  {AVATAR_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      aria-label={`Kies kleur ${color}`}
                      className={`w-8 h-8 rounded-lg transition-transform cursor-pointer ${
                        selectedColor === color
                          ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#13111c] ring-slate-900 dark:ring-white scale-105'
                          : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    GitHub (optioneel)
                  </label>
                  <div className="relative flex items-center">
                    <Github className="w-3.5 h-3.5 text-slate-400 dark:text-[#737376] absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      value={githubHandle}
                      onChange={(e) => setGithubHandle(e.target.value)}
                      placeholder="username"
                      className="w-full h-9 pl-8 pr-2.5 rounded-xl bg-slate-50 dark:bg-[#1a1726] border border-slate-200 dark:border-white/[0.09] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#6a6b6c] focus:outline-none focus:ring-2 focus:ring-[#a88bfa]/60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Discord (optioneel)
                  </label>
                  <div className="relative flex items-center">
                    <MessageSquare className="w-3.5 h-3.5 text-[#5865F2] dark:text-[#8ea1e1] absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      value={discordHandle}
                      onChange={(e) => setDiscordHandle(e.target.value)}
                      placeholder="naam#1234"
                      className="w-full h-9 pl-8 pr-2.5 rounded-xl bg-slate-50 dark:bg-[#1a1726] border border-slate-200 dark:border-white/[0.09] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#6a6b6c] focus:outline-none focus:ring-2 focus:ring-[#a88bfa]/60"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {error && (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400 rounded-lg bg-red-500/10 px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 px-4 rounded-xl bg-[#e8b353] hover:bg-[#f0be63] disabled:opacity-60 text-[#141008] text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            <span>
              {busy
                ? 'Even wachten...'
                : mode === 'register'
                  ? 'Account aanmaken & binnenstappen'
                  : 'Inloggen'}
            </span>
          </button>

          {!isSupabaseConfigured && (
            <p className="text-[11px] text-center text-slate-400 dark:text-[#716b88]">
              Demo-modus: Supabase is niet ingesteld. Data blijft alleen in deze browser.
            </p>
          )}

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'register' ? 'login' : 'register');
                setError('');
              }}
              className="text-xs font-medium text-violet-600 dark:text-[#a88bfa] hover:underline cursor-pointer"
            >
              {mode === 'register'
                ? 'Heb je al een account? Log hier in'
                : 'Nog geen account? Maak er gratis één aan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
