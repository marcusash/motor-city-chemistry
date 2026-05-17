/**
 * canvas-watermark.js
 * Injects the standard Canvas chrome bar into every Forge canvas.
 * Agent: FD | Color: #FFCB05 | Icon: Viewport (locked)
 *
 * Bar spec (locked by FD):
 *   Left  — activated viewport icon · "Canvas" label · divider · document.title
 *   Center — canvas path link (monospace, dim)
 *   Right  — [Light / Dark toggle] · [Open in Browser] · FD badge
 *   Height: 40px | BG dark: #0A1520 | BG light: #E8EDF2
 *
 * Injected server-side by dispatch-server.js. Do not include manually.
 * Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
 */
(function () {
  const MAIZE   = '#FFCB05';
  const BAR_BG  = '#0A1520';
  const BAR_H   = '40px';
  const FONT    = "'Inter','Segoe UI',system-ui,sans-serif";
  const MONO    = "'Cascadia Code','Consolas',monospace";

  // ── Light theme overrides ──────────────────────────────────────────────────
  const LIGHT_CSS = `
    :root, body {
      --bg: #F0F2F5 !important; --surface: #FFFFFF !important;
      --surface2: #E8EDF2 !important; --border: rgba(0,0,0,0.10) !important;
      --text: #1A1D23 !important; --text-sub: #4B5568 !important;
      --size-bg: #FFFFFF !important; --tab-active: rgba(0,0,0,0.07) !important;
      --cell-empty: rgba(0,0,0,0.04) !important; --muted: #4B5568 !important;
    }
    body { background: #F0F2F5 !important; color: #1A1D23 !important; }
    .card, [class*="card"] { background: #FFFFFF !important; }
    .size-box, [class*="size-box"] { background: #F5F7FA !important; }
  `;
  let lightStyleEl = null;
  let isDark = true;

  // ── Activated viewport icon (locked geometry) ──────────────────────────────
  const ICON = `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;width:22px;height:22px;flex-shrink:0;">
    <line x1="14" y1="28" x2="14" y2="14" stroke="${MAIZE}" stroke-width="6" stroke-linecap="round"/>
    <line x1="14" y1="14" x2="28" y2="14" stroke="${MAIZE}" stroke-width="6" stroke-linecap="round"/>
    <line x1="66" y1="28" x2="66" y2="14" stroke="${MAIZE}" stroke-width="6" stroke-linecap="round"/>
    <line x1="66" y1="14" x2="52" y2="14" stroke="${MAIZE}" stroke-width="6" stroke-linecap="round"/>
    <line x1="14" y1="52" x2="14" y2="66" stroke="${MAIZE}" stroke-width="6" stroke-linecap="round"/>
    <line x1="14" y1="66" x2="28" y2="66" stroke="${MAIZE}" stroke-width="6" stroke-linecap="round"/>
    <line x1="66" y1="52" x2="66" y2="66" stroke="${MAIZE}" stroke-width="6" stroke-linecap="round"/>
    <line x1="66" y1="66" x2="52" y2="66" stroke="${MAIZE}" stroke-width="6" stroke-linecap="round"/>
    <circle cx="40" cy="40" r="6" fill="${MAIZE}"/>
  </svg>`;

  // ── Build bar ──────────────────────────────────────────────────────────────
  const title     = document.title || 'Canvas';
  const href      = window.location.href;
  const pathLabel = window.location.pathname.replace(/^\/canvas\//, '').replace(/\.html$/, '');

  const bar = document.createElement('div');
  bar.id = 'canvas-watermark';
  Object.assign(bar.style, {
    display: 'flex', alignItems: 'center', gap: '8px',
    height: BAR_H, padding: '0 14px',
    background: BAR_BG,
    borderBottom: '1px solid rgba(255,203,5,0.15)',
    position: 'sticky', top: '0', zIndex: '9999',
    boxSizing: 'border-box', width: '100%', flexShrink: '0',
    fontFamily: FONT,
  });

  // Left: icon + labels
  const left = document.createElement('div');
  left.style.cssText = 'display:flex;align-items:center;gap:7px;flex:1;min-width:0;overflow:hidden;';
  left.innerHTML = `
    ${ICON}
    <span style="font:700 10px/1 ${MONO};letter-spacing:0.14em;color:${MAIZE};text-transform:uppercase;white-space:nowrap;">Canvas</span>
    <span style="color:rgba(200,216,232,0.25);font-size:11px;">|</span>
    <span style="font-size:12px;font-weight:600;color:rgba(200,216,232,0.80);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${title}">${title}</span>
    <span style="color:rgba(200,216,232,0.20);font-size:11px;flex-shrink:0;">·</span>
    <a href="${href}" style="font:11px/1 ${MONO};color:rgba(200,216,232,0.35);text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:1;" title="${href}">${pathLabel}</a>
  `;

  // Right: buttons + badge
  const right = document.createElement('div');
  right.style.cssText = 'display:flex;align-items:center;gap:5px;flex-shrink:0;margin-left:8px;';

  function makeBtn(label, onClick) {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = `
      background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.11);
      color:rgba(200,216,232,0.65); font:600 10px/1 ${FONT}; letter-spacing:0.05em;
      padding:4px 9px; border-radius:4px; cursor:pointer; white-space:nowrap;
    `;
    b.onmouseover = () => { b.style.background = 'rgba(255,255,255,0.11)'; b.style.color = '#E8EAF0'; };
    b.onmouseout  = () => { b.style.background = 'rgba(255,255,255,0.06)'; b.style.color = 'rgba(200,216,232,0.65)'; };
    b.onclick = onClick;
    return b;
  }

  const themeBtn = makeBtn('Light', function () {
    isDark = !isDark;
    if (isDark) {
      if (lightStyleEl) { lightStyleEl.remove(); lightStyleEl = null; }
      bar.style.background = BAR_BG;
      bar.style.borderBottomColor = 'rgba(255,203,5,0.15)';
      themeBtn.textContent = 'Light';
    } else {
      lightStyleEl = document.createElement('style');
      lightStyleEl.textContent = LIGHT_CSS;
      document.head.appendChild(lightStyleEl);
      bar.style.background = '#E8EDF2';
      bar.style.borderBottomColor = 'rgba(0,0,0,0.12)';
      themeBtn.textContent = 'Dark';
    }
  });

  const browserBtn = makeBtn('Open in Browser', () => window.open(href, '_blank'));

  const badge = document.createElement('span');
  badge.textContent = 'FD';
  badge.style.cssText = `
    font:700 10px/1 ${MONO}; letter-spacing:0.10em;
    color:${MAIZE}; background:rgba(255,203,5,0.12);
    border:1px solid rgba(255,203,5,0.25); border-radius:3px;
    padding:3px 6px; margin-left:3px; white-space:nowrap;
  `;

  right.appendChild(themeBtn);
  right.appendChild(browserBtn);
  right.appendChild(badge);

  bar.appendChild(left);
  bar.appendChild(right);

  document.body.insertBefore(bar, document.body.firstChild);
})();
