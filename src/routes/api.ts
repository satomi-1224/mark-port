import { FastifyInstance } from 'fastify';
import { readFile } from 'node:fs/promises';
import { join, resolve, normalize, dirname, posix } from 'node:path';
import { parseMarkdown } from '../markdown.js';
import { buildFileTree, fileExists } from '../fileTree.js';
import type { AppContext, ContentResponse, InfoResponse, TreeResponse } from '../types.js';

function rewriteAssetPaths(html: string, fileDir: string): string {
  return html.replace(
    /(<img\s+[^>]*src=["'])([^"']+)(["'][^>]*>)/gi,
    (match, prefix, src, suffix) => {
      if (src.startsWith('http://') || src.startsWith('https://') ||
          src.startsWith('data:') || src.startsWith('/')) {
        return match;
      }
      const assetPath = posix.normalize(posix.join('/assets', fileDir, src));
      return `${prefix}${assetPath}${suffix}`;
    }
  );
}

export async function registerApiRoutes(
  app: FastifyInstance,
  context: AppContext
): Promise<void> {
  const { mode, targetPath, basePath } = context;
  const version = '1.0.0';

  app.get<{ Reply: InfoResponse }>('/api/info', async () => {
    return {
      mode,
      targetPath,
      version,
    };
  });

  app.get<{ Reply: TreeResponse }>('/api/tree', async () => {
    if (mode === 'file') {
      const filename = targetPath.split('/').pop() || targetPath;
      return {
        tree: [
          {
            name: filename,
            path: filename,
            type: 'file',
          },
        ],
      };
    }

    const tree = await buildFileTree(basePath, basePath);
    return { tree };
  });

  app.get<{
    Querystring: { file?: string };
    Reply: ContentResponse | { error: string };
  }>('/api/content', async (request, reply) => {
    const { file } = request.query;

    if (!file) {
      reply.code(400);
      return { error: 'File parameter is required' };
    }

    const normalizedPath = normalize(file);
    if (normalizedPath.includes('..') || normalizedPath.startsWith('/')) {
      reply.code(403);
      return { error: 'Invalid file path' };
    }

    const fullPath = mode === 'file'
      ? resolve(basePath, targetPath)
      : join(basePath, normalizedPath);

    const resolvedPath = resolve(fullPath);
    if (!resolvedPath.startsWith(resolve(basePath))) {
      reply.code(403);
      return { error: 'Access denied' };
    }

    if (!(await fileExists(resolvedPath))) {
      reply.code(404);
      return { error: 'File not found' };
    }

    const raw = await readFile(resolvedPath, 'utf-8');
    const { html, headings } = parseMarkdown(raw);

    const fileDir = mode === 'file' ? '' : dirname(normalizedPath);
    const processedHtml = rewriteAssetPaths(html, fileDir);

    return {
      file: normalizedPath,
      html: processedHtml,
      headings,
      raw,
    };
  });
}

