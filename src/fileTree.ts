import { readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import type { TreeNode } from './types.js';

const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  '.DS_Store',
  'dist',
  '.next',
  '.cache',
];

export async function buildFileTree(
  dirPath: string,
  basePath: string
): Promise<TreeNode[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const nodes: TreeNode[] = [];

  for (const entry of entries) {
    if (IGNORE_PATTERNS.includes(entry.name)) {
      continue;
    }

    const fullPath = join(dirPath, entry.name);
    const relativePath = relative(basePath, fullPath);

    if (entry.isDirectory()) {
      const children = await buildFileTree(fullPath, basePath);
      if (children.length > 0 || hasMarkdownFiles(children)) {
        nodes.push({
          name: entry.name,
          path: relativePath,
          type: 'directory',
          children,
        });
      }
    } else if (entry.isFile() && isMarkdownFile(entry.name)) {
      nodes.push({
        name: entry.name,
        path: relativePath,
        type: 'file',
      });
    }
  }

  return nodes.sort((a, b) => {
    if (a.type === b.type) {
      return a.name.localeCompare(b.name);
    }
    return a.type === 'directory' ? -1 : 1;
  });
}

function isMarkdownFile(filename: string): boolean {
  const ext = filename.toLowerCase();
  return ext.endsWith('.md') || ext.endsWith('.markdown');
}

function hasMarkdownFiles(nodes: TreeNode[]): boolean {
  return nodes.some(
    (node) =>
      node.type === 'file' ||
      (node.children && hasMarkdownFiles(node.children))
  );
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;
  const { createFixture } = await import('fs-fixture');

  describe('buildFileTree', () => {
    it('should return empty array for empty directory', async () => {
      const fixture = await createFixture({});
      try {
        const result = await buildFileTree(fixture.path, fixture.path);
        expect(result).toEqual([]);
      } finally {
        await fixture.rm();
      }
    });

    it('should find markdown files', async () => {
      const fixture = await createFixture({
        'readme.md': '# Hello',
        'docs.markdown': '# Docs',
      });
      try {
        const result = await buildFileTree(fixture.path, fixture.path);
        expect(result).toHaveLength(2);
        expect(result.map(n => n.name).sort()).toEqual(['docs.markdown', 'readme.md']);
      } finally {
        await fixture.rm();
      }
    });

    it('should ignore non-markdown files', async () => {
      const fixture = await createFixture({
        'readme.md': '# Hello',
        'script.js': 'console.log("hi")',
        'style.css': 'body {}',
      });
      try {
        const result = await buildFileTree(fixture.path, fixture.path);
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('readme.md');
      } finally {
        await fixture.rm();
      }
    });

    it('should ignore node_modules directory', async () => {
      const fixture = await createFixture({
        'readme.md': '# Hello',
        'node_modules': {
          'package': {
            'readme.md': '# Package',
          },
        },
      });
      try {
        const result = await buildFileTree(fixture.path, fixture.path);
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('readme.md');
      } finally {
        await fixture.rm();
      }
    });

    it('should ignore .git directory', async () => {
      const fixture = await createFixture({
        'readme.md': '# Hello',
        '.git': {
          'config': 'git config',
        },
      });
      try {
        const result = await buildFileTree(fixture.path, fixture.path);
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('readme.md');
      } finally {
        await fixture.rm();
      }
    });

    it('should include subdirectories with markdown files', async () => {
      const fixture = await createFixture({
        'readme.md': '# Root',
        'docs': {
          'guide.md': '# Guide',
        },
      });
      try {
        const result = await buildFileTree(fixture.path, fixture.path);
        expect(result).toHaveLength(2);
        const dir = result.find(n => n.type === 'directory');
        expect(dir?.name).toBe('docs');
        expect(dir?.children).toHaveLength(1);
        expect(dir?.children?.[0].name).toBe('guide.md');
      } finally {
        await fixture.rm();
      }
    });

    it('should exclude empty subdirectories', async () => {
      const fixture = await createFixture({
        'readme.md': '# Root',
        'empty': {},
      });
      try {
        const result = await buildFileTree(fixture.path, fixture.path);
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('readme.md');
      } finally {
        await fixture.rm();
      }
    });

    it('should sort directories before files', async () => {
      const fixture = await createFixture({
        'zebra.md': '# Zebra',
        'alpha': {
          'doc.md': '# Alpha',
        },
      });
      try {
        const result = await buildFileTree(fixture.path, fixture.path);
        expect(result[0].type).toBe('directory');
        expect(result[1].type).toBe('file');
      } finally {
        await fixture.rm();
      }
    });

    it('should sort alphabetically within same type', async () => {
      const fixture = await createFixture({
        'charlie.md': '# C',
        'alpha.md': '# A',
        'bravo.md': '# B',
      });
      try {
        const result = await buildFileTree(fixture.path, fixture.path);
        expect(result.map(n => n.name)).toEqual(['alpha.md', 'bravo.md', 'charlie.md']);
      } finally {
        await fixture.rm();
      }
    });

    it('should set correct relative paths', async () => {
      const fixture = await createFixture({
        'docs': {
          'nested': {
            'deep.md': '# Deep',
          },
        },
      });
      try {
        const result = await buildFileTree(fixture.path, fixture.path);
        const docs = result[0];
        const nested = docs.children?.[0];
        const deep = nested?.children?.[0];
        expect(docs.path).toBe('docs');
        expect(nested?.path).toBe('docs/nested');
        expect(deep?.path).toBe('docs/nested/deep.md');
      } finally {
        await fixture.rm();
      }
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      const fixture = await createFixture({
        'test.md': '# Test',
      });
      try {
        const result = await fileExists(join(fixture.path, 'test.md'));
        expect(result).toBe(true);
      } finally {
        await fixture.rm();
      }
    });

    it('should return false for non-existing file', async () => {
      const fixture = await createFixture({});
      try {
        const result = await fileExists(join(fixture.path, 'nonexistent.md'));
        expect(result).toBe(false);
      } finally {
        await fixture.rm();
      }
    });

    it('should return true for existing directory', async () => {
      const fixture = await createFixture({
        'subdir': {},
      });
      try {
        const result = await fileExists(join(fixture.path, 'subdir'));
        expect(result).toBe(true);
      } finally {
        await fixture.rm();
      }
    });
  });
}
