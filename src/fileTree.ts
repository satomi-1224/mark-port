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

