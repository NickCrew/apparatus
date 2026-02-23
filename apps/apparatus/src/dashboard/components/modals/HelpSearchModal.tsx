import { useEffect, useState } from 'react';
import { BookOpen, Loader2 } from 'lucide-react';
import { searchDocs } from '../../utils/docSearch';
import { useDocViewer } from '../../providers/DocViewerProvider';
import { useSearchAnalytics } from '../../hooks/useSearchAnalytics';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";

interface DocResult {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  file: string;
  score: number;
  matchType: 'title' | 'content' | 'heading';
}

interface HelpSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectDoc?: (docId: string) => void;
}

function isHelpShortcut(event: KeyboardEvent): boolean {
  if (!event.metaKey && !event.ctrlKey) {
    return false;
  }

  const normalizedKey = event.key.toLowerCase();
  return normalizedKey === '?' || normalizedKey === '/' || event.code === 'Slash';
}

export function HelpSearchModal({ open, onOpenChange, onSelectDoc }: HelpSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DocResult[]>([]);
  const [allResults, setAllResults] = useState<DocResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const { openDoc } = useDocViewer();
  const { trackSearch } = useSearchAnalytics();

  useEffect(() => {
    const openHelpModal = () => onOpenChange(true);
    const handleHelpShortcut = (event: KeyboardEvent) => {
      if (!isHelpShortcut(event)) {
        return;
      }
      event.preventDefault();
      onOpenChange(true);
    };

    document.addEventListener('keydown', handleHelpShortcut, true);
    window.addEventListener('apparatus:open-help-modal', openHelpModal);
    return () => {
      document.removeEventListener('keydown', handleHelpShortcut, true);
      window.removeEventListener('apparatus:open-help-modal', openHelpModal);
    };
  }, [onOpenChange]);

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setQuery('');
      setSelectedCategory(null);
    }
  }, [open]);

  // Search docs on query change
  useEffect(() => {
    if (!query.trim()) {
      setAllResults([]);
      setResults([]);
      setCategories([]);
      setSelectedCategory(null);
      return;
    }

    setLoading(true);

    const searchTimer = setTimeout(() => {
      searchDocs(query)
        .then((found) => {
          const foundResults = found as DocResult[];
          setAllResults(foundResults);
          setResults(foundResults);

          // Track search analytics
          trackSearch(query, foundResults.length, 'help-modal');

          // Extract unique categories
          const uniqueCategories = Array.from(
            new Set(foundResults.map((r) => r.category))
          ).sort();
          setCategories(uniqueCategories);
        })
        .catch((err) => {
          console.error('Search error:', err);
          setAllResults([]);
          setResults([]);
          setCategories([]);
          trackSearch(query, 0, 'help-modal');
        })
        .finally(() => {
          setLoading(false);
        });
    }, 150); // Debounce search

    return () => clearTimeout(searchTimer);
  }, [query]);

  // Filter results by selected category
  useEffect(() => {
    if (selectedCategory) {
      setResults(allResults.filter((r) => r.category === selectedCategory));
    } else {
      setResults(allResults);
    }
  }, [selectedCategory, allResults]);

  const handleSelect = (result: DocResult) => {
    openDoc(result.id);
    onSelectDoc?.(result.id);
    onOpenChange(false);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Documentation search"
      description="Search and open dashboard documentation pages."
    >
      <CommandInput
        placeholder="Search documentation..."
        value={query}
        onValueChange={setQuery}
      />
      
      {/* Category filters */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-3 border-b border-neutral-700/80 bg-neutral-950">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 border rounded-[1px] transition-all ${
              selectedCategory === null
                ? 'bg-primary border-primary text-primary-foreground font-bold shadow-glow-primary'
                : 'bg-neutral-900/85 border-neutral-700 text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800 hover:border-neutral-500'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 border rounded-[1px] transition-all ${
                selectedCategory === cat
                  ? 'bg-primary border-primary text-primary-foreground font-bold shadow-glow-primary'
                  : 'bg-neutral-900/85 border-neutral-700 text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800 hover:border-neutral-500'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <CommandList className="max-h-[60vh]">
        {loading && (
          <div className="flex items-center justify-center gap-3 py-12 text-muted-foreground font-mono text-xs uppercase tracking-widest">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Retrieving Knowledge Base...</span>
          </div>
        )}

        {query.trim() && (
          <CommandEmpty className="py-12 text-center">
              <p className="text-sm text-neutral-300">No documentation found for "{query}"</p>
              <p className="text-xs text-muted-foreground mt-2 font-mono uppercase tracking-widest">Try searching for: chaos, scenarios, defense</p>
          </CommandEmpty>
        )}

        {!loading && results.length > 0 && (
          <CommandGroup heading={`Knowledge Base (${results.length} result${results.length !== 1 ? 's' : ''})`}>
            {results.map((result) => (
              <CommandItem
                key={result.id}
                value={`${result.id} ${result.title} ${result.category} ${query}`}
                onSelect={() => handleSelect(result)}
                className="flex flex-col items-start gap-1 py-4 px-4 cursor-pointer"
              >
                <div className="flex items-center gap-2 w-full">
                  <BookOpen className="h-4 w-4 flex-shrink-0 text-primary/70" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-neutral-100 uppercase tracking-tight">{result.title}</div>
                    <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">{result.category}</div>
                  </div>
                  {result.matchType === 'title' && (
                    <span className="text-[9px] font-mono bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-[1px] uppercase tracking-tighter">
                      Title match
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-400 line-clamp-2 w-full mt-1 leading-relaxed">{result.excerpt}</p>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!loading && !query && (
          <div className="py-12 text-center text-muted-foreground border-t border-neutral-700/40 bg-neutral-950">
            <p className="text-xs font-mono uppercase tracking-widest">Awaiting search query...</p>
            <div className="mt-6 space-y-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-600">Common Subjects</p>
              <div className="flex justify-center gap-2 flex-wrap px-8">
                {['chaos', 'scenarios', 'defense', 'webhooks', 'architecture'].map(
                  (suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setQuery(suggestion)}
                      className="px-2 py-1 text-[10px] font-mono uppercase border border-neutral-700 bg-neutral-900/85 text-neutral-300 hover:text-primary hover:border-primary/50 hover:bg-neutral-800 transition-all rounded-[1px]"
                    >
                      {suggestion}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </CommandList>
      
      <div className="border-t border-neutral-700/50 px-4 py-2 text-[10px] font-mono text-neutral-500 flex items-center justify-between uppercase tracking-widest bg-neutral-950">
        <div className="flex gap-4">
          <span><span className="text-neutral-400">↑↓</span> Navigate</span>
          <span><span className="text-neutral-400">Enter</span> Select</span>
          <span><span className="text-neutral-400">Esc</span> Close</span>
        </div>
      </div>
    </CommandDialog>
  );
}
