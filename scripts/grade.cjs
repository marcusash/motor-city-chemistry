/**
 * grade.cjs — Motor City Chemistry Grading Pipeline
 * 
 * Takes OCR-extracted student answers (JSON) + answer key (JSON),
 * produces a per-skill grade report with P/NP status.
 * 
 * Usage: node scripts/grade.cjs <student-answers.json> <answer-key.json>
 * Output: JSON grade report to stdout (pipe to file or next stage)
 * 
 * Grading algorithm:
 *   - 67% threshold per skill = Proficient (P)
 *   - Below 67% = Not Proficient (NP)
 *   - Uses formula/name normalization for fuzzy matching
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { normalizeFormula, normalizeName, answersMatch } = require('../shared/normalize.cjs');

// --- @forge/prompts integration (optional LLM grading for open-ended questions) ---
const PROMPTS_DIR = path.resolve(__dirname, '../../forge/packages/prompts/templates');

function loadGradeTemplate() {
  const p = path.join(PROMPTS_DIR, 'grade.md');
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf-8');
}

function fillTemplate(template, vars) {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g'), String(value));
  }
  return result;
}

/**
 * Build an LLM prompt for grading open-ended questions using @forge/prompts grade template.
 * Use when rule-based normalization can't evaluate the answer (e.g., explanations, diagrams).
 */
function buildLLMGradePrompt(studentAnswers, answerKey) {
  const template = loadGradeTemplate();
  if (!template) return null;

  const standards = (answerKey.questions || [])
    .map(q => q.standard || q.skill)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(', ');

  return fillTemplate(template, {
    answer_key: JSON.stringify(answerKey.questions || [], null, 2),
    student_answers: JSON.stringify(studentAnswers.answers || {}, null, 2),
    mastery_threshold: '67%',
    standards: standards,
    student_name: studentAnswers.studentName || 'Kai Ash',
    date: new Date().toISOString().split('T')[0]
  });
}

// --- Grading logic ---

function gradeBySkill(studentAnswers, answerKey) {
  const skillResults = {};

  for (const question of answerKey.questions || []) {
    const skill = question.skill;
    if (!skillResults[skill]) {
      skillResults[skill] = { correct: 0, total: 0, questions: [] };
    }

    const studentAnswer = studentAnswers.answers?.[question.id];
    const isCorrect = answersMatch(
      studentAnswer || '',
      question.answer,
      question.acceptableAnswers || [question.answer]
    );

    skillResults[skill].total++;
    if (isCorrect) skillResults[skill].correct++;
    skillResults[skill].questions.push({
      id: question.id,
      studentAnswer: studentAnswer || '(blank)',
      correctAnswer: question.answer,
      isCorrect
    });
  }

  return skillResults;
}

function determineStatus(skillResults, threshold = 0.67) {
  const report = {};
  for (const [skill, data] of Object.entries(skillResults)) {
    const pct = data.total > 0 ? data.correct / data.total : 0;
    report[skill] = {
      correct: data.correct,
      total: data.total,
      percentage: Math.round(pct * 100),
      status: pct >= threshold ? 'P' : 'NP',
      questions: data.questions
    };
  }
  return report;
}

function generateReport(studentAnswers, answerKey) {
  const skillResults = gradeBySkill(studentAnswers, answerKey);
  const gradeReport = determineStatus(skillResults);

  const skills = Object.entries(gradeReport);
  const passed = skills.filter(([, d]) => d.status === 'P').length;
  const total = skills.length;
  const totalQuestions = skills.reduce((s, [, d]) => s + d.total, 0);
  const totalCorrect = skills.reduce((s, [, d]) => s + d.correct, 0);

  // Per-question array (MCM-compatible format)
  const perQuestion = [];
  for (const [skill, data] of skills) {
    for (const q of data.questions) {
      perQuestion.push({
        id: q.id,
        standard: skill,
        status: q.isCorrect ? 'correct' : 'incorrect',
        studentAnswer: q.studentAnswer,
        correctAnswer: q.correctAnswer
      });
    }
  }

  return {
    // MCM-compatible top-level fields
    exam_id: answerKey.testId || 'unknown',
    student: studentAnswers.studentName || 'Kai Ash',
    date: new Date().toISOString().split('T')[0],
    score: totalCorrect,
    total: totalQuestions,
    pct: Math.round((totalCorrect / totalQuestions) * 100),
    source: 'mcc-pipeline',
    // Chemistry-specific: per-skill P/NP breakdown
    standard: answerKey.standard || 'unknown',
    skills_passed: passed,
    skills_total: total,
    sections: Object.fromEntries(skills.map(([skill, data]) => [
      skill, { score: data.correct, total: data.total, pct: data.percentage, status: data.status }
    ])),
    per_question: perQuestion,
    // Legacy format (backward compat)
    skills: gradeReport
  };
}

// --- CLI ---

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node scripts/grade.cjs <student-answers.json> <answer-key.json>');
    console.error('');
    console.error('  student-answers.json: OCR-extracted answers from scanned quiz');
    console.error('  answer-key.json:      Machine-readable answer key');
    process.exit(1);
  }

  const [studentPath, keyPath] = args;

  const studentAnswers = JSON.parse(fs.readFileSync(path.resolve(studentPath), 'utf8'));
  const answerKey = JSON.parse(fs.readFileSync(path.resolve(keyPath), 'utf8'));

  const report = generateReport(studentAnswers, answerKey);
  console.log(JSON.stringify(report, null, 2));
}

module.exports = { gradeBySkill, determineStatus, generateReport, buildLLMGradePrompt };
