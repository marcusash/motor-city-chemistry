/**
 * generate-test.cjs — Generate adaptive practice test from grade gaps
 * 
 * Reads a grade report (output of grade.cjs) and the question bank,
 * then generates a practice test targeting the student's weak skills.
 * 
 * Usage:
 *   node scripts/generate-test.cjs <grade-report.json>
 *   node scripts/generate-test.cjs --skills 4.2.2,4.2.7 --count 10
 *   node scripts/generate-test.cjs --standard 4.2 --count 15
 * 
 * Output: JSON practice test (question set) to stdout
 * Pipe to file: node scripts/generate-test.cjs report.json > test.json
 */

'use strict';

const fs = require('fs');
const path = require('path');

const BANK_PATH = path.join(__dirname, '..', 'data', 'question-bank.json');

function loadBank() {
  return JSON.parse(fs.readFileSync(BANK_PATH, 'utf8'));
}

/**
 * Extract weak skills from a grade report.
 * Returns skills with status 'NP' or below threshold.
 */
function findWeakSkills(gradeReport) {
  const weak = [];
  if (gradeReport.skills) {
    for (const [skill, data] of Object.entries(gradeReport.skills)) {
      if (data.status === 'NP') {
        weak.push({ skill, percentage: data.percentage, correct: data.correct, total: data.total });
      }
    }
  }
  // Sort weakest first
  weak.sort((a, b) => a.percentage - b.percentage);
  return weak;
}

/**
 * Select questions from the bank targeting specific skills.
 * Prioritizes: weakest skills get more questions, harder difficulty for near-passing.
 */
function selectQuestions(bank, targetSkills, count = 12) {
  const questions = bank.questions;
  const selected = [];
  const used = new Set();

  // Group questions by skill
  const bySkill = {};
  for (const q of questions) {
    if (!bySkill[q.skill]) bySkill[q.skill] = [];
    bySkill[q.skill].push(q);
  }

  // Also match by standard (skill prefix)
  const byStandard = {};
  for (const q of questions) {
    if (!byStandard[q.standard]) byStandard[q.standard] = [];
    byStandard[q.standard].push(q);
  }

  // Allocate questions proportionally to weak skills
  const skillList = targetSkills.length > 0 ? targetSkills : Object.keys(bySkill);
  const perSkill = Math.max(2, Math.ceil(count / skillList.length));

  for (const skill of skillList) {
    // Try exact skill match first, then standard match
    let pool = bySkill[skill] || [];
    if (pool.length === 0) {
      const standard = skill.split('.').slice(0, 2).join('.');
      pool = byStandard[standard] || [];
    }

    // Sort by difficulty (mix easy + hard for scaffolded practice)
    const sorted = [...pool].sort((a, b) => a.difficulty - b.difficulty);
    let added = 0;
    for (const q of sorted) {
      if (added >= perSkill) break;
      if (used.has(q.id)) continue;
      selected.push(q);
      used.add(q.id);
      added++;
    }
  }

  // If we haven't hit count yet, fill with random unused questions from target standards
  if (selected.length < count) {
    const standards = new Set(targetSkills.map(s => s.split('.').slice(0, 2).join('.')));
    const remaining = questions.filter(q => !used.has(q.id) && standards.has(q.standard));
    for (const q of remaining) {
      if (selected.length >= count) break;
      selected.push(q);
    }
  }

  return selected.slice(0, count);
}

/**
 * Generate a practice test object from selected questions.
 */
function generateTest(questions, metadata = {}) {
  return {
    testId: metadata.testId || `practice-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    targetSkills: metadata.targetSkills || [],
    reason: metadata.reason || 'adaptive',
    questionCount: questions.length,
    questions: questions.map((q, i) => ({
      number: i + 1,
      id: q.id,
      standard: q.standard,
      skill: q.skill,
      difficulty: q.difficulty,
      question: q.question,
      hint: q.hint,
      // Answer key stored separately for grading
      _answer: q.answer,
      _acceptableAnswers: q.acceptableAnswers
    }))
  };
}

// --- CLI ---

if (require.main === module) {
  const args = process.argv.slice(2);
  const bank = loadBank();

  let targetSkills = [];
  let count = 12;
  let gradeReport = null;
  let reason = 'adaptive';

  // Parse args
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--skills' && args[i + 1]) {
      targetSkills = args[++i].split(',');
      reason = `targeting skills: ${targetSkills.join(', ')}`;
    } else if (args[i] === '--standard' && args[i + 1]) {
      const std = args[++i];
      targetSkills = bank.questions
        .filter(q => q.standard === std)
        .map(q => q.skill)
        .filter((v, i, a) => a.indexOf(v) === i);
      reason = `full standard ${std} practice`;
    } else if (args[i] === '--count' && args[i + 1]) {
      count = parseInt(args[++i]);
    } else if (!args[i].startsWith('-')) {
      // Assume it's a grade report file
      gradeReport = JSON.parse(fs.readFileSync(path.resolve(args[i]), 'utf8'));
    }
  }

  // If grade report provided, extract weak skills
  if (gradeReport) {
    const weakSkills = findWeakSkills(gradeReport);
    if (weakSkills.length === 0) {
      console.error('All skills passed! No practice needed. Generating review test.');
      // Generate a mixed review
      targetSkills = bank.questions.map(q => q.skill).filter((v, i, a) => a.indexOf(v) === i);
      reason = 'review (all skills passed)';
    } else {
      targetSkills = weakSkills.map(w => w.skill);
      reason = `gap drill: ${weakSkills.map(w => `${w.skill} (${w.percentage}%)`).join(', ')}`;
      // Weight count toward weakest
      count = Math.max(count, weakSkills.length * 3);
    }
  }

  if (targetSkills.length === 0) {
    console.error('Usage:');
    console.error('  node scripts/generate-test.cjs <grade-report.json>');
    console.error('  node scripts/generate-test.cjs --skills 4.2.2,4.2.7 --count 10');
    console.error('  node scripts/generate-test.cjs --standard 4.2 --count 15');
    process.exit(1);
  }

  const questions = selectQuestions(bank, targetSkills, count);
  const test = generateTest(questions, { targetSkills, reason });

  console.log(JSON.stringify(test, null, 2));
}

module.exports = { loadBank, findWeakSkills, selectQuestions, generateTest };
