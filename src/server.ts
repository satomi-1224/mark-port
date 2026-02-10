import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerApiRoutes } from './routes/api.js';
import { registerSseRoutes } from './routes/sse.js';
import { FileWatcher } from './watcher.js';
import type { AppContext } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function createServer(context: AppContext) {
  const app = Fastify({
    logger: false,
  });

  const publicDir = join(__dirname, '..', 'public');

  await app.register(fastifyStatic, {
    root: publicDir,
    prefix: '/',
    decorateReply: false,
  });

  await app.register(fastifyStatic, {
    root: context.basePath,
    prefix: '/assets/',
    decorateReply: false,
  });

  let watcher: FileWatcher | null = null;

  if (context.options.watch) {
    watcher = new FileWatcher(context.basePath);
    const watchPath = context.mode === 'file'
      ? join(context.basePath, context.targetPath)
      : context.basePath;
    watcher.start(watchPath);
  }

  await registerApiRoutes(app, context);
  await registerSseRoutes(app, watcher);

  const cleanup = async () => {
    if (watcher) {
      await watcher.stop();
    }
    await app.close();
  };

  return { app, cleanup };
}
