(function() {
  'use strict';

  const elements = {
    fileTree: document.getElementById('file-tree'),
    content: document.getElementById('markdown-content'),
    toc: document.getElementById('toc'),
    statusIndicator: document.getElementById('status-indicator'),
    statusText: document.getElementById('status-text'),
    fileSidebar: document.getElementById('file-sidebar'),
    tocSidebar: document.getElementById('toc-sidebar'),
    toggleFiles: document.getElementById('toggle-files'),
    toggleToc: document.getElementById('toggle-toc'),
    openFiles: document.getElementById('open-files'),
    openToc: document.getElementById('open-toc'),
  };

  let currentFile = null;
  let eventSource = null;
  let appInfo = null;

  async function init() {
    await fetchInfo();
    await fetchTree();
    setupSSE();
    setupToggleButtons();
    setupScrollSpy();
  }

  async function fetchInfo() {
    try {
      const res = await fetch('/api/info');
      appInfo = await res.json();

      if (appInfo.mode === 'file') {
        const filename = appInfo.targetPath.split('/').pop();
        await loadFile(filename);
      }
    } catch (err) {
      console.error('Failed to fetch info:', err);
    }
  }

  async function fetchTree() {
    try {
      const res = await fetch('/api/tree');
      const data = await res.json();
      renderTree(data.tree);
    } catch (err) {
      console.error('Failed to fetch tree:', err);
    }
  }

  function renderTree(nodes, container = elements.fileTree) {
    container.innerHTML = '';

    for (const node of nodes) {
      if (node.type === 'directory') {
        const div = document.createElement('div');
        div.className = 'tree-directory';

        const item = document.createElement('div');
        item.className = 'tree-item directory';
        item.innerHTML = `<span class="icon">📁</span>${node.name}`;
        item.onclick = () => {
          const children = div.querySelector('.tree-children');
          if (children) {
            children.style.display = children.style.display === 'none' ? 'block' : 'none';
          }
        };
        div.appendChild(item);

        if (node.children && node.children.length > 0) {
          const children = document.createElement('div');
          children.className = 'tree-children';
          renderTree(node.children, children);
          div.appendChild(children);
        }

        container.appendChild(div);
      } else {
        const item = document.createElement('div');
        item.className = 'tree-item file';
        item.dataset.path = node.path;
        item.innerHTML = `<span class="icon">📄</span>${node.name}`;
        item.onclick = () => loadFile(node.path);
        container.appendChild(item);
      }
    }
  }

  async function loadFile(filePath) {
    try {
      const res = await fetch(`/api/content?file=${encodeURIComponent(filePath)}`);

      if (!res.ok) {
        const err = await res.json();
        elements.content.innerHTML = `<div class="empty-state"><p>Error: ${err.error}</p></div>`;
        return;
      }

      const data = await res.json();
      currentFile = filePath;

      elements.content.innerHTML = data.html;
      renderToc(data.headings);
      updateActiveFile(filePath);

      await initMermaid();
    } catch (err) {
      console.error('Failed to load file:', err);
      elements.content.innerHTML = `<div class="empty-state"><p>Failed to load file</p></div>`;
    }
  }

  function renderToc(headings) {
    elements.toc.innerHTML = '';

    for (const heading of headings) {
      const item = document.createElement('a');
      item.className = 'toc-item';
      item.href = `#${heading.id}`;
      item.textContent = heading.text;
      item.dataset.level = heading.level;
      item.onclick = (e) => {
        e.preventDefault();
        const target = document.getElementById(heading.id);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      };
      elements.toc.appendChild(item);
    }
  }

  function updateActiveFile(filePath) {
    document.querySelectorAll('.tree-item.file').forEach(item => {
      item.classList.toggle('active', item.dataset.path === filePath);
    });
  }

  async function initMermaid() {
    if (typeof mermaid !== 'undefined') {
      mermaid.initialize({ startOnLoad: false, theme: 'default' });
      const mermaidDivs = document.querySelectorAll('.mermaid');
      if (mermaidDivs.length > 0) {
        // Reset processed state for re-rendering
        mermaidDivs.forEach((div, index) => {
          div.removeAttribute('data-processed');
          div.id = `mermaid-${Date.now()}-${index}`;
        });
        await mermaid.run({ nodes: mermaidDivs });
      }
    }
  }

  function setupSSE() {
    eventSource = new EventSource('/sse/changes');

    eventSource.addEventListener('connected', () => {
      setStatus(true, 'Connected');
    });

    eventSource.addEventListener('fileChange', (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'change' && data.file === currentFile) {
        loadFile(currentFile);
        setStatus(true, 'File updated');
      } else if (data.type === 'add' || data.type === 'unlink') {
        fetchTree();
      }
    });

    eventSource.onerror = () => {
      setStatus(false, 'Disconnected');
      setTimeout(setupSSE, 3000);
    };
  }

  function setStatus(connected, text) {
    elements.statusIndicator.classList.toggle('connected', connected);
    elements.statusText.textContent = text;
  }

  function setupToggleButtons() {
    elements.toggleFiles.onclick = () => {
      elements.fileSidebar.classList.add('collapsed');
      elements.fileSidebar.classList.remove('open');
    };

    elements.toggleToc.onclick = () => {
      elements.tocSidebar.classList.add('collapsed');
      elements.tocSidebar.classList.remove('open');
    };

    elements.openFiles.onclick = () => {
      elements.fileSidebar.classList.remove('collapsed');
      elements.fileSidebar.classList.add('open');
    };

    elements.openToc.onclick = () => {
      elements.tocSidebar.classList.remove('collapsed');
      elements.tocSidebar.classList.add('open');
    };
  }

  function setupScrollSpy() {
    const contentEl = document.getElementById('content');

    contentEl.addEventListener('scroll', () => {
      const headings = elements.content.querySelectorAll('h1, h2, h3, h4, h5, h6');
      let activeId = null;

      for (const heading of headings) {
        const rect = heading.getBoundingClientRect();
        if (rect.top <= 100) {
          activeId = heading.id;
        }
      }

      document.querySelectorAll('.toc-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('href') === `#${activeId}`);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
