/**
 * Cartix Documentation Platform Controller
 * Handles ⌘K search index, scrollspy active sections, and TOC tracking
 */

(function () {
  'use strict';

  // Search Index Data grounded strictly in repository docs
  const DOCS_SEARCH_INDEX = [
    {
      title: 'Problem Statement & Motivation',
      category: 'Overview',
      hash: '#problem-statement',
      snippet: 'Why AI agents need a secure, read-only bridge to WooCommerce merchant data.',
    },
    {
      title: 'Architecture & System Topology',
      category: 'Architecture',
      hash: '#architecture',
      snippet: 'Multi-layer pipeline: Agent -> MCP Protocol -> Cartix Core -> WooCommerce REST API.',
    },
    {
      title: 'Transport Modes (stdio, Streamable HTTP, SSE)',
      category: 'Architecture',
      hash: '#transport-modes',
      snippet: 'Supported transports for local CLI tools, Claude Desktop, and cloud agent infrastructure.',
    },
    {
      title: 'search_orders Tool Specification',
      category: 'MCP Tools',
      hash: '#tool-search-orders',
      snippet: 'Filter orders by status (pending, processing), customer, date range, with bounded pagination.',
    },
    {
      title: 'get_order Tool Specification',
      category: 'MCP Tools',
      hash: '#tool-get-order',
      snippet: 'Retrieve single order by ID with line items, financial totals, and PII sanitization.',
    },
    {
      title: 'search_products Tool Specification',
      category: 'MCP Tools',
      hash: '#tool-search-products',
      snippet: 'Search catalog by keyword query, stock status, category, with pagination.',
    },
    {
      title: 'get_product Tool Specification',
      category: 'MCP Tools',
      hash: '#tool-get-product',
      snippet: 'Detailed product lookup with price, SKU, dimensions, and variation metadata.',
    },
    {
      title: 'get_inventory Tool Specification',
      category: 'MCP Tools',
      hash: '#tool-get-inventory',
      snippet: 'Store-wide inventory inspection with deterministic low_stock_only filter.',
    },
    {
      title: 'Authentication & Credentials Model',
      category: 'Security',
      hash: '#authentication',
      snippet: 'HTTP Basic Auth over HTTPS with read-only WooCommerce API keys.',
    },
    {
      title: 'PII Sanitization & Redaction Rules',
      category: 'Security',
      hash: '#pii-sanitization',
      snippet: 'Customer names, emails, and shipping addresses masked before LLM context delivery.',
    },
    {
      title: 'Rate Limiting & Token Bucket',
      category: 'Reliability',
      hash: '#rate-limiting',
      snippet: 'In-memory token bucket and exponential backoff with full jitter on HTTP 429.',
    },
    {
      title: 'Quick Start & Installation',
      category: 'Getting Started',
      hash: '#quick-start',
      snippet: 'Clone, install dependencies, configure .env, and start the Cartix server.',
    },
    {
      title: 'Claude Desktop MCP Configuration',
      category: 'Integrations',
      hash: '#claude-desktop',
      snippet: 'JSON config snippet to connect Cartix MCP server to Claude Desktop app.',
    },
    {
      title: 'AI Demo Agent & LLM Function Calling',
      category: 'Demo',
      hash: '#demo-agent',
      snippet: 'Multi-turn agent powered by Gemini with offline deterministic fallback mode.',
    },
    {
      title: 'Testing & Quality Assurance',
      category: 'Testing',
      hash: '#testing',
      snippet: '60/60 unit, integration, and failure test suites executed via Vitest.',
    },
    {
      title: 'Docker Deployment',
      category: 'Deployment',
      hash: '#docker',
      snippet: 'Multi-stage unprivileged Node 20 Alpine container image setup.',
    },
    {
      title: 'Explicit Boundaries & Limitations',
      category: 'Limitations',
      hash: '#limitations',
      snippet: 'Strictly read-only: No order creation, no inventory modification, no refunds.',
    },
    {
      title: 'MIT License & Open Source',
      category: 'Project',
      hash: '#license',
      snippet: 'Open source software licensing and terms for Cartix.',
    },
  ];

  document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup ⌘K / Ctrl+K Command Palette
    const searchModal = document.querySelector('.search-modal-backdrop');
    const searchInput = document.querySelector('.search-input');
    const searchResults = document.querySelector('.search-results-list');
    const searchTriggers = document.querySelectorAll('.search-trigger-btn, .sidebar-search-btn');

    let selectedIndex = 0;
    let filteredResults = [...DOCS_SEARCH_INDEX];

    function openSearch() {
      if (!searchModal) return;
      searchModal.classList.add('open');
      searchInput.value = '';
      renderResults(DOCS_SEARCH_INDEX);
      setTimeout(() => searchInput.focus(), 50);
    }

    function closeSearch() {
      if (!searchModal) return;
      searchModal.classList.remove('open');
    }

    function renderResults(results) {
      filteredResults = results;
      selectedIndex = 0;

      if (!searchResults) return;

      if (results.length === 0) {
        searchResults.innerHTML = `<div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.9rem;">No matching documentation found.</div>`;
        return;
      }

      searchResults.innerHTML = results.map((item, index) => `
        <a href="${item.hash}" class="search-result-item ${index === 0 ? 'selected' : ''}" data-index="${index}">
          <div class="result-main">
            <span class="result-title">${item.title}</span>
            <span class="result-snippet">${item.snippet}</span>
          </div>
          <span class="badge badge-indigo">${item.category}</span>
        </a>
      `).join('');

      // Click event for results
      searchResults.querySelectorAll('.search-result-item').forEach((item) => {
        item.addEventListener('click', () => {
          closeSearch();
        });
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
          renderResults(DOCS_SEARCH_INDEX);
          return;
        }

        const matched = DOCS_SEARCH_INDEX.filter((item) => 
          item.title.toLowerCase().includes(query) ||
          item.snippet.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query)
        );
        renderResults(matched);
      });

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          selectedIndex = Math.min(selectedIndex + 1, filteredResults.length - 1);
          updateSelection();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          selectedIndex = Math.max(selectedIndex - 1, 0);
          updateSelection();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (filteredResults[selectedIndex]) {
            window.location.hash = filteredResults[selectedIndex].hash;
            closeSearch();
          }
        } else if (e.key === 'Escape') {
          closeSearch();
        }
      });
    }

    function updateSelection() {
      const items = searchResults.querySelectorAll('.search-result-item');
      items.forEach((item, idx) => {
        item.classList.toggle('selected', idx === selectedIndex);
        if (idx === selectedIndex) {
          item.scrollIntoView({ block: 'nearest' });
        }
      });
    }

    searchTriggers.forEach((trigger) => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        openSearch();
      });
    });

    if (searchModal) {
      searchModal.addEventListener('click', (e) => {
        if (e.target === searchModal) closeSearch();
      });
    }

    // Global Key Listener for ⌘K / Ctrl+K / /
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (searchModal?.classList.contains('open')) {
          closeSearch();
        } else {
          openSearch();
        }
      }
      if (e.key === 'Escape' && searchModal?.classList.contains('open')) {
        closeSearch();
      }
    });

    // 2. ScrollSpy & TOC Section Active Highlighting
    const sections = document.querySelectorAll('.docs-section');
    const sidebarLinks = document.querySelectorAll('.sidebar-nav-link');
    const tocLinks = document.querySelectorAll('.toc-link');

    function updateActiveHeading() {
      const scrollPos = window.scrollY + 120;

      let currentId = '';
      sections.forEach((sec) => {
        const top = sec.offsetTop;
        const height = sec.offsetHeight;
        if (scrollPos >= top && scrollPos < top + height) {
          currentId = sec.getAttribute('id');
        }
      });

      if (currentId) {
        sidebarLinks.forEach((link) => {
          const href = link.getAttribute('href');
          link.classList.toggle('active', href === `#${currentId}`);
        });

        tocLinks.forEach((link) => {
          const href = link.getAttribute('href');
          link.classList.toggle('active', href === `#${currentId}`);
        });
      }
    }

    window.addEventListener('scroll', updateActiveHeading, { passive: true });
    updateActiveHeading();
  });
})();
