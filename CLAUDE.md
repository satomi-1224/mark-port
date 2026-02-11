# CLAUDE.md - mark-port Package

This is a Markdown real-time preview CLI tool built with TypeScript.

## Package Overview

**Name**: `mark-port`
**Description**: Markdown real-time preview CLI tool with live reload
**Type**: CLI tool with TypeScript exports

## Development Commands

**Testing and Quality:**

- `pnpm run test` - Run all tests (using vitest, watch mode disabled)
- `pnpm run test:watch` - Run tests in watch mode
- `pnpm run typecheck` - Type check with TypeScript

**Build:**

- `pnpm run build` - Build distribution files with tsup
- `pnpm run dev` - Watch mode build for development

**Development Usage:**

- `pnpm run start` - Run CLI (defaults to current directory)
- `pnpm run start <file.md>` - Preview a single markdown file
- `pnpm run start <directory>` - Preview all markdown files in directory
- Add `--port <number>` to specify server port (default: 3000)
- Add `--no-open` to disable automatic browser opening
- Add `--no-watch` to disable file watching

## Architecture

**Key Modules:**

- `src/cli.ts` - CLI entry point with Commander.js
- `src/server.ts` - Fastify server setup with static file serving
- `src/markdown.ts` - Markdown parsing with marked + highlight.js
- `src/fileTree.ts` - Recursive directory traversal for markdown files
- `src/watcher.ts` - File watching with chokidar
- `src/types.ts` - TypeScript type definitions
- `src/routes/api.ts` - REST API endpoints
- `src/routes/sse.ts` - Server-Sent Events for live reload

**Frontend:**

- `public/index.html` - 3-panel UI layout
- `public/styles.css` - GitHub-like markdown styling
- `public/app.js` - Frontend JavaScript (vanilla JS)

**Data Flow:**

1. CLI parses arguments and determines file/directory mode
2. Fastify server starts with static file serving for `public/`
3. API routes provide file tree, content, and app info
4. SSE endpoint streams file change events to browser
5. Frontend renders markdown with Mermaid diagram support

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/info` | GET | App mode, target path, version |
| `/api/tree` | GET | File tree structure |
| `/api/content?file=` | GET | Rendered HTML + TOC headings |
| `/sse/changes` | GET | SSE stream for file changes |

## Testing Guidelines

**Test Framework:**

- **Vitest**: Testing framework with native ESM and TypeScript support
- **Separate Test Files**: Tests are located in the `tests/` directory, mirroring the `src/` structure
- **Globals Enabled**: Use `describe`, `it`, `expect` directly with imports from vitest

**Test Directory Structure:**

```
tests/
├── markdown.test.ts      # Tests for src/markdown.ts
├── fileTree.test.ts      # Tests for src/fileTree.ts
├── watcher.test.ts       # Tests for src/watcher.ts
└── routes/
    └── api.test.ts       # Tests for src/routes/api.ts
```

**Test File Structure:**

```typescript
import { describe, it, expect } from 'vitest';
import { functionName } from '../src/module.js';

describe('functionName', () => {
  it('should do something', () => {
    expect(result).toBe(expected);
  });
});
```

**Test Requirements:**

- All exported functions MUST have corresponding tests
- Tests MUST cover both success and error cases
- Use `fs-fixture` with `createFixture()` for file system mocking
- NEVER use mocks when real implementations can be tested
- Test file paths MUST use the fixture's temporary directory

**Test Coverage Guidelines:**

- `tests/markdown.test.ts` - Test HTML output, heading extraction, code highlighting, Mermaid blocks
- `tests/fileTree.test.ts` - Test directory traversal, filtering, sorting, edge cases
- `tests/watcher.test.ts` - Test event emission, file filtering
- `tests/routes/api.test.ts` - Test API responses, error handling, path traversal prevention

**Post-Change Workflow:**

Run these commands in parallel after code changes:

- `pnpm run typecheck` - Type checking
- `pnpm run test` - Run tests

## Code Style

- **Imports**: Use `.js` extensions for local imports (ESM requirement)
- **Type Safety**: Strict TypeScript configuration
- **Security**: Path traversal protection on file access

## Dependencies

**Runtime Dependencies:**

- `fastify` - Web server framework
- `@fastify/static` - Static file serving
- `marked` - Markdown parser
- `highlight.js` - Syntax highlighting
- `chokidar` - File system watching
- `commander` - CLI framework
- `open` - Browser opening utility

**Dev Dependencies:**

- `typescript` - TypeScript compiler
- `tsup` - TypeScript bundler
- `vitest` - Testing framework
- `fs-fixture` - File system test fixtures
- `@types/node` - Node.js type definitions

## Package Exports

The package provides library exports:

- `.` - Main exports (createServer, parseMarkdown, etc.)
- Types: `TreeNode`, `Heading`, `ContentResponse`, `AppContext`, etc.

## UI Features

- **3-panel layout**: File tree (left), preview (center), TOC (right)
- **Live reload**: Automatic refresh on file changes via SSE
- **Syntax highlighting**: highlight.js with auto language detection
- **Mermaid diagrams**: Client-side rendering
- **Scroll spy**: Active heading highlight in TOC
- **Responsive**: Collapsible sidebars for smaller screens
