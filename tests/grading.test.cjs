/**
 * grading.test.cjs
 * Unit tests for gradeBySkill(), determineStatus(), and generateReport().
 *
 * Critical boundary: 67% threshold.
 *   - pct >= 0.67 → P (Proficient)
 *   - pct <  0.67 → NP (Not Proficient)
 *   - 2/3 = 0.6667 < 0.67 → NP  (just below — common trap)
 *   - 67/100 = 0.67 → P  (meets threshold exactly)
 *
 * Run: node --test tests/grading.test.cjs
 */

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { gradeBySkill, determineStatus, generateReport } = require('../scripts/grade.cjs');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeKey(questions, testId = 'test-1') {
  return { testId, standard: '4.2', questions };
}

function makeStudent(answers, name = 'Kai Ash') {
  return { studentName: name, answers };
}

// ---------------------------------------------------------------------------
// determineStatus — P/NP threshold
// ---------------------------------------------------------------------------

describe('determineStatus — P/NP boundary', () => {
  it('3/3 (100%) → P', () => {
    const result = determineStatus({ '4.2.1': { correct: 3, total: 3, questions: [] } });
    assert.equal(result['4.2.1'].status, 'P');
  });

  it('2/2 (100%) → P', () => {
    const result = determineStatus({ '4.2.1': { correct: 2, total: 2, questions: [] } });
    assert.equal(result['4.2.1'].status, 'P');
  });

  it('67/100 (exactly 67%) → P (meets threshold)', () => {
    const result = determineStatus({ '4.2': { correct: 67, total: 100, questions: [] } });
    assert.equal(result['4.2'].status, 'P');
  });

  it('3/4 (75%) → P', () => {
    const result = determineStatus({ '4.2': { correct: 3, total: 4, questions: [] } });
    assert.equal(result['4.2'].status, 'P');
  });

  it('2/3 (66.7%) → NP (just below threshold)', () => {
    // This is the critical trap: 2/3 feels like "two-thirds" ≈ 67% but 0.6667 < 0.67
    const result = determineStatus({ '4.2': { correct: 2, total: 3, questions: [] } });
    assert.equal(result['4.2'].status, 'NP');
  });

  it('66/100 (66%) → NP', () => {
    const result = determineStatus({ '4.2': { correct: 66, total: 100, questions: [] } });
    assert.equal(result['4.2'].status, 'NP');
  });

  it('1/3 (33%) → NP', () => {
    const result = determineStatus({ '4.2': { correct: 1, total: 3, questions: [] } });
    assert.equal(result['4.2'].status, 'NP');
  });

  it('0/3 (0%) → NP', () => {
    const result = determineStatus({ '4.2': { correct: 0, total: 3, questions: [] } });
    assert.equal(result['4.2'].status, 'NP');
  });

  it('0/0 (no questions) → NP (no credit for empty skill)', () => {
    const result = determineStatus({ '4.2': { correct: 0, total: 0, questions: [] } });
    assert.equal(result['4.2'].status, 'NP');
  });
});

describe('determineStatus — percentage field', () => {
  it('rounds 75% correctly', () => {
    const result = determineStatus({ '4.2': { correct: 3, total: 4, questions: [] } });
    assert.equal(result['4.2'].percentage, 75);
  });

  it('rounds 67% correctly', () => {
    const result = determineStatus({ '4.2': { correct: 67, total: 100, questions: [] } });
    assert.equal(result['4.2'].percentage, 67);
  });

  it('rounds 0% correctly', () => {
    const result = determineStatus({ '4.2': { correct: 0, total: 3, questions: [] } });
    assert.equal(result['4.2'].percentage, 0);
  });

  it('rounds 2/3 to 67% in percentage field (even though status is NP)', () => {
    // Math.round(0.6667 * 100) = Math.round(66.67) = 67
    const result = determineStatus({ '4.2': { correct: 2, total: 3, questions: [] } });
    assert.equal(result['4.2'].percentage, 67);
    assert.equal(result['4.2'].status, 'NP'); // still NP — raw pct 0.6667 < 0.67
  });
});

// ---------------------------------------------------------------------------
// gradeBySkill — skill rollup
// ---------------------------------------------------------------------------

describe('gradeBySkill — skill grouping', () => {
  it('groups two questions under the same standard', () => {
    const key = makeKey([
      { id: 'Q1', standard: '4.2.6', answer: 'potassium oxide', acceptableAnswers: ['potassium oxide'] },
      { id: 'Q2', standard: '4.2.6', answer: 'magnesium bromide', acceptableAnswers: ['magnesium bromide'] },
    ]);
    const student = makeStudent({ Q1: 'potassium oxide', Q2: 'magnesium bromide' });
    const result = gradeBySkill(student, key);
    assert.equal(result['4.2.6'].total, 2);
    assert.equal(result['4.2.6'].correct, 2);
  });

  it('separates questions across two different standards', () => {
    const key = makeKey([
      { id: 'Q1', standard: '4.2.3', answer: 'NaCl', acceptableAnswers: ['NaCl'] },
      { id: 'Q2', standard: '4.2.6', answer: 'potassium oxide', acceptableAnswers: ['potassium oxide'] },
    ]);
    const student = makeStudent({ Q1: 'NaCl', Q2: 'potassium oxide' });
    const result = gradeBySkill(student, key);
    assert.ok(result['4.2.3'], 'standard 4.2.3 should exist');
    assert.ok(result['4.2.6'], 'standard 4.2.6 should exist');
    assert.equal(result['4.2.3'].correct, 1);
    assert.equal(result['4.2.6'].correct, 1);
  });

  it('counts correct and incorrect separately within a skill', () => {
    const key = makeKey([
      { id: 'Q1', standard: '4.2.8', answer: 'KNO3', acceptableAnswers: ['KNO3'] },
      { id: 'Q2', standard: '4.2.8', answer: 'CuSO4', acceptableAnswers: ['CuSO4'] },
      { id: 'Q3', standard: '4.2.8', answer: 'AlCl3', acceptableAnswers: ['AlCl3'] },
    ]);
    // Student gets 2/3 correct
    const student = makeStudent({ Q1: 'KNO3', Q2: 'CuSO4', Q3: 'AlCl2' });
    const result = gradeBySkill(student, key);
    assert.equal(result['4.2.8'].correct, 2);
    assert.equal(result['4.2.8'].total, 3);
  });

  it('treats blank/missing student answer as incorrect', () => {
    const key = makeKey([
      { id: 'Q1', standard: '4.2.3', answer: 'NaCl', acceptableAnswers: ['NaCl'] },
    ]);
    const result = gradeBySkill(makeStudent({}), key);
    assert.equal(result['4.2.3'].correct, 0);
    assert.equal(result['4.2.3'].total, 1);
  });

  it('accepts acceptable alternate answers (ferrous chloride)', () => {
    const key = makeKey([
      {
        id: 'Q1', standard: '4.2.7', answer: 'iron(II) chloride',
        acceptableAnswers: ['iron(II) chloride', 'iron (II) chloride', 'iron(ii) chloride', 'ferrous chloride']
      },
    ]);
    const student = makeStudent({ Q1: 'ferrous chloride' });
    const result = gradeBySkill(student, key);
    assert.equal(result['4.2.7'].correct, 1);
  });

  it('rejects "iron chloride" (missing Roman numeral)', () => {
    const key = makeKey([
      {
        id: 'Q1', standard: '4.2.7', answer: 'iron(II) chloride',
        acceptableAnswers: ['iron(II) chloride', 'iron (II) chloride', 'iron(ii) chloride', 'ferrous chloride']
      },
    ]);
    const student = makeStudent({ Q1: 'iron chloride' });
    const result = gradeBySkill(student, key);
    assert.equal(result['4.2.7'].correct, 0);
  });

  it('rejects wrong subscripts: Ba2(PO4)3 ≠ Ba3(PO4)2', () => {
    const key = makeKey([
      { id: 'Q1', standard: '4.2.8', answer: 'Ba3(PO4)2', acceptableAnswers: ['Ba3(PO4)2'] },
    ]);
    const student = makeStudent({ Q1: 'Ba2(PO4)3' });
    const result = gradeBySkill(student, key);
    assert.equal(result['4.2.8'].correct, 0);
  });

  it('uses skill field as fallback when standard is absent (legacy keys)', () => {
    const key = makeKey([
      { id: 'Q1', skill: 'legacy.skill', answer: 'NaCl', acceptableAnswers: ['NaCl'] },
    ]);
    const student = makeStudent({ Q1: 'NaCl' });
    const result = gradeBySkill(student, key);
    assert.ok(result['legacy.skill'], 'should key by skill field when standard is absent');
    assert.equal(result['legacy.skill'].correct, 1);
  });

  it('prefers standard over skill when both are present', () => {
    const key = makeKey([
      { id: 'Q1', skill: 'old.skill', standard: '4.2.3', answer: 'NaCl', acceptableAnswers: ['NaCl'] },
    ]);
    const student = makeStudent({ Q1: 'NaCl' });
    const result = gradeBySkill(student, key);
    assert.ok(result['4.2.3'], 'standard field should take precedence');
    assert.equal(result['old.skill'], undefined);
  });
});

// ---------------------------------------------------------------------------
// gradeBySkill — question log
// ---------------------------------------------------------------------------

describe('gradeBySkill — per-question log', () => {
  it('records each question with id, studentAnswer, correctAnswer, isCorrect', () => {
    const key = makeKey([
      { id: 'Q1', standard: '4.2.3', answer: 'NaCl', acceptableAnswers: ['NaCl'] },
    ]);
    const student = makeStudent({ Q1: 'NaCl' });
    const result = gradeBySkill(student, key);
    const q = result['4.2.3'].questions[0];
    assert.equal(q.id, 'Q1');
    assert.equal(q.studentAnswer, 'NaCl');
    assert.equal(q.correctAnswer, 'NaCl');
    assert.equal(q.isCorrect, true);
  });

  it('records blank as "(blank)" and isCorrect=false', () => {
    const key = makeKey([
      { id: 'Q1', standard: '4.2.3', answer: 'NaCl', acceptableAnswers: ['NaCl'] },
    ]);
    const result = gradeBySkill(makeStudent({}), key);
    const q = result['4.2.3'].questions[0];
    assert.equal(q.studentAnswer, '(blank)');
    assert.equal(q.isCorrect, false);
  });
});

// ---------------------------------------------------------------------------
// generateReport — shape and totals
// ---------------------------------------------------------------------------

describe('generateReport — report shape', () => {
  it('produces required top-level fields', () => {
    const key = makeKey([
      { id: 'Q1', standard: '4.2.3', answer: 'NaCl', acceptableAnswers: ['NaCl'] },
    ]);
    const student = makeStudent({ Q1: 'NaCl' });
    const report = generateReport(student, key);

    assert.equal(report.exam_id, 'test-1');
    assert.equal(report.student, 'Kai Ash');
    assert.equal(typeof report.date, 'string');
    assert.equal(report.score, 1);
    assert.equal(report.total, 1);
    assert.equal(report.pct, 100);
    assert.ok(report.sections, 'sections field required');
    assert.ok(Array.isArray(report.per_question), 'per_question must be an array');
    assert.equal(report.per_question.length, 1);
  });

  it('sets skills_passed and skills_total correctly', () => {
    const key = makeKey([
      { id: 'Q1', standard: '4.2.3', answer: 'NaCl', acceptableAnswers: ['NaCl'] },
      { id: 'Q2', standard: '4.2.6', answer: 'potassium oxide', acceptableAnswers: ['potassium oxide'] },
    ]);
    // Pass 4.2.3, fail 4.2.6
    const student = makeStudent({ Q1: 'NaCl', Q2: 'wrong answer' });
    const report = generateReport(student, key);
    assert.equal(report.skills_total, 2);
    assert.equal(report.skills_passed, 1);
  });

  it('per_question entries have id, standard, status, studentAnswer, correctAnswer', () => {
    const key = makeKey([
      { id: 'Q1', standard: '4.2.3', answer: 'NaCl', acceptableAnswers: ['NaCl'] },
    ]);
    const student = makeStudent({ Q1: 'NaCl' });
    const report = generateReport(student, key);
    const q = report.per_question[0];
    assert.equal(q.id, 'Q1');
    assert.equal(q.standard, '4.2.3');
    assert.equal(q.status, 'correct');
    assert.equal(q.studentAnswer, 'NaCl');
    assert.equal(q.correctAnswer, 'NaCl');
  });

  it('sections include score, total, pct, status per skill', () => {
    const key = makeKey([
      { id: 'Q1', standard: '4.2.3', answer: 'NaCl', acceptableAnswers: ['NaCl'] },
    ]);
    const student = makeStudent({ Q1: 'NaCl' });
    const report = generateReport(student, key);
    const s = report.sections['4.2.3'];
    assert.ok(s, 'section 4.2.3 should exist');
    assert.equal(s.score, 1);
    assert.equal(s.total, 1);
    assert.equal(s.pct, 100);
    assert.equal(s.status, 'P');
  });
});

// ---------------------------------------------------------------------------
// Integration: full exam-42-flat answer key against sample student answers
// ---------------------------------------------------------------------------

describe('generateReport — integration with answer-key-42-flat', () => {
  const path = require('path');
  const fs = require('fs');

  const KEY_PATH = path.resolve(__dirname, '../data/answer-key-42-flat.json');
  const SAMPLE_PATH = path.resolve(__dirname, '../data/sample-student-answers.json');

  it('loads and grades without throwing', () => {
    const key = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));
    const student = JSON.parse(fs.readFileSync(SAMPLE_PATH, 'utf8'));
    assert.doesNotThrow(() => generateReport(student, key));
  });

  it('grades the known error in Q5_atoms_O (student=3, correct=6) as wrong', () => {
    const key = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));
    const student = JSON.parse(fs.readFileSync(SAMPLE_PATH, 'utf8'));
    const report = generateReport(student, key);
    const q = report.per_question.find(q => q.id === 'Q5_atoms_O');
    assert.ok(q, 'Q5_atoms_O should appear in per_question');
    assert.equal(q.status, 'incorrect');
    assert.equal(q.studentAnswer, '3');
    assert.equal(q.correctAnswer, '6');
  });

  it('grades Q7_row3 ("iron chloride") as wrong — missing Roman numeral', () => {
    const key = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));
    const student = JSON.parse(fs.readFileSync(SAMPLE_PATH, 'utf8'));
    const report = generateReport(student, key);
    const q = report.per_question.find(q => q.id === 'Q7_row3');
    assert.ok(q, 'Q7_row3 should appear in per_question');
    assert.equal(q.status, 'incorrect');
  });

  it('grades Q7_row9 ("Ba2(PO4)3") as wrong — subscripts reversed', () => {
    const key = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));
    const student = JSON.parse(fs.readFileSync(SAMPLE_PATH, 'utf8'));
    const report = generateReport(student, key);
    const q = report.per_question.find(q => q.id === 'Q7_row9');
    assert.ok(q, 'Q7_row9 should appear in per_question');
    assert.equal(q.status, 'incorrect');
  });
});
