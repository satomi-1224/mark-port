import { program } from 'commander';
import { resolve, dirname, basename } from 'node:path';
import { stat } from 'node:fs/promises';
import open from 'open';
import { createServer } from './server.js';
import type { AppContext, CliOptions } from './types.js';

program
  .name('mark-port')
  .description('Markdown real-time preview CLI tool')
  .version('1.0.0')
  .argument('[path]', 'Markdown file or directory to preview', '.')
  .option('-p, --port <number>', 'Port to run the server on', '3000')
  .option('--no-open', 'Do not open browser automatically')
  .option('--no-watch', 'Disable file watching')
  .action(async (inputPath: string, opts: { port: string; open: boolean; watch: boolean }) => {
    try {
      const fullPath = resolve(inputPath);
      const stats = await stat(fullPath);

      const isFile = stats.isFile();
      const mode = isFile ? 'file' : 'directory';
      const basePath = isFile ? dirname(fullPath) : fullPath;
      const targetPath = isFile ? basename(fullPath) : '.';

      const options: CliOptions = {
        port: parseInt(opts.port, 10),
        open: opts.open,
        watch: opts.watch,
      };

      const context: AppContext = {
        mode,
        targetPath,
        basePath,
        options,
      };

      const { app, cleanup } = await createServer(context);

      const address = await app.listen({ port: options.port, host: '127.0.0.1' });

      console.log(`\n  mark-port is running!\n`);
      console.log(`  Mode:     ${mode}`);
      console.log(`  Target:   ${fullPath}`);
      console.log(`  Server:   ${address}`);
      console.log(`  Watching: ${options.watch ? 'enabled' : 'disabled'}\n`);

      if (options.open) {
        await open(address);
      }

      let isShuttingDown = false;

      const shutdown = async (signal?: string) => {
        if (isShuttingDown) return;
        isShuttingDown = true;

        if (signal) {
          console.log(`\n  Received ${signal}, shutting down...`);
        } else {
          console.log('\n  Shutting down...');
        }

        await cleanup();
        process.exit(0);
      };

      process.on('SIGINT', () => shutdown('SIGINT'));
      process.on('SIGTERM', () => shutdown('SIGTERM'));
      process.on('SIGHUP', () => shutdown('SIGHUP'));

      process.on('uncaughtException', async (err) => {
        console.error('\n  Uncaught exception:', err.message);
        await cleanup();
        process.exit(1);
      });

      process.on('unhandledRejection', async (reason) => {
        console.error('\n  Unhandled rejection:', reason);
        await cleanup();
        process.exit(1);
      });
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      }
      process.exit(1);
    }
  });

program.parse();
