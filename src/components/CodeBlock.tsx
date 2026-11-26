import React, { useState } from 'react';
import { Check, Code2, Copy } from 'lucide-react';
import { CodeLanguage, CodeSnippet } from '../types/forum';

const LANGUAGE_LABELS: Record<CodeLanguage, string> = {
  tsx: 'React · TSX',
  vue: 'Vue 3 · SFC',
  ts: 'TypeScript',
  css: 'CSS / Tailwind',
  bash: 'Terminal',
};

interface Token {
  text: string;
  type: 'plain' | 'keyword' | 'string' | 'comment' | 'type' | 'number' | 'tag';
}

const KEYWORD_SET = new Set([
  'import',
  'from',
  'export',
  'default',
  'const',
  'let',
  'var',
  'function',
  'return',
  'if',
  'else',
  'type',
  'interface',
  'async',
  'await',
  'true',
  'false',
  'null',
  'undefined',
  'new',
  'script',
  'setup',
  'template',
  'style',
  'ref',
  'computed',
  'watch',
  'onMounted',
  'useState',
  'useEffect',
]);

function tokenizeLine(line: string): Token[] {
  const trimmed = line.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('<!--') || trimmed.startsWith('#')) {
    return [{ text: line, type: 'comment' }];
  }

  const tokens: Token[] = [];
  const regex =
    /('[^']*'|"[^"]*"|`[^`]*`|<\/?[A-Za-z][A-Za-z0-9-]*|\b[A-Z][A-Za-z0-9_]*\b|\b\d+(?:\.\d+)?\b|\b[a-z_][A-Za-z0-9_]*\b|\/\/.*$)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: line.slice(lastIndex, match.index), type: 'plain' });
    }
    const val = match[0];

    if (val.startsWith('//')) {
      tokens.push({ text: val, type: 'comment' });
    } else if (val.startsWith("'") || val.startsWith('"') || val.startsWith('`')) {
      tokens.push({ text: val, type: 'string' });
    } else if (val.startsWith('<')) {
      tokens.push({ text: val, type: 'tag' });
    } else if (KEYWORD_SET.has(val)) {
      tokens.push({ text: val, type: 'keyword' });
    } else if (/^[A-Z]/.test(val)) {
      tokens.push({ text: val, type: 'type' });
    } else if (/^\d/.test(val)) {
      tokens.push({ text: val, type: 'number' });
    } else {
      tokens.push({ text: val, type: 'plain' });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < line.length) {
    tokens.push({ text: line.slice(lastIndex), type: 'plain' });
  }

  return tokens;
}

const TOKEN_COLORS: Record<Token['type'], string> = {
  plain: 'text-slate-200',
  keyword: 'text-[#c4b5fd] font-medium',
  string: 'text-emerald-300',
  comment: 'text-[#6a6b6c] italic',
  type: 'text-[#e8b353]',
  number: 'text-sky-300',
  tag: 'text-pink-300',
};

export const CodeBlock: React.FC<{
  snippet: CodeSnippet;
  compact?: boolean;
}> = ({ snippet, compact = false }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(snippet.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const lines = snippet.code.split('\n');

  return (
    <div className="rounded-xl overflow-hidden border border-slate-300/80 dark:border-white/[0.09] bg-[#0e0c16] text-slate-100">
      {/* Code Header */}
      <div className="px-3.5 py-2 bg-[#141518] border-b border-white/[0.07] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Code2 className="w-3.5 h-3.5 text-[#a88bfa] shrink-0" />
          <span className="text-xs font-mono text-slate-300 truncate">
            {snippet.filename || LANGUAGE_LABELS[snippet.language]}
          </span>
          {snippet.filename && (
            <span className="text-[11px] text-[#7a7a7e] hidden sm:inline">
              · {LANGUAGE_LABELS[snippet.language]}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-[11px] font-medium text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-300">Gekopieerd</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Kopieer</span>
            </>
          )}
        </button>
      </div>

      {/* Highlighted Lines */}
      <div className={`overflow-x-auto ${compact ? 'max-h-[210px]' : 'max-h-[360px]'}`}>
        <pre className="p-3.5 text-xs leading-relaxed font-mono">
          <code>
            {lines.map((line, idx) => (
              <div key={idx} className="table-row">
                <span className="table-cell pr-4 text-right select-none text-[#57516d] tabular-nums w-7">
                  {idx + 1}
                </span>
                <span className="table-cell whitespace-pre">
                  {tokenizeLine(line).map((tok, tIdx) => (
                    <span key={tIdx} className={TOKEN_COLORS[tok.type]}>
                      {tok.text}
                    </span>
                  ))}
                  {line === '' ? ' ' : null}
                </span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
};
