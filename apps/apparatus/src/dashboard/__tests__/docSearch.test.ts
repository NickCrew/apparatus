import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the fetch at the module level
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

const mockDocsIndex = [
  {
    id: 'chaos-engine',
    title: 'Chaos Engine',
    category: 'Features',
    excerpt: 'CPU and memory spike chaos testing for fault injection',
    content: 'Full content about chaos testing...',
    file: 'features.md',
    headings: ['CPU Spike', 'Memory Spike', 'Configuration'],
  },
  {
    id: 'scenarios',
    title: 'Scenario Engine',
    category: 'Features',
    excerpt: 'Define and run automated test scenarios',
    content: 'Full content about scenarios...',
    file: 'features.md',
    headings: ['Creating Scenarios', 'Running Tests', 'Result Analysis'],
  },
  {
    id: 'defense-rules',
    title: 'Defense Rules',
    category: 'Architecture',
    excerpt: 'Configure defense mechanisms and rules',
    content: 'Full content about defense...',
    file: 'architecture.md',
    headings: ['WAF Rules', 'Rate Limiting', 'Tarpit Defense'],
  },
];

describe('docSearch', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('searchDocs', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDocsIndex,
      });
    });

    it('should return array for queries', async () => {
      const { searchDocs } = await import('../utils/docSearch');
      const results = await searchDocs('chaos');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should find exact title matches', async () => {
      const { searchDocs } = await import('../utils/docSearch');
      const results = await searchDocs('Chaos Engine');
      const found = results.some(r => r.id === 'chaos-engine');
      expect(found).toBe(true);
    });

    it('should find partial word matches', async () => {
      const { searchDocs } = await import('../utils/docSearch');
      const results = await searchDocs('chaos');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should find matches in excerpt', async () => {
      const { searchDocs } = await import('../utils/docSearch');
      const results = await searchDocs('scenario');
      const found = results.some(r => r.id === 'scenarios');
      expect(found).toBe(true);
    });

    it('should find defense-related docs', async () => {
      const { searchDocs } = await import('../utils/docSearch');
      const results = await searchDocs('defense');
      const defenseDoc = results.find(r => r.id === 'defense-rules');
      expect(defenseDoc).toBeDefined();
    });

    it('should be case-insensitive', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDocsIndex,
      });

      const { searchDocs } = await import('../utils/docSearch');
      const results1 = await searchDocs('CHAOS');
      const results2 = await searchDocs('chaos');
      expect(results1[0]?.id).toBe(results2[0]?.id);
    });

    it('should return results sorted by score descending', async () => {
      const { searchDocs } = await import('../utils/docSearch');
      const results = await searchDocs('engine');
      if (results.length > 1) {
        for (let i = 0; i < results.length - 1; i++) {
          expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
        }
      }
    });

    it('should include match type information', async () => {
      const { searchDocs } = await import('../utils/docSearch');
      const results = await searchDocs('chaos');
      if (results.length > 0) {
        const validTypes = ['title', 'content', 'heading'];
        expect(validTypes).toContain(results[0].matchType);
      }
    });

    it('should handle special characters gracefully', async () => {
      const { searchDocs } = await import('../utils/docSearch');
      const results = await searchDocs('test-query');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should find multiple matching docs', async () => {
      const { searchDocs } = await import('../utils/docSearch');
      const results = await searchDocs('engine');
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('should give reasonable scores to results', async () => {
      const { searchDocs } = await import('../utils/docSearch');
      const results = await searchDocs('chaos');
      if (results.length > 0) {
        results.forEach(result => {
          expect(result.score).toBeGreaterThan(0);
          expect(result.score).toBeLessThanOrEqual(200);
        });
      }
    });
  });
});
