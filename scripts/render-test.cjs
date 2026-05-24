/**
 * render-test.cjs — Convert generated test JSON to printable HTML
 * 
 * Takes output from generate-test.cjs and produces a clean, printable
 * HTML practice test matching the Motor City Chemistry design system.
 * 
 * Usage:
 *   node scripts/generate-test.cjs report.json | node scripts/render-test.cjs > test.html
 *   node scripts/render-test.cjs < generated-test.json > practice.html
 *   node scripts/render-test.cjs generated-test.json > practice.html
 * 
 * Output: HTML file (no JavaScript) ready for print or iOS Files app.
 */

'use strict';

const fs = require('fs');
const path = require('path');

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderTest(test) {
  const date = test.generatedAt ? new Date(test.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  const standards = [...new Set(test.questions.map(q => q.standard))].sort();
  const standardsLabel = standards.join(', ');

  // Group questions by standard for sectioning
  const sections = {};
  for (const q of test.questions) {
    if (!sections[q.standard]) sections[q.standard] = [];
    sections[q.standard].push(q);
  }

  let questionsHtml = '';
  let qNum = 1;
  for (const [std, questions] of Object.entries(sections).sort()) {
    questionsHtml += `
<div class="section">
  <div class="section-hdr">Standard ${escapeHtml(std)}</div>
  ${questions.map(q => {
    const num = qNum++;
    const diffDots = '\u2022'.repeat(q.difficulty);
    return `
  <div class="q-card">
    <div class="q-head">
      <span class="q-num">Q${num}</span>
      <span class="q-diff" title="Difficulty ${q.difficulty}/3">${diffDots}</span>
      <span class="q-skill">${escapeHtml(q.skill)}</span>
    </div>
    <div class="q-text">${escapeHtml(q.question)}</div>
    <div class="answer-area"></div>
  </div>`;
  }).join('\n')}
</div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Kai: Chemistry Practice - Standards ${escapeHtml(standardsLabel)}</title>
<link href="https://fonts.googleapis.com/css2?family=Bangers&family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
:root{
  --bg:#0D0D0D;--card:#1A1A1A;--border:#333;
  --text:#fff;--dim:#A0A0A0;--sub:#ccc;
  --accent:#FFD700;--accent-hover:#F6EB61;--accent-dim:rgba(255,215,0,0.15);
  --correct:#22C55E;--incorrect:#EF4444;
  --font-display:'Bangers','Impact',cursive;
  --font-body:'Nunito','Helvetica Neue',sans-serif;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font-family:var(--font-body);font-size:15px;line-height:1.5;
  -webkit-font-smoothing:antialiased}
.wrap{max-width:680px;margin:0 auto;padding:24px 20px 60px}

/* HERO HEADER */
.test-hero{
  background:#000;border:1px solid var(--border);border-radius:12px;
  padding:28px 24px 22px;margin-bottom:28px;position:relative;overflow:hidden}
.test-hero::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;
  background:linear-gradient(90deg,var(--accent),var(--accent-hover))}
.test-hero-glow{position:absolute;top:-60px;left:50%;transform:translateX(-50%);
  width:300px;height:300px;background:radial-gradient(circle,rgba(255,215,0,0.06) 0%,transparent 70%);pointer-events:none}
.test-hero h1{font-family:var(--font-display);font-size:2.4rem;color:var(--accent);
  text-transform:uppercase;letter-spacing:.04em;line-height:1;margin-bottom:4px;position:relative}
.test-hero-sub{font-size:.8rem;color:var(--dim);text-transform:uppercase;letter-spacing:.1em;position:relative}
.test-meta{margin-top:14px;font-size:.75rem;color:var(--dim);display:flex;gap:16px;flex-wrap:wrap;position:relative}
.test-meta span{display:inline-flex;align-items:center;gap:4px}
.name-line{margin-top:14px;font-size:.85rem;color:var(--dim);position:relative}
.name-line span{display:inline-block;border-bottom:1px solid var(--accent);min-width:200px;margin-left:8px}

/* SECTIONS */
.section{margin-bottom:24px}
.section-hdr{font-family:var(--font-display);font-size:1.15rem;color:var(--accent);
  text-transform:uppercase;letter-spacing:.04em;padding:8px 0;
  border-bottom:1px solid var(--border);margin-bottom:14px}

/* QUESTION CARDS */
.q-card{background:var(--card);border:1px solid var(--border);border-left:5px solid var(--border);
  border-radius:10px;padding:16px 18px 14px;margin-bottom:12px;page-break-inside:avoid}
.q-head{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.q-num{font-family:var(--font-display);font-size:1.1rem;color:var(--accent);letter-spacing:.02em}
.q-diff{font-size:10px;color:var(--accent);letter-spacing:2px}
.q-skill{font-size:.7rem;color:var(--dim);text-transform:uppercase;letter-spacing:.06em;margin-left:auto;
  background:var(--accent-dim);padding:2px 8px;border-radius:4px}
.q-text{font-size:.95rem;line-height:1.55;color:var(--sub);margin-bottom:10px}
.answer-area{border:1px dashed var(--border);border-radius:6px;min-height:36px;
  background:var(--bg);padding:8px}

/* FOOTER */
.test-footer{margin-top:32px;padding-top:12px;border-top:1px solid var(--border);
  font-size:.7rem;color:var(--dim);text-align:center;text-transform:uppercase;letter-spacing:.08em}

/* PRINT: invert to light for paper */
@media print{
  :root{--bg:#fff;--card:#f8f9fa;--border:#ddd;--text:#111;--dim:#666;--sub:#333;
    --accent:#111;--accent-dim:rgba(0,0,0,0.05)}
  body{background:#fff;color:#111}
  .test-hero{background:#f5f5f5;border-color:#ccc}
  .test-hero::before{background:#111}
  .test-hero h1{color:#111}
  .q-card{border-left-color:#999;background:#fff}
  .q-num{color:#111}
  .answer-area{min-height:44px;border-style:solid;border-color:#bbb}
  .wrap{padding:12px 16px}
}
</style>
</head>
<body>
<div class="wrap">
  <div class="test-hero">
    <div class="test-hero-glow"></div>
    <h1>Chemistry Practice</h1>
    <div class="test-hero-sub">Motor City Chemistry &bull; Targeted Review</div>
    <div class="test-meta">
      <span>Standards: ${escapeHtml(standardsLabel)}</span>
      <span>${test.questionCount} questions</span>
      <span>${escapeHtml(date)}</span>
    </div>
    <div class="test-meta" style="margin-top:4px">
      <span>${escapeHtml(test.reason)}</span>
    </div>
    <div class="name-line">Name: <span></span></div>
  </div>

${questionsHtml}

  <div class="test-footer">
    Motor City Chemistry &mdash; Generated ${escapeHtml(date)}
  </div>
</div>
</body>
</html>`;
}

// --- CLI ---

if (require.main === module) {
  let input;

  const args = process.argv.slice(2);
  if (args.length > 0 && !args[0].startsWith('-') && fs.existsSync(args[0])) {
    input = fs.readFileSync(args[0], 'utf8');
  } else {
    // Read from stdin
    input = fs.readFileSync(0, 'utf8');
  }

  const test = JSON.parse(input);
  console.log(renderTest(test));
}

module.exports = { renderTest };
