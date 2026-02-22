#!/usr/bin/env node

/**
 * Generates a searchable JSON index from markdown documentation files.
 * Output: apps/apparatus/src/dashboard/public/docs-index.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(__dirname, '../docs');
const outputDir = path.join(__dirname, '../apps/apparatus/src/dashboard/public');
const outputFile = path.join(outputDir, 'docs-index.json');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const categoryMap = {
  'features.md': 'Features',
  'architecture.md': 'Architecture',
  'quick-reference.md': 'Quick Reference',
  'integration-guide.md': 'Integration',
  'tutorial-autopilot.md': 'Tutorials',
  'tutorial-defense-rules.md': 'Tutorials',
  'tutorial-dashboard.md': 'Tutorials',
  'tutorial-scenarios.md': 'Tutorials',
  'tutorial-chaos-engineering.md': 'Tutorials',
  'tutorial-monitoring.md': 'Tutorials',
  'tutorial-cli.md': 'Tutorials',
  'tutorial-webhooks.md': 'Tutorials',
  'DOCUMENTATION_ROADMAP.md': 'Reference',
};

/**
 * Extract title from markdown (first H1 or filename)
 */
function extractTitle(content, filename) {
  const h1Match = content.match(/^# (.+)$/m);
  if (h1Match) return h1Match[1];
  return filename.replace('.md', '').replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Extract first 150 chars as excerpt
 */
function extractExcerpt(content) {
  const text = content
    .replace(/^#+\s+.+$/gm, '') // Remove headings
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Convert links to text
    .replace(/[*_`]/g, '') // Remove markdown formatting
    .trim();
  return text.substring(0, 150).trim() + (text.length > 150 ? '...' : '');
}

/**
 * Extract all headings (for search navigation)
 */
function extractHeadings(content) {
  const headings = [];
  const headingMatches = content.matchAll(/^#+\s+(.+)$/gm);
  for (const match of headingMatches) {
    headings.push(match[1]);
  }
  return headings.slice(0, 10); // Limit to 10 headings
}

/**
 * Generate unique ID from title
 */
function generateId(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const index = [];

// Process all markdown files
const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'));

files.forEach(filename => {
  const filepath = path.join(docsDir, filename);
  const content = fs.readFileSync(filepath, 'utf-8');

  const title = extractTitle(content, filename);
  const id = generateId(title);
  const category = categoryMap[filename] || 'Documentation';
  const excerpt = extractExcerpt(content);
  const headings = extractHeadings(content);

  index.push({
    id,
    title,
    category,
    excerpt,
    content,
    file: filename,
    headings,
  });

  console.log(`✓ Indexed: ${title}`);
});

// Add README
const readmePath = path.join(__dirname, '../README.md');
if (fs.existsSync(readmePath)) {
  const content = fs.readFileSync(readmePath, 'utf-8');
  const title = extractTitle(content, 'README.md');
  const id = generateId(title);

  index.push({
    id,
    title,
    category: 'Getting Started',
    excerpt: extractExcerpt(content),
    content,
    file: 'README.md',
    headings: extractHeadings(content),
  });

  console.log(`✓ Indexed: ${title}`);
}

// Write index file
fs.writeFileSync(outputFile, JSON.stringify(index, null, 2), 'utf-8');

const sizeKb = (fs.statSync(outputFile).size / 1024).toFixed(2);
console.log(`\n✅ Generated docs index: ${outputFile} (${sizeKb} KB)`);
console.log(`📚 Total entries: ${index.length}`);
