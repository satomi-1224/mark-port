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

if (import.meta.vitest) {
  const { describe, it, expect, beforeEach, afterEach } = import.meta.vitest;
  const { createFixture } = await import('fs-fixture');
  const fastifyModule = await import('fastify');
  const Fastify = fastifyModule.default;

  describe('registerApiRoutes', () => {
    let app: FastifyInstance;
    let fixture: Awaited<ReturnType<typeof createFixture>>;

    describe('directory mode', () => {
      beforeEach(async () => {
        fixture = await createFixture({
          'readme.md': '# Hello World\n\nThis is a test.',
          'docs': {
            'guide.md': '# Guide\n## Section 1\n## Section 2',
          },
        });

        app = Fastify();
        await registerApiRoutes(app, {
          mode: 'directory',
          targetPath: '.',
          basePath: fixture.path,
          options: { port: 3000, open: false, watch: false },
        });
      });

      afterEach(async () => {
        await app.close();
        await fixture.rm();
      });

      it('GET /api/info should return app info', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/info',
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.mode).toBe('directory');
        expect(body.version).toBe('1.0.0');
      });

      it('GET /api/tree should return file tree', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/tree',
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.tree).toBeInstanceOf(Array);
        expect(body.tree.length).toBe(2);
      });

      it('GET /api/content should return rendered markdown', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/content?file=readme.md',
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.file).toBe('readme.md');
        expect(body.html).toContain('<h1');
        expect(body.html).toContain('Hello World');
        expect(body.raw).toContain('# Hello World');
        expect(body.headings).toHaveLength(1);
      });

      it('GET /api/content should return headings', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/content?file=docs/guide.md',
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.headings).toHaveLength(3);
        expect(body.headings[0].text).toBe('Guide');
        expect(body.headings[1].text).toBe('Section 1');
      });

      it('GET /api/content without file parameter should return 400', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/content',
        });

        expect(response.statusCode).toBe(400);
        const body = response.json();
        expect(body.error).toBe('File parameter is required');
      });

      it('GET /api/content with non-existent file should return 404', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/content?file=nonexistent.md',
        });

        expect(response.statusCode).toBe(404);
        const body = response.json();
        expect(body.error).toBe('File not found');
      });

      it('GET /api/content with path traversal should return 403', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/content?file=../../../etc/passwd',
        });

        expect(response.statusCode).toBe(403);
        const body = response.json();
        expect(body.error).toBe('Invalid file path');
      });

      it('GET /api/content with absolute path should return 403', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/content?file=/etc/passwd',
        });

        expect(response.statusCode).toBe(403);
        const body = response.json();
        expect(body.error).toBe('Invalid file path');
      });
    });

    describe('file mode', () => {
      beforeEach(async () => {
        fixture = await createFixture({
          'single.md': '# Single File\n\nContent here.',
        });

        app = Fastify();
        await registerApiRoutes(app, {
          mode: 'file',
          targetPath: 'single.md',
          basePath: fixture.path,
          options: { port: 3000, open: false, watch: false },
        });
      });

      afterEach(async () => {
        await app.close();
        await fixture.rm();
      });

      it('GET /api/info should return file mode', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/info',
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.mode).toBe('file');
        expect(body.targetPath).toBe('single.md');
      });

      it('GET /api/tree should return single file', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/tree',
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.tree).toHaveLength(1);
        expect(body.tree[0].name).toBe('single.md');
        expect(body.tree[0].type).toBe('file');
      });

      it('GET /api/content should return the single file content', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/content?file=single.md',
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.html).toContain('Single File');
      });
    });

    describe('image path rewriting', () => {
      beforeEach(async () => {
        fixture = await createFixture({
          'readme.md': '# Test\n\n![image](./images/test.png)',
          'docs': {
            'guide.md': '# Guide\n\n![photo](../assets/photo.jpg)\n\n![external](https://example.com/img.png)',
          },
        });

        app = Fastify();
        await registerApiRoutes(app, {
          mode: 'directory',
          targetPath: '.',
          basePath: fixture.path,
          options: { port: 3000, open: false, watch: false },
        });
      });

      afterEach(async () => {
        await app.close();
        await fixture.rm();
      });

      it('should rewrite relative image paths in root file', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/content?file=readme.md',
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.html).toContain('src="/assets/images/test.png"');
      });

      it('should rewrite relative image paths in subdirectory file', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/content?file=docs/guide.md',
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.html).toContain('src="/assets/assets/photo.jpg"');
      });

      it('should not rewrite external URLs', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/content?file=docs/guide.md',
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.html).toContain('src="https://example.com/img.png"');
      });
    });
  });
}
