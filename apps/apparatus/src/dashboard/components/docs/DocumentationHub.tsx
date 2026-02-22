import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, FileText, ListTree, Search } from 'lucide-react';
import { loadDocsIndex } from '../../utils/docSearch';
import { MarkdownContent } from '../ui/MarkdownContent';
import { Button } from '../ui/Button';
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

const NON_PUBLIC_CATEGORY = 'other';

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function isPublicDoc(doc: DocEntry): boolean {
  return doc.category.trim().toLowerCase() !== NON_PUBLIC_CATEGORY;
}

export function DocumentationHub() {
  const navigate = useNavigate();
  const { docId } = useParams<{ docId: string }>();
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeHeading, setActiveHeading] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    loadDocsIndex()
      .then((loaded) => {
        setDocs((loaded as DocEntry[]).filter(isPublicDoc));
        setError(null);
      })
      .catch((err) => {
        console.error('Failed to load docs for hub:', err);
        setError('Failed to load documentation index');
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredDocs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return [...docs].sort((a, b) => a.title.localeCompare(b.title));
    }

    return docs
      .filter((doc) =>
        [doc.title, doc.category, doc.excerpt, doc.content].some((field) =>
          field.toLowerCase().includes(query)
        )
      )
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [docs, search]);

  const groupedDocs = useMemo(() => {
    const byCategory = new Map<string, DocEntry[]>();
    for (const doc of filteredDocs) {
      const existing = byCategory.get(doc.category) ?? [];
      existing.push(doc);
      byCategory.set(doc.category, existing);
    }

    return Array.from(byCategory.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([category, entries]) => ({
        category,
        entries: entries.sort((a, b) => a.title.localeCompare(b.title)),
      }));
  }, [filteredDocs]);

  const selectedDoc = useMemo(() => {
    if (!docId || docs.length === 0) return null;
    return docs.find((doc) => doc.id === docId) ?? null;
  }, [docs, docId]);

  const isHubPage = !docId;

  useEffect(() => {
    if (!docId) return;
    if (!loading && !selectedDoc) {
      navigate('/docs', { replace: true });
    }
  }, [docId, loading, selectedDoc, navigate]);

  useEffect(() => {
    setActiveHeading(null);
    contentRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [selectedDoc?.id]);

  useEffect(() => {
    if (!selectedDoc) return;

    const container = contentRef.current;
    if (!container) return;

    const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4'));
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length > 0) {
          const text = visible[0].target.textContent?.trim();
          if (text) {
            setActiveHeading(text);
          }
        }
      },
      {
        root: container,
        rootMargin: '-15% 0px -70% 0px',
        threshold: [0, 0.25, 0.5, 1],
      }
    );

    for (const heading of headings) {
      observer.observe(heading);
    }

    return () => observer.disconnect();
  }, [selectedDoc?.id]);

  const selectHeading = (heading: string) => {
    const container = contentRef.current;
    if (!container) return;

    const wanted = normalizeText(heading);
    const node = Array.from(container.querySelectorAll('h1, h2, h3, h4')).find(
      (candidate) => normalizeText(candidate.textContent ?? '') === wanted
    );

    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveHeading(heading);
    }
  };

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100 overflow-hidden">
      <aside className="w-[22rem] border-r border-neutral-800/60 bg-neutral-950/95 flex flex-col">
        <div className="px-4 py-4 border-b border-neutral-800/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <h1 className="text-sm font-bold tracking-wide uppercase">Documentation Hub</h1>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/')}
              className="h-7 px-2 text-[10px]"
            >
              <ArrowLeft className="h-3 w-3 mr-1" />
              Dashboard
            </Button>
          </div>
          <p className="text-xs text-neutral-500">
            Browse large documentation files with quick section navigation.
          </p>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-600" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search docs..."
              className="h-8 w-full rounded-sm border border-neutral-700 bg-neutral-900/70 pl-8 pr-2 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
            <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-2">
              Documents ({filteredDocs.length})
            </div>

            {!loading && groupedDocs.length === 0 && (
              <div className="text-xs text-neutral-500 py-4">No documents match your search.</div>
            )}

            {groupedDocs.map((group) => (
              <div key={group.category} className="mb-4">
                <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-1.5">
                  {group.category}
                </div>
                <div className="space-y-1">
                  {group.entries.map((doc) => {
                    const active = selectedDoc?.id === doc.id;
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => navigate(`/docs/${doc.id}`)}
                        className={cn(
                          'w-full rounded-sm border px-3 py-3 min-h-[72px] text-left transition-colors',
                          active
                            ? 'border-primary/40 bg-primary/10'
                            : 'border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900/70 hover:border-neutral-700'
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <FileText className="h-3.5 w-3.5 mt-0.5 text-neutral-500" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-neutral-100 line-clamp-1">{doc.title}</div>
                            <div className="text-xs text-neutral-500 mt-1 line-clamp-1">
                              {doc.excerpt}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

        <div className="h-60 border-t border-neutral-800/60 px-3 py-3 overflow-y-auto">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-2">
            <ListTree className="h-3 w-3" />
            {isHubPage ? 'Quick Links' : 'Outline'}
          </div>

          {isHubPage && filteredDocs.length === 0 && (
            <div className="text-xs text-neutral-500">No public docs available.</div>
          )}

          {isHubPage && filteredDocs.length > 0 && (
            <div className="space-y-1">
              {filteredDocs.slice(0, 14).map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => navigate(`/docs/${doc.id}`)}
                  className="w-full text-left text-xs rounded-sm px-2 py-1 border border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60 transition-colors"
                >
                  {doc.title}
                </button>
              ))}
            </div>
          )}

          {!isHubPage && !selectedDoc && <div className="text-xs text-neutral-500">Select a document.</div>}

          {!isHubPage && selectedDoc && selectedDoc.headings.length === 0 && (
            <div className="text-xs text-neutral-500">No sections detected.</div>
          )}

          {!isHubPage && selectedDoc && selectedDoc.headings.length > 0 && (
            <div className="space-y-1">
              {selectedDoc.headings.map((heading) => {
                const isActive = activeHeading !== null && normalizeText(activeHeading) === normalizeText(heading);
                  return (
                    <button
                      key={heading}
                      type="button"
                      onClick={() => selectHeading(heading)}
                      className={cn(
                        'w-full text-left text-xs rounded-sm px-2 py-1 border transition-colors',
                        isActive
                          ? 'border-primary/40 bg-primary/10 text-primary-200'
                          : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
                      )}
                    >
                      {heading}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <div className="h-14 border-b border-neutral-800/60 px-6 flex items-center justify-between bg-neutral-950/80">
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-600">
              {selectedDoc?.category ?? 'Documentation'}
            </div>
            <div className="text-sm font-semibold text-neutral-100 truncate">
              {selectedDoc?.title ?? 'Apparatus Documentation Hub'}
            </div>
          </div>
          {selectedDoc && (
            <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 truncate max-w-[22rem]">
              {selectedDoc.file}
            </div>
          )}
        </div>

        <div ref={contentRef} className="flex-1 overflow-y-auto px-8 py-6">
          {loading && <div className="text-sm text-neutral-500">Loading documentation…</div>}
          {error && !loading && <div className="text-sm text-danger">{error}</div>}
          {!loading && !error && !selectedDoc && (
            <div className="max-w-5xl space-y-8">
              <section className="space-y-2">
                <h2 className="text-2xl font-semibold text-neutral-100">Apparatus Documentation Hub</h2>
                <p className="text-sm text-neutral-400">
                  Browse public documentation by category and jump directly to the page you need.
                </p>
              </section>

              {groupedDocs.length === 0 && (
                <div className="text-sm text-neutral-500">No public documentation available.</div>
              )}

              {groupedDocs.map((group) => (
                <section key={group.category} className="space-y-3">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-neutral-500">
                    {group.category}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
                    {group.entries.map((doc) => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => navigate(`/docs/${doc.id}`)}
                        className="rounded-sm border border-neutral-800 bg-neutral-900/50 hover:border-neutral-700 hover:bg-neutral-900/80 transition-colors px-4 py-4 min-h-[112px] text-left flex items-center"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="text-base font-medium text-neutral-100 line-clamp-1">{doc.title}</div>
                          <div className="text-sm text-neutral-400 line-clamp-1">{doc.excerpt}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
          {!loading && !error && selectedDoc && (
            <div className="max-w-4xl">
              <MarkdownContent content={selectedDoc.content} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
