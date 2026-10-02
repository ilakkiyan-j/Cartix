/**
 * Cartix Main Application Controller
 * Handles interactive tool tabs, copy buttons, and landing page interactions
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    // 1. Interactive Tool Tabs Switcher
    const toolTabBtns = document.querySelectorAll('.tool-tab-btn');
    const toolTabPanels = document.querySelectorAll('.tools-tab-content-panel');

    toolTabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetTool = btn.getAttribute('data-tool');
        if (!targetTool) return;

        toolTabBtns.forEach((b) => b.classList.remove('active'));
        toolTabPanels.forEach((p) => p.classList.remove('active'));

        btn.classList.add('active');
        const activePanel = document.getElementById(`panel-${targetTool}`);
        if (activePanel) {
          activePanel.classList.add('active');
        }
      });
    });

    // 2. Copy Code to Clipboard functionality
    const copyBtns = document.querySelectorAll('.copy-code-btn');
    copyBtns.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const codeBlock = btn.closest('.code-window')?.querySelector('pre code');
        if (!codeBlock) return;

        const codeText = codeBlock.innerText;
        try {
          await navigator.clipboard.writeText(codeText);
          const originalHTML = btn.innerHTML;
          btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent-emerald)"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!`;
          setTimeout(() => {
            btn.innerHTML = originalHTML;
          }, 2000);
        } catch (err) {
          console.error('Clipboard copy failed:', err);
        }
      });
    });

    // 3. Quickstart Transport Mode Switcher
    const transportBtns = document.querySelectorAll('.transport-btn');
    const transportPanels = document.querySelectorAll('.transport-panel');

    transportBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        if (!mode) return;

        transportBtns.forEach((b) => b.classList.remove('active'));
        transportPanels.forEach((p) => p.classList.remove('active'));

        btn.classList.add('active');
        const activePanel = document.getElementById(`transport-${mode}`);
        if (activePanel) activePanel.classList.add('active');
      });
    });
  });
})();
