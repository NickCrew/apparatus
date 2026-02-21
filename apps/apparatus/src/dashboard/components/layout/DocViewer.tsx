import { useEffect, useState } from 'react';
import { X, BookOpen, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { MarkdownContent } from '../ui/MarkdownContent';
import { cn } from '../ui/cn';

interface DocEntry {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  content: string;
  file: string;
  headings: string[];
}

interface DocViewerProps {
  docId: string | null;
  onClose: () => void;
}

export function DocViewer({ docId, onClose }: DocViewerProps) {
  const [doc, setDoc] = useState<DocEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!docId) {
      setDoc(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetch('/api/docs-index')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.text();
      })
      .then((text) => {
        try {
          const docs = JSON.parse(text) as DocEntry[];
          const found = docs.find((d) => d.id === docId);
          if (found) {
            setDoc(found);
          } else {
            setError('Document not found');
          }
        } catch (parseErr) {
          console.error('JSON parse error:', text.substring(0, 100));
          throw parseErr;
        }
      })
      .catch((err) => {
        console.error('Error loading doc:', err);
        setError('Failed to load document');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [docId]);

  if (!docId) {
    return null;
  }

  return (
    <div className={cn(
      'fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity z-50',
      docId ? 'opacity-100' : 'opacity-0 pointer-events-none'
    )} onClick={onClose}>
      <div className={cn(
        'absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-card border-l border-border shadow-2xl transition-transform flex flex-col',
        docId ? 'translate-x-0' : 'translate-x-full'
      )} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="h-14 border-b border-border flex items-center justify-between px-6 flex-shrink-0 bg-background/95 backdrop-blur-lg">
          <div className="flex items-center gap-3 min-w-0">
            <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              {loading ? (
                <div className="text-sm text-muted-foreground animate-pulse font-mono uppercase tracking-widest">Loading...</div>
              ) : doc ? (
                <div>
                  <h2 className="text-sm font-semibold text-neutral-100 truncate uppercase tracking-tight">{doc.title}</h2>
                  <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">{doc.category}</p>
                </div>
              ) : null}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-neutral-500 hover:text-neutral-100 hover:bg-neutral-900/70 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-card/50">
          {error && (
            <div className="p-8 flex items-start gap-3 bg-destructive/5 m-6 border border-destructive/20 rounded-sm">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-destructive">{error}</h3>
                <p className="text-sm text-destructive/70 mt-1">Please try again later or contact support if the issue persists.</p>
              </div>
            </div>
          )}

          {doc && (
            <div className="p-8">
              {/* Render markdown content with proper formatting */}
              <MarkdownContent content={doc.content} />

              {/* Metadata */}
              {doc.headings && doc.headings.length > 0 && (
                <div className="mt-12 pt-8 border-t border-border/50">
                  <h3 className="text-[11px] font-bold text-muted-foreground mb-4 uppercase tracking-widest font-mono">Document Outline</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {doc.headings.map((heading, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-primary/40" />
                        {heading}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

DocViewer.displayName = 'DocViewer';
