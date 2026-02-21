import { useMemo } from 'react';
import { marked } from 'marked';
import { cn } from './cn';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/**
 * Renders markdown content with proper styling
 * Uses marked parser and Tailwind classes for formatting
 */
export function MarkdownContent({ content, className }: MarkdownContentProps) {
  const html = useMemo(() => {
    try {
      return marked(content, {
        breaks: true,
        gfm: true,
      });
    } catch (error) {
      console.error('Markdown parse error:', error);
      return '<p>Error parsing content</p>';
    }
  }, [content]);

  return (
    <div
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
        '[&_hr]:border-neutral-800 [&_hr]:my-6',
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

MarkdownContent.displayName = 'MarkdownContent';
