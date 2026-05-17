/**
 * canvas-feedback.js
 * Drop-in feedback overlay for any Forge canvas HTML file.
 *
 * Usage: add ONE line to any canvas HTML before </body>:
 *   <script src="canvas-feedback.js"></script>
 *
 * Features:
 *   - Floating FD button (bottom-right, non-intrusive)
 *   - Slide-in drawer: voice input (Web Speech API) + text area
 *   - Auto-captures context label (slide number, section title, card title)
 *   - All feedback stored in-memory (session only)
 *   - Export → compiled HTML report (opens in new tab)
 *   - Keyboard: Escape to close, Ctrl+Enter to submit
 *
 * No external dependencies. No CDN. Pure DOM + CSS-in-JS.
 */
(function () {
  'use strict';

  // ─── Config ──────────────────────────────────────────────────────────────
  const CFG = {
    accentColor:  '#FFCB05',
    bgDark:       '#0A0A0F',
    bgSurface:    '#0F172A',
    bgBorder:     '#1E293B',
    textLight:    '#E2E8F0',
    textMuted:    '#64748B',
    textSubtle:   '#94A3B8',
    fontMono:     "'Cascadia Code', 'Consolas', monospace",
    fontSans:     "'Segoe UI Variable', 'Segoe UI', Arial, sans-serif",
    drawerWidth:  '360px',
    zIndex:       99999,
  };

  // ─── State ────────────────────────────────────────────────────────────────
  const state = {
    entries: [],       // { context, text, ts }
    open: false,
    listening: false,
    recognition: null,
  };

  // ─── CSS injection ────────────────────────────────────────────────────────
  const css = `
    #cfb-trigger {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: ${CFG.zIndex};
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: ${CFG.accentColor};
      color: #0A0A0F;
      border: none;
      cursor: pointer;
      font-family: ${CFG.fontMono};
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.05em;
      box-shadow: 0 2px 12px rgba(255,203,5,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.15s, box-shadow 0.15s;
      user-select: none;
    }
    #cfb-trigger:hover {
      transform: scale(1.08);
      box-shadow: 0 4px 20px rgba(255,203,5,0.5);
    }
    #cfb-trigger.has-entries::after {
      content: attr(data-count);
      position: absolute;
      top: -4px;
      right: -4px;
      background: #CE1126;
      color: #fff;
      font-size: 9px;
      font-weight: 800;
      min-width: 16px;
      height: 16px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 3px;
      font-family: ${CFG.fontMono};
    }

    #cfb-drawer {
      position: fixed;
      top: 0;
      right: 0;
      width: ${CFG.drawerWidth};
      height: 100vh;
      background: ${CFG.bgDark};
      border-left: 1px solid ${CFG.bgBorder};
      z-index: ${CFG.zIndex - 1};
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
      font-family: ${CFG.fontSans};
      box-shadow: -4px 0 32px rgba(0,0,0,0.6);
    }
    #cfb-drawer.open {
      transform: translateX(0);
    }

    #cfb-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 16px;
      border-bottom: 1px solid ${CFG.bgBorder};
      flex-shrink: 0;
    }
    #cfb-badge {
      background: ${CFG.accentColor};
      color: #0A0A0F;
      font-family: ${CFG.fontMono};
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.1em;
      padding: 2px 8px;
      border-radius: 3px;
    }
    #cfb-title {
      font-size: 13px;
      font-weight: 600;
      color: ${CFG.textLight};
      flex: 1;
    }
    #cfb-close {
      background: none;
      border: none;
      color: ${CFG.textMuted};
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
      padding: 2px 4px;
      border-radius: 3px;
    }
    #cfb-close:hover { color: ${CFG.textLight}; }

    #cfb-context-row {
      padding: 10px 16px 6px;
      flex-shrink: 0;
    }
    #cfb-context-label {
      font-family: ${CFG.fontMono};
      font-size: 9px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: ${CFG.textMuted};
      margin-bottom: 4px;
    }
    #cfb-context-value {
      font-size: 12px;
      color: ${CFG.accentColor};
      font-family: ${CFG.fontMono};
      background: #1A1600;
      border: 1px solid #3A2E00;
      border-radius: 5px;
      padding: 5px 8px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    #cfb-input-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 10px 16px;
      min-height: 0;
    }
    #cfb-voice-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      background: ${CFG.bgSurface};
      border: 1px solid ${CFG.bgBorder};
      border-radius: 7px;
      padding: 9px 14px;
      cursor: pointer;
      color: ${CFG.textMuted};
      font-family: ${CFG.fontMono};
      font-size: 11px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      transition: all 0.15s;
      flex-shrink: 0;
    }
    #cfb-voice-btn:hover { border-color: #2D4A6A; color: ${CFG.textLight}; }
    #cfb-voice-btn.active {
      background: #0D1F12;
      border-color: #22C55E;
      color: #22C55E;
    }
    #cfb-voice-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
    }
    #cfb-voice-btn.active #cfb-voice-dot {
      animation: cfb-pulse 1s infinite;
    }
    @keyframes cfb-pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.3; }
    }

    #cfb-textarea {
      flex: 1;
      background: ${CFG.bgSurface};
      border: 1px solid ${CFG.bgBorder};
      border-radius: 7px;
      color: ${CFG.textLight};
      font-family: ${CFG.fontSans};
      font-size: 13px;
      line-height: 1.55;
      padding: 10px 12px;
      resize: none;
      outline: none;
      min-height: 120px;
    }
    #cfb-textarea:focus { border-color: #2D4A6A; }
    #cfb-textarea::placeholder { color: ${CFG.textMuted}; }

    #cfb-submit-row {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }
    #cfb-submit {
      flex: 1;
      background: ${CFG.accentColor};
      color: #0A0A0F;
      border: none;
      border-radius: 7px;
      padding: 10px;
      font-size: 12px;
      font-weight: 700;
      font-family: ${CFG.fontMono};
      letter-spacing: 0.08em;
      text-transform: uppercase;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    #cfb-submit:hover { opacity: 0.85; }
    #cfb-submit:disabled { opacity: 0.4; cursor: default; }

    #cfb-hint {
      font-size: 10px;
      color: ${CFG.textMuted};
      font-family: ${CFG.fontMono};
      text-align: center;
      flex-shrink: 0;
      margin-top: 2px;
    }

    #cfb-send-row {
      padding: 0 16px 10px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
      border-bottom: 1px solid ${CFG.bgBorder};
    }
    #cfb-send-label {
      font-family: ${CFG.fontMono};
      font-size: 9px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: ${CFG.textMuted};
      padding-top: 8px;
    }
    #cfb-agents {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }
    .cfb-agent-chip {
      font-family: ${CFG.fontMono};
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      padding: 3px 10px;
      border-radius: 12px;
      border: 1px solid ${CFG.bgBorder};
      background: ${CFG.bgSurface};
      color: ${CFG.textMuted};
      cursor: pointer;
      transition: all 0.12s;
      user-select: none;
    }
    .cfb-agent-chip:hover { border-color: ${CFG.accentColor}; color: ${CFG.accentColor}; }
    .cfb-agent-chip.selected { background: #1A1600; border-color: ${CFG.accentColor}; color: ${CFG.accentColor}; }
    .cfb-agent-chip[data-id="ALL"] { border-color: #2D4A6A; color: #7BA7D4; }
    .cfb-agent-chip[data-id="ALL"].selected { background: #071020; border-color: #4A90D9; color: #4A90D9; }
    #cfb-send {
      background: ${CFG.bgSurface};
      border: 1px solid ${CFG.bgBorder};
      border-radius: 7px;
      color: ${CFG.textLight};
      font-family: ${CFG.fontMono};
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 8px;
      cursor: pointer;
      transition: all 0.15s;
    }
    #cfb-send:not(:disabled):hover { border-color: ${CFG.accentColor}; color: ${CFG.accentColor}; }
    #cfb-send:disabled { opacity: 0.35; cursor: default; }
    #cfb-send-status {
      font-family: ${CFG.fontMono};
      font-size: 10px;
      color: #22C55E;
      text-align: center;
      min-height: 14px;
    }
      overflow-y: auto;
      padding: 0 16px 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-height: 0;
    }
    #cfb-log::-webkit-scrollbar { width: 3px; }
    #cfb-log::-webkit-scrollbar-thumb { background: ${CFG.bgBorder}; border-radius: 2px; }

    #cfb-log-label {
      font-family: ${CFG.fontMono};
      font-size: 9px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: ${CFG.textMuted};
      padding: 8px 0 4px;
      border-top: 1px solid ${CFG.bgBorder};
      flex-shrink: 0;
    }
    .cfb-entry {
      background: ${CFG.bgSurface};
      border: 1px solid ${CFG.bgBorder};
      border-left: 3px solid ${CFG.accentColor};
      border-radius: 6px;
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .cfb-entry-ctx {
      font-family: ${CFG.fontMono};
      font-size: 9px;
      color: ${CFG.textMuted};
      display: flex;
      justify-content: space-between;
    }
    .cfb-entry-text {
      font-size: 12px;
      color: ${CFG.textLight};
      line-height: 1.45;
    }

    #cfb-footer {
      padding: 10px 16px 16px;
      border-top: 1px solid ${CFG.bgBorder};
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }
    #cfb-export {
      flex: 1;
      background: ${CFG.bgSurface};
      border: 1px solid ${CFG.bgBorder};
      border-radius: 7px;
      color: ${CFG.textLight};
      font-family: ${CFG.fontMono};
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 8px;
      cursor: pointer;
      transition: border-color 0.15s;
      font-weight: 600;
    }
    #cfb-export:hover { border-color: ${CFG.accentColor}; color: ${CFG.accentColor}; }
    #cfb-clear {
      background: none;
      border: 1px solid ${CFG.bgBorder};
      border-radius: 7px;
      color: ${CFG.textMuted};
      font-family: ${CFG.fontMono};
      font-size: 10px;
      padding: 8px 12px;
      cursor: pointer;
    }
    #cfb-clear:hover { border-color: #7F1D1D; color: #FCA5A5; }
  `;

  // ─── Inject CSS ───────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // ─── Context detection ────────────────────────────────────────────────────
  function detectContext() {
    // Priority order: data-cfb-label attribute on visible element,
    // then slide counter, then section label, then card title, then page title
    const labeled = document.querySelector('[data-cfb-label]');
    if (labeled) return labeled.getAttribute('data-cfb-label');

    // Try to find the topmost visible slide/section title
    const candidates = [
      '.slide-num',
      '.slide-label',
      '.section-label',
      '[class*="slide-num"]',
      '[class*="section"]',
      '.col-label.active',
      'h1',
      'h2',
    ];

    for (const sel of candidates) {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        const rect = el.getBoundingClientRect();
        if (rect.top >= 0 && rect.top < window.innerHeight * 0.7) {
          const text = el.textContent.trim().slice(0, 60);
          if (text) return text;
        }
      }
    }

    // Fall back to document title + scroll %
    const pct = Math.round((window.scrollY / Math.max(document.body.scrollHeight - window.innerHeight, 1)) * 100);
    return `${document.title || 'canvas'} @ ${pct}%`;
  }

  // ─── DOM build ────────────────────────────────────────────────────────────
  // Trigger button
  const trigger = document.createElement('button');
  trigger.id = 'cfb-trigger';
  trigger.textContent = 'FD';
  trigger.title = 'Canvas Feedback (FD)';

  // Drawer
  const drawer = document.createElement('div');
  drawer.id = 'cfb-drawer';
  drawer.innerHTML = `
    <div id="cfb-header">
      <div id="cfb-badge">FD</div>
      <div id="cfb-title">Canvas Feedback</div>
      <button id="cfb-close" title="Close (Esc)">×</button>
    </div>
    <div id="cfb-context-row">
      <div id="cfb-context-label">Context</div>
      <div id="cfb-context-value">—</div>
    </div>
    <div id="cfb-input-area">
      <button id="cfb-voice-btn">
        <div id="cfb-voice-dot"></div>
        <span id="cfb-voice-label">Hold to speak</span>
      </button>
      <textarea id="cfb-textarea" placeholder="Type feedback… (Ctrl+Enter to submit)" rows="6"></textarea>
      <div id="cfb-submit-row">
        <button id="cfb-submit" disabled>Submit</button>
      </div>
      <div id="cfb-hint">Ctrl+Enter to submit · Esc to close</div>
    </div>
      <div id="cfb-send-row">
        <div id="cfb-send-label">Send as Forge Mail</div>
        <div id="cfb-agents">
          <div class="cfb-agent-chip" data-id="ALL">ALL</div>
          <div class="cfb-agent-chip" data-id="FA">FA</div>
          <div class="cfb-agent-chip" data-id="FP">FP</div>
          <div class="cfb-agent-chip" data-id="FF">FF</div>
          <div class="cfb-agent-chip" data-id="FR">FR</div>
          <div class="cfb-agent-chip" data-id="FI">FI</div>
          <div class="cfb-agent-chip" data-id="FO">FO</div>
        </div>
        <button id="cfb-send" disabled>Send to Selected</button>
        <div id="cfb-send-status"></div>
      </div>
      <div id="cfb-log">
      <div id="cfb-log-label">Feedback this session (0)</div>
    </div>
    <div id="cfb-footer">
      <button id="cfb-export">Export Report</button>
      <button id="cfb-clear">Clear</button>
    </div>
  `;

  document.body.appendChild(trigger);
  document.body.appendChild(drawer);

  // ─── Element refs ─────────────────────────────────────────────────────────
  const els = {
    contextValue: drawer.querySelector('#cfb-context-value'),
    voiceBtn:     drawer.querySelector('#cfb-voice-btn'),
    voiceLabel:   drawer.querySelector('#cfb-voice-label'),
    textarea:     drawer.querySelector('#cfb-textarea'),
    submit:       drawer.querySelector('#cfb-submit'),
    log:          drawer.querySelector('#cfb-log'),
    logLabel:     drawer.querySelector('#cfb-log-label'),
    closeBtn:     drawer.querySelector('#cfb-close'),
    exportBtn:    drawer.querySelector('#cfb-export'),
    clearBtn:     drawer.querySelector('#cfb-clear'),
    sendBtn:      drawer.querySelector('#cfb-send'),
    sendStatus:   drawer.querySelector('#cfb-send-status'),
    agents:       drawer.querySelectorAll('.cfb-agent-chip'),
  };

  // ─── Open / close ─────────────────────────────────────────────────────────
  function openDrawer() {
    state.open = true;
    drawer.classList.add('open');
    els.contextValue.textContent = detectContext();
    els.textarea.focus();
  }

  function closeDrawer() {
    state.open = false;
    drawer.classList.remove('open');
    stopVoice();
  }

  trigger.addEventListener('click', () => state.open ? closeDrawer() : openDrawer());
  els.closeBtn.addEventListener('click', closeDrawer);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.open) closeDrawer();
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && state.open) submitFeedback();
  });

  // ─── Textarea → enable submit ─────────────────────────────────────────────
  els.textarea.addEventListener('input', () => {
    els.submit.disabled = els.textarea.value.trim().length === 0;
  });

  // Update context on scroll (debounced)
  let scrollTimer;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      if (state.open) els.contextValue.textContent = detectContext();
    }, 300);
  }, { passive: true });

  // ─── Submit feedback ──────────────────────────────────────────────────────
  function submitFeedback() {
    const text = els.textarea.value.trim();
    if (!text) return;

    const entry = {
      context: els.contextValue.textContent,
      text,
      ts: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };

    state.entries.push(entry);
    els.textarea.value = '';
    els.submit.disabled = true;

    renderLogEntry(entry);
    updateTriggerBadge();
    updateSendBtn();

    // Flash the log label
    els.logLabel.style.color = CFG.accentColor;
    setTimeout(() => { els.logLabel.style.color = ''; }, 800);
  }

  els.submit.addEventListener('click', submitFeedback);

  // ─── Agent chip selection ─────────────────────────────────────────────────
  const selectedAgents = new Set();

  els.agents.forEach(chip => {
    chip.addEventListener('click', () => {
      const id = chip.dataset.id;
      if (id === 'ALL') {
        // Toggle: if ALL selected, clear all; otherwise select all
        if (selectedAgents.has('ALL')) {
          selectedAgents.clear();
          els.agents.forEach(c => c.classList.remove('selected'));
        } else {
          selectedAgents.clear();
          selectedAgents.add('ALL');
          els.agents.forEach(c => c.classList.add('selected'));
        }
      } else {
        if (selectedAgents.has(id)) {
          selectedAgents.delete(id);
          chip.classList.remove('selected');
        } else {
          selectedAgents.add(id);
          chip.classList.add('selected');
          // Deselect ALL if individual selected
          selectedAgents.delete('ALL');
          drawer.querySelector('[data-id="ALL"]').classList.remove('selected');
        }
      }
      updateSendBtn();
    });
  });

  function updateSendBtn() {
    const hasFeedback = state.entries.length > 0;
    const hasTarget = selectedAgents.size > 0;
    els.sendBtn.disabled = !(hasFeedback && hasTarget);
    if (selectedAgents.has('ALL')) {
      els.sendBtn.textContent = 'Send to All Agents';
    } else if (selectedAgents.size > 0) {
      els.sendBtn.textContent = `Send to ${[...selectedAgents].join(', ')}`;
    } else {
      els.sendBtn.textContent = 'Send to Selected';
    }
  }

  // ─── Send as Forge Mail ───────────────────────────────────────────────────
  els.sendBtn.addEventListener('click', async () => {
    if (state.entries.length === 0 || selectedAgents.size === 0) return;

    const canvasPath = window.location.pathname.replace(/\\/g, '/').replace(/^\/([A-Za-z]):/, '$1:');
    const canvasTitle = document.title || 'Canvas';
    const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
    const summary = state.entries.map((e, i) => `[${i+1}] ${e.context}: ${e.text}`).join('\n\n');

    const targets = selectedAgents.has('ALL')
      ? ['FA','FP','FF','FR','FI','FO']
      : [...selectedAgents];

    let sent = 0;
    for (const agentId of targets) {
      const msg = {
        from: 'MARCUS',
        to: agentId,
        subject: `Canvas feedback: ${canvasTitle}`,
        body: `Marcus reviewed canvas: ${canvasTitle}\n\nFeedback (${state.entries.length} note${state.entries.length !== 1 ? 's' : ''}):\n\n${summary}`,
        date: new Date().toISOString(),
        type: 'feedback',
        canvas: canvasPath,
        priority: 'normal',
      };

      // Try local canvas-server first (one-click, no prompts)
      let delivered = false;
      try {
        const r = await fetch(`http://127.0.0.1:7432/inbox/${agentId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(msg),
        });
        if (r.ok) { delivered = true; sent++; }
      } catch { /* server not running — fall through to file picker */ }

      if (!delivered) {
        // Fallback: showSaveFilePicker or blob download
        const json = JSON.stringify(msg, null, 2);
        const filename = `${ts}-from-MARCUS-canvas-feedback-${canvasTitle.replace(/\s+/g,'-').toLowerCase().slice(0,20)}.json`;
        try {
          if (window.showSaveFilePicker) {
            const fh = await window.showSaveFilePicker({
              suggestedName: filename,
              types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
            });
            const writable = await fh.createWritable();
            await writable.write(json);
            await writable.close();
          } else {
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = filename; a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }
          sent++;
        } catch (err) {
          if (err.name !== 'AbortError') console.error('cfb send error', err);
        }
      }
    }

    if (sent > 0) {
      const serverMode = sent === targets.length;
      els.sendStatus.textContent = serverMode
        ? `Sent to ${sent} agent${sent !== 1 ? 's' : ''}`
        : `Sent to ${sent} — save remaining to inbox folder`;
      setTimeout(() => { els.sendStatus.textContent = ''; }, 4000);
    }
  });

  // ─── Render log entry ─────────────────────────────────────────────────────
  function renderLogEntry(entry) {
    const div = document.createElement('div');
    div.className = 'cfb-entry';
    div.innerHTML = `
      <div class="cfb-entry-ctx">
        <span>${escHtml(entry.context.slice(0, 48))}</span>
        <span>${entry.ts.slice(11)}</span>
      </div>
      <div class="cfb-entry-text">${escHtml(entry.text)}</div>
    `;
    // Insert after the log label
    const label = els.logLabel;
    label.parentNode.insertBefore(div, label.nextSibling);
    els.logLabel.textContent = `Feedback this session (${state.entries.length})`;
  }

  function updateTriggerBadge() {
    const n = state.entries.length;
    if (n > 0) {
      trigger.classList.add('has-entries');
      trigger.setAttribute('data-count', n);
    } else {
      trigger.classList.remove('has-entries');
    }
  }

  // ─── Voice input ──────────────────────────────────────────────────────────
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SpeechRecognition) {
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';
    state.recognition = rec;

    let interim = '';

    rec.onstart = () => {
      state.listening = true;
      els.voiceBtn.classList.add('active');
      els.voiceLabel.textContent = 'Listening…';
      interim = '';
    };

    rec.onresult = (e) => {
      let final = '';
      interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      if (final) {
        els.textarea.value += (els.textarea.value ? ' ' : '') + final.trim();
        els.submit.disabled = els.textarea.value.trim().length === 0;
      }
    };

    rec.onend = () => {
      state.listening = false;
      els.voiceBtn.classList.remove('active');
      els.voiceLabel.textContent = 'Hold to speak';
    };

    rec.onerror = () => {
      state.listening = false;
      els.voiceBtn.classList.remove('active');
      els.voiceLabel.textContent = 'Hold to speak';
    };

    els.voiceBtn.addEventListener('mousedown', () => {
      if (!state.listening) rec.start();
    });
    els.voiceBtn.addEventListener('mouseup', () => {
      if (state.listening) rec.stop();
    });
    els.voiceBtn.addEventListener('mouseleave', () => {
      if (state.listening) rec.stop();
    });
    // Touch support
    els.voiceBtn.addEventListener('touchstart', (e) => { e.preventDefault(); if (!state.listening) rec.start(); });
    els.voiceBtn.addEventListener('touchend',   (e) => { e.preventDefault(); if (state.listening) rec.stop(); });

  } else {
    // No speech API — hide voice button
    els.voiceBtn.style.display = 'none';
  }

  function stopVoice() {
    if (state.listening && state.recognition) {
      state.recognition.stop();
    }
  }

  // ─── Clear ────────────────────────────────────────────────────────────────
  els.clearBtn.addEventListener('click', () => {
    if (state.entries.length === 0) return;
    if (!confirm('Clear all feedback? This cannot be undone.')) return;
    state.entries = [];
    // Remove all entry divs from log
    const entries = els.log.querySelectorAll('.cfb-entry');
    entries.forEach(e => e.remove());
    els.logLabel.textContent = 'Feedback this session (0)';
    updateTriggerBadge();
    updateSendBtn();
  });

  // ─── Export report ────────────────────────────────────────────────────────
  els.exportBtn.addEventListener('click', () => {
    if (state.entries.length === 0) {
      alert('No feedback to export yet.');
      return;
    }
    const reportHtml = generateReport();
    const blob = new Blob([reportHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fd-feedback-${new Date().toISOString().slice(0,10)}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  function generateReport() {
    const canvasTitle = document.title || 'Canvas';
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const rows = state.entries.map((e, i) => `
      <div class="entry">
        <div class="entry-header">
          <span class="entry-num">#${String(i + 1).padStart(2, '0')}</span>
          <span class="entry-ctx">${escHtml(e.context)}</span>
          <span class="entry-ts">${e.ts}</span>
        </div>
        <div class="entry-text">${escHtml(e.text)}</div>
      </div>
    `).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>FD Feedback Report — ${escHtml(canvasTitle)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #F1F5F9; color: #1E293B; font-family: 'Segoe UI Variable','Segoe UI',Arial,sans-serif; padding: 48px; }
  h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; letter-spacing: -0.02em; }
  .meta { font-size: 12px; color: #64748B; font-family: 'Cascadia Code',monospace; margin-bottom: 32px; }
  .entry { background: #fff; border: 1px solid #E2E8F0; border-left: 4px solid #FFCB05; border-radius: 8px; padding: 16px 20px; margin-bottom: 12px; }
  .entry-header { display: flex; gap: 12px; align-items: baseline; margin-bottom: 8px; }
  .entry-num { font-family: 'Cascadia Code',monospace; font-size: 11px; font-weight: 700; color: #FFCB05; background: #1E293B; padding: 1px 6px; border-radius: 3px; }
  .entry-ctx { font-family: 'Cascadia Code',monospace; font-size: 11px; color: #64748B; flex: 1; }
  .entry-ts  { font-family: 'Cascadia Code',monospace; font-size: 10px; color: #94A3B8; }
  .entry-text { font-size: 14px; color: #1E293B; line-height: 1.6; white-space: pre-wrap; }
  .report-footer { margin-top: 32px; font-size: 11px; color: #94A3B8; font-family: 'Cascadia Code',monospace; }
</style>
</head>
<body>
<h1>FD Feedback Report</h1>
<div class="meta">Canvas: ${escHtml(canvasTitle)} · Exported: ${now} · ${state.entries.length} item${state.entries.length !== 1 ? 's' : ''}</div>
${rows}
<div class="report-footer">Generated by canvas-feedback.js · FD (Maize) · Forge Design System</div>
</body>
</html>`;
  }

  // ─── Util ─────────────────────────────────────────────────────────────────
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

})();
