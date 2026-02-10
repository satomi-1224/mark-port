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

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;
  const { createFixture } = await import('fs-fixture');
  const { writeFile, unlink } = await import('node:fs/promises');
  const { join } = await import('node:path');

  const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  describe('FileWatcher', () => {
    it('should create instance with basePath', () => {
      const watcher = new FileWatcher('/test/path');
      expect(watcher).toBeInstanceOf(FileWatcher);
      expect(watcher).toBeInstanceOf(EventEmitter);
    });

    it('should emit change event for markdown file changes', async () => {
      const fixture = await createFixture({
        'test.md': '# Initial',
      });

      try {
        const watcher = new FileWatcher(fixture.path);
        const events: FileChangeEvent[] = [];

        watcher.on('change', (event: FileChangeEvent) => {
          events.push(event);
        });

        watcher.start(fixture.path);
        await waitFor(100);

        await writeFile(join(fixture.path, 'test.md'), '# Updated');
        await waitFor(300);

        await watcher.stop();

        expect(events.length).toBeGreaterThanOrEqual(1);
        expect(events[0].type).toBe('change');
        expect(events[0].file).toBe('test.md');
      } finally {
        await fixture.rm();
      }
    });

    it('should emit add event for new markdown files', async () => {
      const fixture = await createFixture({});

      try {
        const watcher = new FileWatcher(fixture.path);
        const events: FileChangeEvent[] = [];

        watcher.on('change', (event: FileChangeEvent) => {
          events.push(event);
        });

        watcher.start(fixture.path);
        await waitFor(100);

        await writeFile(join(fixture.path, 'new.md'), '# New file');
        await waitFor(300);

        await watcher.stop();

        expect(events.length).toBeGreaterThanOrEqual(1);
        expect(events[0].type).toBe('add');
        expect(events[0].file).toBe('new.md');
      } finally {
        await fixture.rm();
      }
    });

    it('should emit unlink event for deleted markdown files', async () => {
      const fixture = await createFixture({
        'delete-me.md': '# To be deleted',
      });

      try {
        const watcher = new FileWatcher(fixture.path);
        const events: FileChangeEvent[] = [];

        watcher.on('change', (event: FileChangeEvent) => {
          events.push(event);
        });

        watcher.start(fixture.path);
        await waitFor(100);

        await unlink(join(fixture.path, 'delete-me.md'));
        await waitFor(300);

        await watcher.stop();

        expect(events.length).toBeGreaterThanOrEqual(1);
        const unlinkEvent = events.find(e => e.type === 'unlink');
        expect(unlinkEvent).toBeDefined();
        expect(unlinkEvent?.file).toBe('delete-me.md');
      } finally {
        await fixture.rm();
      }
    });

    it('should not emit events for non-markdown files', async () => {
      const fixture = await createFixture({});

      try {
        const watcher = new FileWatcher(fixture.path);
        const events: FileChangeEvent[] = [];

        watcher.on('change', (event: FileChangeEvent) => {
          events.push(event);
        });

        watcher.start(fixture.path);
        await waitFor(100);

        await writeFile(join(fixture.path, 'script.js'), 'console.log("hi")');
        await waitFor(300);

        await watcher.stop();

        expect(events).toHaveLength(0);
      } finally {
        await fixture.rm();
      }
    });

    it('should handle .markdown extension', async () => {
      const fixture = await createFixture({});

      try {
        const watcher = new FileWatcher(fixture.path);
        const events: FileChangeEvent[] = [];

        watcher.on('change', (event: FileChangeEvent) => {
          events.push(event);
        });

        watcher.start(fixture.path);
        await waitFor(100);

        await writeFile(join(fixture.path, 'doc.markdown'), '# Markdown');
        await waitFor(300);

        await watcher.stop();

        expect(events.length).toBeGreaterThanOrEqual(1);
        expect(events[0].file).toBe('doc.markdown');
      } finally {
        await fixture.rm();
      }
    });

    it('should stop watching after stop() is called', async () => {
      const fixture = await createFixture({});

      try {
        const watcher = new FileWatcher(fixture.path);
        const events: FileChangeEvent[] = [];

        watcher.on('change', (event: FileChangeEvent) => {
          events.push(event);
        });

        watcher.start(fixture.path);
        await waitFor(100);
        await watcher.stop();

        await writeFile(join(fixture.path, 'after-stop.md'), '# After stop');
        await waitFor(300);

        expect(events).toHaveLength(0);
      } finally {
        await fixture.rm();
      }
    });
  });
}
