import { marked, Tokens } from 'marked';
import hljs from 'highlight.js';
import type { Heading } from './types.js';

const headings: Heading[] = [];

const renderer = new marked.Renderer();

renderer.code = ({ text, lang }: Tokens.Code): string => {
  if (lang === 'mermaid') {
    return `<div class="mermaid">${text}</div>`;
  }

  let highlighted: string;
  if (lang && hljs.getLanguage(lang)) {
    highlighted = hljs.highlight(text, { language: lang }).value;
  } else {
    highlighted = hljs.highlightAuto(text).value;
  }
  return `<pre><code class="hljs${lang ? ` language-${lang}` : ''}">${highlighted}</code></pre>`;
};

renderer.heading = ({ text, depth }: Tokens.Heading): string => {
  const id = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');

  headings.push({ level: depth, text, id });

  return `<h${depth} id="${id}">${text}</h${depth}>`;
};

marked.setOptions({
  renderer,
  gfm: true,
  breaks: true,
});

export function parseMarkdown(content: string): { html: string; headings: Heading[] } {
  headings.length = 0;
  const html = marked.parse(content) as string;
  return { html, headings: [...headings] };
}

export function extractHeadings(content: string): Heading[] {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const result: Heading[] = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
    result.push({ level, text, id });
  }

  return result;
}

