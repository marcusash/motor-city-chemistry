/**
 * pipeline.cjs — Full E2E grading pipeline
 * 
 * Runs: grade → generate-test → render-test → HTML output
 * 
 * Usage:
 *   node scripts/pipeline.cjs <student-answers> <answer-key> [output.html]
 *   npm run pipeline -- data/sample-student-answers.json data/answer-key-42-flat.json
 * 
 * If no args, uses sample data for demo.
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const studentFile = args[0] || 'data/sample-student-answers.json';
const keyFile = args[1] || 'data/answer-key-42-flat.json';
const outFile = args[2] || 'artifacts/kai-practice-generated.html';

const root = path.resolve(__dirname, '..');
const abs = f => path.resolve(root, f);

// Verify inputs exist
if (!fs.existsSync(abs(studentFile))) {
  console.error(`Error: Student answers not found: ${studentFile}`);
  process.exit(1);
}
if (!fs.existsSync(abs(keyFile))) {
  console.error(`Error: Answer key not found: ${keyFile}`);
  process.exit(1);
}

const tmpReport = abs(`data/_pipeline-report-${process.pid}.json`);
const tmpTest = abs(`data/_pipeline-test-${process.pid}.json`);

function cleanup() {
  try { fs.unlinkSync(tmpReport); } catch {}
  try { fs.unlinkSync(tmpTest); } catch {}
}

try {
  console.log(`[pipeline] Grading: ${studentFile} against ${keyFile}`);
  const gradeJson = execSync(`node scripts/grade.cjs "${abs(studentFile)}" "${abs(keyFile)}"`, { cwd: root });

  console.log(`[pipeline] Generating practice test from grade report...`);
  fs.writeFileSync(tmpReport, gradeJson);

  const testJson = execSync(`node scripts/generate-test.cjs "${tmpReport}"`, { cwd: root });

  console.log(`[pipeline] Rendering HTML...`);
  fs.writeFileSync(tmpTest, testJson);

  const html = execSync(`node scripts/render-test.cjs "${tmpTest}"`, { cwd: root });

  // Write output
  const outPath = abs(outFile);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html);

  console.log(`[pipeline] Done → ${outFile} (${html.length} bytes)`);
} catch (err) {
  console.error(`[pipeline] FAILED at stage: ${err.message.split('\n')[0]}`);
  if (err.stderr) console.error(err.stderr.toString());
  process.exit(1);
} finally {
  cleanup();
}
