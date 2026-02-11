<p align="center">
  <img src="https://raw.githubusercontent.com/satomi-1224/mark-port/main/logo.png" alt="mark-port logo" width="200">
</p>

<h1 align="center">mark-port</h1>

<p align="center">
  A real-time Markdown preview CLI tool.<br>
  Simple and fast Markdown previewer that automatically refreshes the browser when you edit files.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/mark-port"><img src="https://img.shields.io/npm/v/mark-port.svg" alt="npm version"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
</p>

## Features

- **Live Reload** - Automatically refreshes browser on file save (SSE)
- **3-Panel UI** - File tree / Preview / Table of contents
- **Syntax Highlighting** - Auto language detection with highlight.js
- **Mermaid Support** - Diagrams and flowcharts
- **GitHub-style** - Familiar Markdown rendering
- **Fast** - Lightweight Fastify-based server

## Architecture

```mermaid
flowchart LR
    subgraph CLI
        A[mark-port] --> B[Fastify Server]
    end

    subgraph Server
        B --> C[Static Files]
        B --> D[REST API]
        B --> E[SSE Endpoint]
    end

    subgraph Backend
        F[chokidar] -->|file change| E
        D --> G[marked + highlight.js]
    end

    subgraph Browser
        C --> H[3-Panel UI]
        D -->|content| H
        E -->|live update| H
        H --> I[Mermaid Renderer]
    end
```

## Installation

```bash
npm install -g mark-port
```

## Usage

### Preview a single file

```bash
mark-port README.md
```

### Preview all Markdown files in a directory

```bash
mark-port ./docs
```

### Preview current directory

```bash
mark-port
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --port <number>` | Server port number | `3000` |
| `--no-open` | Disable automatic browser opening | - |
| `--no-watch` | Disable file watching | - |
| `-V, --version` | Show version | - |
| `-h, --help` | Show help | - |

### Examples

```bash
# Start on port 8080
mark-port ./docs --port 8080

# Don't open browser automatically
mark-port README.md --no-open

# Start without file watching
mark-port ./docs --no-watch
```

## Screenshot

<p align="center">
  <img src="https://raw.githubusercontent.com/satomi-1224/mark-port/main/screenshot.png" alt="mark-port screenshot" width="800">
</p>

- **Left Panel**: Markdown file tree
- **Center Panel**: Rendered Markdown
- **Right Panel**: Table of contents with headings (click to scroll)

## Supported Formats

### Markdown

- Headings (H1-H6)
- Bold, italic, strikethrough
- Links and images
- Lists (ordered and unordered)
- Code blocks (with syntax highlighting)
- Tables
- Blockquotes
- Horizontal rules

### Mermaid Diagrams

Flowcharts, sequence diagrams, and more are supported:

```mermaid
graph TD
    A[Start] --> B{Condition}
    B -->|Yes| C[Process 1]
    B -->|No| D[Process 2]
    C --> E[End]
    D --> E
```

```mermaid
sequenceDiagram
    participant User
    participant CLI
    participant Server
    participant Browser

    User->>CLI: mark-port README.md
    CLI->>Server: Start Fastify
    Server->>Browser: Open URL
    Browser->>Server: GET /api/content
    Server-->>Browser: Rendered HTML

    User->>User: Edit file
    Server->>Browser: SSE: file changed
    Browser->>Server: GET /api/content
    Server-->>Browser: Updated HTML
```

## Development

### Setup

```bash
git clone https://github.com/satomi-1224/mark-port.git
cd mark-port
pnpm install
```

### Commands

```bash
# Build
pnpm run build

# Development mode (watch)
pnpm run dev

# Run tests
pnpm run test

# Type check
pnpm run typecheck
```

### Project Structure

```
mark-port/
├── bin/
│   └── mark-port.js        # CLI entry point
├── src/
│   ├── cli.ts              # CLI logic
│   ├── server.ts           # Fastify server
│   ├── markdown.ts         # Markdown parser
│   ├── fileTree.ts         # File tree builder
│   ├── watcher.ts          # File watcher
│   ├── types.ts            # Type definitions
│   └── routes/
│       ├── api.ts          # REST API
│       └── sse.ts          # Server-Sent Events
├── public/
│   ├── index.html          # Frontend HTML
│   ├── styles.css          # Styles
│   └── app.js              # Frontend JS
└── dist/                   # Build output
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Server | Fastify |
| Markdown Parser | marked |
| Syntax Highlighting | highlight.js |
| Diagrams | Mermaid |
| File Watching | chokidar |
| CLI | Commander.js |
| Build | tsup |
| Testing | Vitest |

## License

MIT
