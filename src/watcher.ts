import { watch, type FSWatcher } from 'chokidar';
import { relative } from 'node:path';
import { EventEmitter } from 'node:events';

export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink';
  file: string;
}

export class FileWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private basePath: string;

  constructor(basePath: string) {
    super();
    this.basePath = basePath;
  }

  start(watchPath: string): void {
    this.watcher = watch(watchPath, {
      ignored: /(^|[\/\\])\.|node_modules|dist/,
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher.on('add', (path) => this.handleEvent('add', path));
    this.watcher.on('change', (path) => this.handleEvent('change', path));
    this.watcher.on('unlink', (path) => this.handleEvent('unlink', path));
  }

  private handleEvent(type: 'add' | 'change' | 'unlink', filePath: string): void {
    if (!this.isMarkdownFile(filePath)) {
      return;
    }

    const relativePath = relative(this.basePath, filePath);
    const event: FileChangeEvent = { type, file: relativePath };
    this.emit('change', event);
  }

  private isMarkdownFile(filename: string): boolean {
    const ext = filename.toLowerCase();
    return ext.endsWith('.md') || ext.endsWith('.markdown');
  }

  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }
}

