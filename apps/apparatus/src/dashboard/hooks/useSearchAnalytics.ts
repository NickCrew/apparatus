import { useCallback } from 'react';

export interface SearchAnalytics {
  query: string;
  timestamp: number;
  resultsFound: number;
  category?: string;
  source: 'command-palette' | 'help-modal';
  viewedDocId?: string;
  viewDuration?: number; // ms
}

const ANALYTICS_KEY = 'apparatus:search-analytics';
const MAX_ENTRIES = 100;

/**
 * Hook for tracking help search analytics
 * Stores search history in localStorage with configurable size limit
 */
export function useSearchAnalytics() {
  const trackSearch = useCallback(
    (query: string, resultsFound: number, source: 'command-palette' | 'help-modal', category?: string) => {
      try {
        const current = JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '[]') as SearchAnalytics[];
        const newEntry: SearchAnalytics = {
          query,
          timestamp: Date.now(),
          resultsFound,
          category,
          source,
        };

        // Keep only the most recent MAX_ENTRIES
        const updated = [newEntry, ...current].slice(0, MAX_ENTRIES);
        localStorage.setItem(ANALYTICS_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn('Failed to track search analytics:', err);
      }
    },
    []
  );

  const trackDocView = useCallback((docId: string, duration: number) => {
    try {
      const current = JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '[]') as SearchAnalytics[];
      if (current.length > 0) {
        // Update the most recent entry with the viewed doc
        current[0].viewedDocId = docId;
        current[0].viewDuration = duration;
        localStorage.setItem(ANALYTICS_KEY, JSON.stringify(current));
      }
    } catch (err) {
      console.warn('Failed to track doc view:', err);
    }
  }, []);

  const getAnalytics = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '[]') as SearchAnalytics[];
    } catch {
      return [];
    }
  }, []);

  const getStats = useCallback(() => {
    const analytics = getAnalytics();
    if (analytics.length === 0) {
      return {
        totalSearches: 0,
        avgResultsFound: 0,
        emptySearchResults: 0,
        emptySearchRate: 0,
        topQueries: [],
        topCategories: [],
        sourceBreakdown: { 'command-palette': 0, 'help-modal': 0 },
        avgViewDuration: 0,
      };
    }

    const totalSearches = analytics.length;
    const emptySearchResults = analytics.filter((a) => a.resultsFound === 0).length;
    const avgResultsFound =
      analytics.reduce((sum, a) => sum + a.resultsFound, 0) / totalSearches;

    // Top queries
    const queryMap = new Map<string, number>();
    analytics.forEach((a) => {
      queryMap.set(a.query, (queryMap.get(a.query) || 0) + 1);
    });
    const topQueries = Array.from(queryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([query, count]) => ({ query, count }));

    // Top categories
    const categoryMap = new Map<string, number>();
    analytics.forEach((a) => {
      if (a.category) {
        categoryMap.set(a.category, (categoryMap.get(a.category) || 0) + 1);
      }
    });
    const topCategories = Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count }));

    // Source breakdown
    const sourceBreakdown = {
      'command-palette': analytics.filter((a) => a.source === 'command-palette').length,
      'help-modal': analytics.filter((a) => a.source === 'help-modal').length,
    };

    // Avg view duration
    const viewedDocs = analytics.filter((a) => a.viewDuration);
    const avgViewDuration =
      viewedDocs.length > 0
        ? viewedDocs.reduce((sum, a) => sum + (a.viewDuration || 0), 0) / viewedDocs.length
        : 0;

    return {
      totalSearches,
      avgResultsFound: Math.round(avgResultsFound * 10) / 10,
      emptySearchResults,
      emptySearchRate: Math.round((emptySearchResults / totalSearches) * 100),
      topQueries,
      topCategories,
      sourceBreakdown,
      avgViewDuration: Math.round(avgViewDuration),
    };
  }, [getAnalytics]);

  const clearAnalytics = useCallback(() => {
    try {
      localStorage.removeItem(ANALYTICS_KEY);
    } catch (err) {
      console.warn('Failed to clear analytics:', err);
    }
  }, []);

  return {
    trackSearch,
    trackDocView,
    getAnalytics,
    getStats,
    clearAnalytics,
  };
}
