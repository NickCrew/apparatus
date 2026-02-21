import { useEffect, useState } from 'react';
import { BookOpen, AlertCircle } from 'lucide-react';
import { CommandGroup, CommandItem } from '../ui/command';
import { searchDocs } from '../../utils/docSearch';
import { useSearchAnalytics } from '../../hooks/useSearchAnalytics';

interface HelpResult {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  matchType: 'title' | 'content' | 'heading';
  score: number;
}

interface HelpResultsProps {
  query: string;
  onSelect?: (docId: string) => void;
}

export function HelpResults({ query, onSelect }: HelpResultsProps) {
  const [results, setResults] = useState<HelpResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { trackSearch } = useSearchAnalytics();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    searchDocs(query)
      .then((found) => {
        const foundResults = found as HelpResult[];
        setResults(foundResults);
        // Track search from command palette
        trackSearch(query, foundResults.length, 'command-palette');
      })
      .catch((err) => {
        console.error('Search error:', err);
        setError('Failed to search documentation');
        trackSearch(query, 0, 'command-palette');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [query]);

  if (!query.trim()) {
    return null;
  }

  if (loading) {
    return (
      <CommandGroup heading="Help">
        <div className="px-2 py-2 text-sm text-muted-foreground">Searching documentation...</div>
      </CommandGroup>
    );
  }

  if (error) {
    return (
      <CommandGroup heading="Help">
        <div className="px-2 py-2 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      </CommandGroup>
    );
  }

  if (results.length === 0) {
    return (
      <CommandGroup heading="Help">
        <div className="px-2 py-2 text-sm text-muted-foreground">
          No documentation found for "{query}"
        </div>
      </CommandGroup>
    );
  }

  return (
    <CommandGroup heading={`Help (${results.length} result${results.length !== 1 ? 's' : ''})`}>
      {results.map((result) => (
        <CommandItem
          key={result.id}
          onSelect={() => {
            onSelect?.(result.id);
          }}
          className="flex flex-col items-start gap-1 py-3"
        >
          <div className="flex items-center gap-2 w-full">
            <BookOpen className="h-4 w-4 flex-shrink-0 text-blue-500" />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{result.title}</div>
              <div className="text-xs text-muted-foreground">{result.category}</div>
            </div>
            {result.matchType === 'title' && (
              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 px-2 py-0.5 rounded">
                Title match
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 w-full">{result.excerpt}</p>
        </CommandItem>
      ))}
    </CommandGroup>
  );
}
