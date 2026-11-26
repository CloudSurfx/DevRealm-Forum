import React from 'react';
import { Download, FileText } from 'lucide-react';
import { CodeLanguage, TopicAttachment } from '../types/forum';
import { CodeBlock } from './CodeBlock';

const FENCE_LANGUAGES: Record<string, CodeLanguage> = {
  tsx: 'tsx', jsx: 'tsx', js: 'ts', javascript: 'ts', ts: 'ts', typescript: 'ts',
  vue: 'vue', css: 'css', scss: 'css', bash: 'bash', sh: 'bash', shell: 'bash',
};

function renderInlineFormatting(text: string): React.ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded-md bg-slate-200/80 dark:bg-white/[0.08] font-mono text-[12px] text-violet-700 dark:text-[#d6c8ff]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-slate-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function parseTableCells(row: string): string[] {
  return row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isSeparatorRow(line: string): boolean {
  const cleaned = line.trim();
  if (!cleaned.includes('|') || !cleaned.includes('-')) return false;
  return /^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/.test(cleaned) || /^\|(\s*:?-+:?\s*\|)+$/.test(cleaned);
}

export const RichTopicBody: React.FC<{
  body: string;
  attachments?: TopicAttachment[];
}> = ({ body, attachments }) => {
  const lines = body.split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Codeblok tussen ``` ... ```
    const fence = line.trim().match(/^```\s*([a-zA-Z0-9]*)\s*$/);
    if (fence) {
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1; // sluitende ```
      const lang = FENCE_LANGUAGES[fence[1].toLowerCase()] ?? 'ts';
      blocks.push(
        <div key={`code-${i}`} className="my-3 rounded-xl overflow-hidden border border-slate-200 dark:border-white/[0.08]">
          <CodeBlock snippet={{ language: lang, code: codeLines.join('\n') }} compact />
        </div>
      );
      continue;
    }

    // Check for Markdown table (header line with | followed by separator line)
    if (
      line.trim().startsWith('|') &&
      i + 1 < lines.length &&
      isSeparatorRow(lines[i + 1])
    ) {
      const headers = parseTableCells(line);
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(parseTableCells(lines[i]));
        i += 1;
      }

      blocks.push(
        <div
          key={`table-${i}`}
          className="my-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-white/[0.09] bg-slate-50/70 dark:bg-[#0e0f12]"
        >
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-100 dark:bg-[#191625] border-b border-slate-200 dark:border-white/[0.08]">
                {headers.map((h, hIdx) => (
                  <th
                    key={hIdx}
                    className="px-3.5 py-2.5 font-display font-semibold text-slate-900 dark:text-white whitespace-nowrap"
                  >
                    {renderInlineFormatting(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-white/[0.06]">
              {rows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="hover:bg-slate-100/60 dark:hover:bg-white/[0.02] transition-colors"
                >
                  {headers.map((_, cIdx) => (
                    <td
                      key={cIdx}
                      className="px-3.5 py-2.5 text-slate-700 dark:text-[#d6d6d8] tabular-nums"
                    >
                      {renderInlineFormatting(row[cIdx] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Bullet list block
    if (/^\s*[•\-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[•\-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[•\-*]\s+/, ''));
        i += 1;
      }
      blocks.push(
        <ul key={`list-${i}`} className="list-disc pl-5 space-y-1 text-sm text-slate-700 dark:text-[#d6d6d8]">
          {items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInlineFormatting(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    if (line.trim() === '') {
      i += 1;
      continue;
    }

    blocks.push(
      <p key={`p-${i}`} className="text-sm text-slate-700 dark:text-[#d6d6d8] leading-relaxed">
        {renderInlineFormatting(line)}
      </p>
    );
    i += 1;
  }

  return (
    <div className="space-y-3">
      {blocks}

      {attachments && attachments.length > 0 && (
        <div className="pt-2 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {attachments
              .filter((att) => att.kind === 'image')
              .map((att) => (
                <a
                  key={att.id}
                  href={att.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group block rounded-xl overflow-hidden border border-slate-200 dark:border-white/[0.09] bg-slate-100 dark:bg-[#181524]"
                >
                  <img
                    src={att.url}
                    alt={att.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-36 object-cover group-hover:scale-[1.02] transition-transform duration-200"
                  />
                  <div className="px-3 py-2 flex items-center justify-between text-xs text-slate-600 dark:text-[#9c9c9d]">
                    <span className="truncate font-medium">{att.name}</span>
                    <span className="font-mono tabular-nums shrink-0 ml-2">{att.sizeLabel}</span>
                  </div>
                </a>
              ))}
          </div>

          {attachments
            .filter((att) => att.kind === 'file')
            .map((att) => (
              <a
                key={att.id}
                href={att.url}
                download={att.name}
                className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#181524] hover:border-[#a88bfa]/50 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-4 h-4 text-[#a88bfa] shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                    {att.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#8b8b90] shrink-0">
                  <span className="font-mono tabular-nums">{att.sizeLabel}</span>
                  <Download className="w-3.5 h-3.5 text-violet-600 dark:text-[#a88bfa]" />
                </div>
              </a>
            ))}
        </div>
      )}
    </div>
  );
};
