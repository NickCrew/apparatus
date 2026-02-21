/**
 * Document search utility with fuzzy matching and scoring.
 * Loads docs index and provides search capabilities.
 */

interface DocEntry {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  content: string;
  file: string;
  headings: string[];
}

interface SearchResult extends DocEntry {
  score: number;
  matchType: 'title' | 'content' | 'heading';
}

let docsIndex: DocEntry[] | null = null;

/**
 * Load docs index from JSON file via API endpoint
 */
export async function loadDocsIndex(): Promise<DocEntry[]> {
  if (docsIndex !== null) return docsIndex;

  try {
    const response = await fetch('/api/docs-index');
    if (!response.ok) throw new Error('Failed to load docs index');
    docsIndex = await response.json();
    return docsIndex as DocEntry[];
  } catch (error) {
    console.error('Failed to load docs index:', error);
    return [];
  }
}

/**
 * Fuzzy match score: returns score 0-100 or 0 if no match
 * Higher score = better match
 */
function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  // Exact match
  if (t === q) return 100;

  // Starts with query
  if (t.startsWith(q)) return 80;

  // Contains query as word boundary
  if (t.match(new RegExp(`\\b${q}`, 'i'))) return 60;

  // Contains query substring
  if (t.includes(q)) return 40;

  // Fuzzy character matching
  let matched = 0;
  let qIdx = 0;
  for (let i = 0; i < t.length && qIdx < q.length; i++) {
    if (t[i] === q[qIdx]) {
      matched++;
      qIdx++;
    }
  }

  if (qIdx === q.length) {
    // All query chars found, score based on how spread out they are
    return Math.max(10, Math.round((matched / t.length) * 30));
  }

  return 0;
}

/**
 * Search docs by query string
 */
export async function searchDocs(query: string): Promise<SearchResult[]> {
  const index = await loadDocsIndex() || [];

  if (!query.trim()) {
    return index.map((doc) => ({ ...doc, score: 0, matchType: 'title' as const }));
  }

  const results: SearchResult[] = [];

  for (const doc of index) {
    let score = 0;
    let matchType: 'title' | 'content' | 'heading' = 'content';

    // Score title matches (highest priority)
    const titleScore = fuzzyScore(query, doc.title);
    if (titleScore > 0) {
      score = Math.max(score, titleScore + 30); // Bonus for title match
      matchType = 'title';
    }

    // Score heading matches
    for (const heading of doc.headings) {
      const headingScore = fuzzyScore(query, heading);
      if (headingScore > 0) {
        score = Math.max(score, headingScore + 15);
        matchType = 'heading';
      }
    }

    // Score content matches (lowest priority)
    const contentScore = fuzzyScore(query, doc.excerpt);
    if (contentScore > 0 && score === 0) {
      score = contentScore;
      matchType = 'content';
    }

    if (score > 0) {
      results.push({ ...doc, score, matchType });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  // Return top 10 results
  return results.slice(0, 10);
}

/**
 * Get all available doc categories
 */
export async function getDocCategories(): Promise<string[]> {
  const index = await loadDocsIndex();
  const categories = new Set(index.map((doc) => doc.category));
  return Array.from(categories).sort();
}
