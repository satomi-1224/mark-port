import { FastifyInstance } from 'fastify';
import { FileWatcher, type FileChangeEvent } from '../watcher.js';

export async function registerSseRoutes(
  app: FastifyInstance,
  watcher: FileWatcher | null
): Promise<void> {
  app.get('/sse/changes', async (request, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    reply.raw.write('event: connected\ndata: {}\n\n');

    const heartbeat = setInterval(() => {
      reply.raw.write(':heartbeat\n\n');
    }, 30000);

    const onFileChange = (event: FileChangeEvent) => {
      const data = JSON.stringify(event);
      reply.raw.write(`event: fileChange\ndata: ${data}\n\n`);
    };

    if (watcher) {
      watcher.on('change', onFileChange);
    }

    request.raw.on('close', () => {
      clearInterval(heartbeat);
      if (watcher) {
        watcher.off('change', onFileChange);
      }
    });
  });
}
