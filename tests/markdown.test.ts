import { describe, it, expect } from 'vitest';
import { parseMarkdown, extractHeadings } from '../src/markdown.js';

describe('parseMarkdown', () => {
  it('should convert basic markdown to HTML', () => {
    const result = parseMarkdown('# Hello World');
    expect(result.html).toContain('<h1');
    expect(result.html).toContain('Hello World');
  });

  it('should extract headings', () => {
    const result = parseMarkdown('# Title\n## Subtitle\n### Section');
    expect(result.headings).toHaveLength(3);
    expect(result.headings[0]).toEqual({ level: 1, text: 'Title', id: 'title' });
    expect(result.headings[1]).toEqual({ level: 2, text: 'Subtitle', id: 'subtitle' });
    expect(result.headings[2]).toEqual({ level: 3, text: 'Section', id: 'section' });
  });

  it('should generate correct heading IDs', () => {
    const result = parseMarkdown('# Hello World!');
    expect(result.headings[0].id).toBe('hello-world');
  });

  it('should highlight code blocks with language', () => {
    const result = parseMarkdown('```javascript\nconst x = 1;\n```');
    expect(result.html).toContain('class="hljs language-javascript"');
    expect(result.html).toContain('<pre><code');
  });

  it('should auto-detect language for code blocks without language', () => {
    const result = parseMarkdown('```\nfunction test() {}\n```');
    expect(result.html).toContain('class="hljs"');
  });

  it('should render mermaid blocks as div', () => {
    const result = parseMarkdown('```mermaid\ngraph TD\nA-->B\n```');
    expect(result.html).toContain('<div class="mermaid">');
    expect(result.html).toContain('graph TD');
  });

  it('should convert bold text', () => {
    const result = parseMarkdown('This is **bold** text');
    expect(result.html).toContain('<strong>bold</strong>');
  });

  it('should convert italic text', () => {
    const result = parseMarkdown('This is *italic* text');
    expect(result.html).toContain('<em>italic</em>');
  });

  it('should convert links', () => {
    const result = parseMarkdown('[Link](https://example.com)');
    expect(result.html).toContain('<a href="https://example.com">Link</a>');
  });

  it('should convert unordered lists', () => {
    const result = parseMarkdown('- Item 1\n- Item 2');
    expect(result.html).toContain('<ul>');
    expect(result.html).toContain('<li>Item 1</li>');
    expect(result.html).toContain('<li>Item 2</li>');
  });

  it('should convert ordered lists', () => {
    const result = parseMarkdown('1. First\n2. Second');
    expect(result.html).toContain('<ol>');
    expect(result.html).toContain('<li>First</li>');
    expect(result.html).toContain('<li>Second</li>');
  });

  it('should reset headings between calls', () => {
    parseMarkdown('# First');
    const result = parseMarkdown('# Second');
    expect(result.headings).toHaveLength(1);
    expect(result.headings[0].text).toBe('Second');
  });
});

describe('extractHeadings', () => {
  it('should extract all heading levels', () => {
    const content = '# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6';
    const headings = extractHeadings(content);
    expect(headings).toHaveLength(6);
    expect(headings.map(h => h.level)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('should handle empty content', () => {
    const headings = extractHeadings('');
    expect(headings).toHaveLength(0);
  });

  it('should handle content without headings', () => {
    const headings = extractHeadings('Just some text\nNo headings here');
    expect(headings).toHaveLength(0);
  });

  it('should generate correct IDs for headings with special characters', () => {
    const headings = extractHeadings('# Hello, World! (2024)');
    expect(headings[0].id).toBe('hello-world-2024');
  });

  it('should handle multiple spaces in headings', () => {
    const headings = extractHeadings('# Multiple   Spaces   Here');
    expect(headings[0].id).toBe('multiple-spaces-here');
  });
});
