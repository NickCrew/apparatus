import { useEffect, useMemo, useRef } from 'react';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import { marked } from 'marked';
import 'highlight.js/styles/github-dark.css';
import { cn } from './cn';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

const LANGUAGE_ALIASES: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  html: 'xml',
};

function registerLanguage(name: string, language: Parameters<typeof hljs.registerLanguage>[1]) {
  if (!hljs.getLanguage(name)) {
    hljs.registerLanguage(name, language);
  }
}

registerLanguage('bash', bash);
registerLanguage('javascript', javascript);
registerLanguage('json', json);
registerLanguage('markdown', markdown);
registerLanguage('python', python);
registerLanguage('sql', sql);
registerLanguage('typescript', typescript);
registerLanguage('xml', xml);
registerLanguage('yaml', yaml);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeLanguage(raw?: string): string {
  if (!raw) return '';
  const normalized = raw.trim().toLowerCase();
  return LANGUAGE_ALIASES[normalized] ?? normalized;
}

function fallbackCopyToClipboard(text: string): boolean {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}

/**
 * Renders markdown content with proper styling
 * Uses marked parser and Tailwind classes for formatting
 */
export function MarkdownContent({ content, className }: MarkdownContentProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const html = useMemo(() => {
    try {
      const renderer = new marked.Renderer();

      renderer.code = (token) => {
        const source = token.text ?? '';
        const normalizedLanguage = normalizeLanguage(token.lang);
        const languageExists = normalizedLanguage && hljs.getLanguage(normalizedLanguage);
        const displayLanguage = languageExists ? normalizedLanguage : 'text';
        const highlightedCode = languageExists
          ? hljs.highlight(source, { language: normalizedLanguage, ignoreIllegals: true }).value
          : escapeHtml(source);
        const encodedSource = encodeURIComponent(source);

        return [
          '<div class="md-code-block not-prose my-4 overflow-hidden rounded border border-neutral-800 bg-neutral-950">',
          '  <div class="flex items-center justify-between border-b border-neutral-800 bg-neutral-900/80 px-3 py-2">',
          `    <span class="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">${escapeHtml(displayLanguage)}</span>`,
          '    <button type="button" data-copy-code="' + encodedSource + '" class="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-300 transition-colors hover:border-neutral-500 hover:text-neutral-100">',
          '      Copy',
          '    </button>',
          '  </div>',
          '  <pre class="m-0 overflow-x-auto p-4"><code class="hljs language-' + escapeHtml(displayLanguage) + '">' + highlightedCode + '</code></pre>',
          '</div>',
        ].join('\n');
      };

      return marked.parse(content, {
        breaks: true,
        gfm: true,
        renderer,
      }) as string;
    } catch (error) {
      console.error('Markdown parse error:', error);
      return '<p>Error parsing content</p>';
    }
  }, [content]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const onClick = async (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest<HTMLButtonElement>('button[data-copy-code]');
      if (!button || !container.contains(button)) {
        return;
      }

      const encoded = button.getAttribute('data-copy-code');
      if (!encoded) {
        return;
      }

      const source = decodeURIComponent(encoded);
      const previousLabel = button.textContent || 'Copy';

      let copied = false;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(source);
          copied = true;
        }
      } catch {
        copied = false;
      }

      if (!copied) {
        copied = fallbackCopyToClipboard(source);
      }

      button.textContent = copied ? 'Copied' : 'Failed';
      button.disabled = true;
      window.setTimeout(() => {
        button.textContent = previousLabel;
        button.disabled = false;
      }, 1500);
    };

    container.addEventListener('click', onClick);
    return () => {
      container.removeEventListener('click', onClick);
    };
  }, [html]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'prose prose-invert max-w-none',
        'space-y-4 text-neutral-300',
        '[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-neutral-100 [&_h1]:mt-6 [&_h1]:mb-3',
        '[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-neutral-100 [&_h2]:mt-5 [&_h2]:mb-2',
        '[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-neutral-200 [&_h3]:mt-4 [&_h3]:mb-2',
        '[&_h4]:text-base [&_h4]:font-semibold [&_h4]:text-neutral-200 [&_h4]:mt-3 [&_h4]:mb-1',
        '[&_p]:leading-relaxed [&_p]:text-neutral-300',
        '[&_a]:text-blue-400 [&_a]:hover:text-blue-300 [&_a]:underline',
        '[&_code]:bg-neutral-950 [&_code]:text-neutral-200 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-sm',
        '[&_pre]:bg-neutral-950 [&_pre]:border [&_pre]:border-neutral-800 [&_pre]:rounded [&_pre]:p-4 [&_pre]:overflow-x-auto',
        '[&_pre_code]:text-neutral-300 [&_pre_code]:text-sm [&_pre_code]:font-mono [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:rounded-none',
        '[&_ul]:list-disc [&_ul]:ml-5 [&_ul]:space-y-1',
        '[&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:space-y-1',
        '[&_li]:text-neutral-300',
        '[&_blockquote]:border-l-4 [&_blockquote]:border-neutral-700 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-neutral-400',
        '[&_table]:w-full [&_table]:border-collapse',
        '[&_table_th]:text-left [&_table_th]:bg-neutral-900 [&_table_th]:text-neutral-200 [&_table_th]:font-semibold [&_table_th]:px-3 [&_table_th]:py-2 [&_table_th]:border [&_table_th]:border-neutral-700',
        '[&_table_td]:px-3 [&_table_td]:py-2 [&_table_td]:border [&_table_td]:border-neutral-800 [&_table_td]:text-neutral-300',
        '[&_.hljs]:bg-transparent [&_.hljs]:p-0',
        '[&_hr]:border-neutral-800 [&_hr]:my-6',
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

MarkdownContent.displayName = 'MarkdownContent';
