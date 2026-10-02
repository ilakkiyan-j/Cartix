/**
 * Cartix Website Navigation & Global UI Controller
 */

(function () {
  'use strict';

  // Theme Management (Dark / Light Mode)
  const THEME_STORAGE_KEY = 'cartix_theme_preference';
  
  function getPreferredTheme() {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved) return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    
    // Update theme toggle icons if present
    const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
    toggleBtns.forEach((btn) => {
      btn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
      btn.innerHTML = theme === 'dark' 
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    });
  }

  // Initialize Theme immediately
  const initialTheme = getPreferredTheme();
  applyTheme(initialTheme);

  document.addEventListener('DOMContentLoaded', () => {
    // Re-apply to ensure DOM elements updated
    applyTheme(getPreferredTheme());

    // Theme toggle listeners
    document.querySelectorAll('.theme-toggle-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        applyTheme(current === 'dark' ? 'light' : 'dark');
      });
    });

    // Mobile Menu Drawer
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileNavDrawer = document.querySelector('.mobile-docs-drawer');
    const mobileDrawerBackdrop = document.querySelector('.mobile-drawer-backdrop');

    if (mobileMenuBtn && mobileNavDrawer && mobileDrawerBackdrop) {
      mobileMenuBtn.addEventListener('click', () => {
        mobileNavDrawer.classList.toggle('open');
        mobileDrawerBackdrop.classList.toggle('open');
      });

      mobileDrawerBackdrop.addEventListener('click', () => {
        mobileNavDrawer.classList.remove('open');
        mobileDrawerBackdrop.classList.remove('open');
      });
    }

    // Header scroll background elevation
    const header = document.querySelector('.site-header');
    if (header) {
      window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
          header.style.borderBottomColor = 'var(--border-medium)';
          header.style.boxShadow = 'var(--shadow-sm)';
        } else {
          header.style.borderBottomColor = 'var(--border-subtle)';
          header.style.boxShadow = 'none';
        }
      }, { passive: true });
    }
  });
})();
