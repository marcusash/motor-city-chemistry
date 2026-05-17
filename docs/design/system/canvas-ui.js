/**
 * canvas-ui.js — Forge Canvas Universal UI
 * Owned by FD. Shared across all pitch-deck canvases.
 *
 * Injects a "Feedback" toggle button when a canvas is viewed directly
 * (not inside an iframe). Clicking it opens canvas-feedback.html with
 * the current canvas pre-loaded, so feedback mode works on any canvas
 * without per-canvas wiring.
 *
 * Usage: <script src="canvas-ui.js"></script> in any canvas <head>.
 * Already included in canvas-template.html.
 */
(function () {
  'use strict';

  // Only inject when viewed directly, not inside canvas-feedback.html's iframe.
  if (window !== window.top) return;

  // Derive current filename (e.g. "forge-start-prototype.html")
  const filename = window.location.pathname.split('/').pop() || window.location.href.split('/').pop();

  // Build button
  const btn = document.createElement('button');
  btn.id = 'canvas-feedback-btn';
  btn.textContent = '\u2316 Feedback';
  btn.title = 'Open this canvas in Feedback mode';
  btn.setAttribute('aria-label', 'Open in feedback mode');

  Object.assign(btn.style, {
    position:   'fixed',
    top:        '12px',
    right:      '16px',
    zIndex:     '99999',
    background: 'rgba(6,182,212,0.08)',
    border:     '1px solid rgba(6,182,212,0.28)',
    borderRadius: '6px',
    padding:    '5px 13px',
    fontFamily: '"Cascadia Code","Fira Code","Consolas",monospace',
    fontSize:   '13px',
    color:      '#06B6D4',
    cursor:     'pointer',
    transition: 'background 0.15s, border-color 0.15s',
    lineHeight: '1.4',
    userSelect: 'none',
  });

  btn.addEventListener('mouseenter', function () {
    btn.style.background    = 'rgba(6,182,212,0.18)';
    btn.style.borderColor   = 'rgba(6,182,212,0.55)';
  });
  btn.addEventListener('mouseleave', function () {
    btn.style.background    = 'rgba(6,182,212,0.08)';
    btn.style.borderColor   = 'rgba(6,182,212,0.28)';
  });

  btn.addEventListener('click', function () {
    const base = window.location.href.replace(filename, '');
    window.open(base + 'canvas-feedback.html?canvas=' + encodeURIComponent(filename) + '&to=FD', '_blank');
  });

  // Inject after DOM is ready
  function inject() {
    // Remove any hardcoded per-canvas feedback button so there's no duplicate
    const old = document.getElementById('feedback-btn');
    if (old) old.remove();
    document.body.appendChild(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
}());
