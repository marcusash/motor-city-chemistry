/**
 * charge-balance.test.cjs
 * Verifies that ionic compound formulas in the answer key are electrically neutral.
 *
 * Approach: declarative ionic decomposition.
 *   Each formula is broken into { cation, cCharge, cCount, anion, aCharge, aCount }.
 *   Net charge = (cCharge * cCount) + (aCharge * aCount).
 *   A valid ionic compound must have net charge = 0.
 *
 * This test also confirms:
 *   - Mg(OH)3 is NOT neutral (verifying the Q4a answer key answer "No" is correct)
 *   - K2SO4 IS neutral (verifying the Q4b answer key answer "Yes" is correct)
 *
 * Run: node --test tests/charge-balance.test.cjs
 */

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

// ---------------------------------------------------------------------------
// Charge balance helper
// ---------------------------------------------------------------------------

/**
 * Compute the net ionic charge for a binary ionic compound.
 * @param {number} cCharge  Charge on the cation (e.g. +2 for Ca2+)
 * @param {number} cCount   Number of cation units in one formula unit
 * @param {number} aCharge  Charge on the anion (e.g. -1 for Cl-)
 * @param {number} aCount   Number of anion units in one formula unit
 * @returns {number} Net charge (must be 0 for a valid ionic compound)
 */
function netCharge(cCharge, cCount, aCharge, aCount) {
  return cCharge * cCount + aCharge * aCount;
}

/**
 * Returns true if the compound is electrically neutral.
 */
function isNeutral(cCharge, cCount, aCharge, aCount) {
  return netCharge(cCharge, cCount, aCharge, aCount) === 0;
}

// ---------------------------------------------------------------------------
// Ionic compound inventory
// Each entry: formula, cation name, cCharge, cCount, anion name, aCharge, aCount
//
// Source: answer-key-42-flat.json (formula answers only)
//         Q4a / Q4b neutrality check questions
// ---------------------------------------------------------------------------

const COMPOUNDS = [
  // From Q6 — formula writing questions
  { formula: 'NaCl',        cation: 'Na+',   cCharge: +1, cCount: 1, anion: 'Cl-',   aCharge: -1, aCount: 1 },
  { formula: 'BaO',         cation: 'Ba2+',  cCharge: +2, cCount: 1, anion: 'O2-',   aCharge: -2, aCount: 1 },
  { formula: 'LiOH',        cation: 'Li+',   cCharge: +1, cCount: 1, anion: 'OH-',   aCharge: -1, aCount: 1 },
  { formula: 'CuCO3',       cation: 'Cu2+',  cCharge: +2, cCount: 1, anion: 'CO3(2-)', aCharge: -2, aCount: 1 },

  // From Q7 — formula-from-name questions
  { formula: 'K2O',         cation: 'K+',    cCharge: +1, cCount: 2, anion: 'O2-',   aCharge: -2, aCount: 1 },
  { formula: 'MgBr2',       cation: 'Mg2+',  cCharge: +2, cCount: 1, anion: 'Br-',   aCharge: -1, aCount: 2 },
  { formula: 'FeCl2',       cation: 'Fe2+',  cCharge: +2, cCount: 1, anion: 'Cl-',   aCharge: -1, aCount: 2 },
  { formula: 'Ca(OH)2',     cation: 'Ca2+',  cCharge: +2, cCount: 1, anion: 'OH-',   aCharge: -1, aCount: 2 },
  { formula: '(NH4)3PO4',   cation: 'NH4+',  cCharge: +1, cCount: 3, anion: 'PO4(3-)', aCharge: -3, aCount: 1 },
  { formula: 'KNO3',        cation: 'K+',    cCharge: +1, cCount: 1, anion: 'NO3-',  aCharge: -1, aCount: 1 },
  { formula: 'CuSO4',       cation: 'Cu2+',  cCharge: +2, cCount: 1, anion: 'SO4(2-)', aCharge: -2, aCount: 1 },
  { formula: 'AlCl3',       cation: 'Al3+',  cCharge: +3, cCount: 1, anion: 'Cl-',   aCharge: -1, aCount: 3 },
  { formula: 'Ba3(PO4)2',   cation: 'Ba2+',  cCharge: +2, cCount: 3, anion: 'PO4(3-)', aCharge: -3, aCount: 2 },

  // Q4b: "Is K2SO4 electrically neutral?" → "Yes"
  { formula: 'K2SO4',       cation: 'K+',    cCharge: +1, cCount: 2, anion: 'SO4(2-)', aCharge: -2, aCount: 1 },
];

// The one formula that is NOT neutral (Q4a: "Is Mg(OH)3 neutral?" → "No")
const NOT_NEUTRAL = {
  formula: 'Mg(OH)3',
  cation: 'Mg2+', cCharge: +2, cCount: 1,
  anion: 'OH-',   aCharge: -1, aCount: 3,
  expectedNetCharge: -1   // 2 + (3 * -1) = -1
};

// ---------------------------------------------------------------------------
// Tests: all valid answer-key formulas must be neutral
// ---------------------------------------------------------------------------

describe('charge-balance — answer key formulas are electrically neutral', () => {
  for (const c of COMPOUNDS) {
    it(`${c.formula}: ${c.cation}(${c.cCount}) + ${c.anion}(${c.aCount}) = 0`, () => {
      assert.ok(
        isNeutral(c.cCharge, c.cCount, c.aCharge, c.aCount),
        `${c.formula} expected net charge 0, got ${netCharge(c.cCharge, c.cCount, c.aCharge, c.aCount)}`
      );
    });
  }
});

// ---------------------------------------------------------------------------
// Test: Mg(OH)3 is NOT neutral — confirms Q4a answer key "No" is correct
// ---------------------------------------------------------------------------

describe('charge-balance — Mg(OH)3 is NOT neutral (Q4a)', () => {
  it('Mg(OH)3 net charge is -1, not 0', () => {
    const charge = netCharge(
      NOT_NEUTRAL.cCharge, NOT_NEUTRAL.cCount,
      NOT_NEUTRAL.aCharge, NOT_NEUTRAL.aCount
    );
    assert.equal(charge, NOT_NEUTRAL.expectedNetCharge);
    assert.notEqual(charge, 0);
  });

  it('isNeutral returns false for Mg(OH)3', () => {
    assert.equal(
      isNeutral(NOT_NEUTRAL.cCharge, NOT_NEUTRAL.cCount, NOT_NEUTRAL.aCharge, NOT_NEUTRAL.aCount),
      false
    );
  });
});

// ---------------------------------------------------------------------------
// Tests: helper function correctness
// ---------------------------------------------------------------------------

describe('netCharge / isNeutral — helper correctness', () => {
  it('1:1 +1/-1 pair is neutral', () => {
    assert.equal(netCharge(+1, 1, -1, 1), 0);
  });

  it('1:1 +2/-2 pair is neutral', () => {
    assert.equal(netCharge(+2, 1, -2, 1), 0);
  });

  it('1:2 +2/-1 pair is neutral', () => {
    assert.equal(netCharge(+2, 1, -1, 2), 0);
  });

  it('3:2 +2/-3 pair is neutral (Ba3(PO4)2 pattern)', () => {
    assert.equal(netCharge(+2, 3, -3, 2), 0);
  });

  it('1:3 +2/-1 pair is NOT neutral (Mg(OH)3 pattern)', () => {
    assert.notEqual(netCharge(+2, 1, -1, 3), 0);
    assert.equal(netCharge(+2, 1, -1, 3), -1);
  });

  it('isNeutral returns true when net = 0', () => {
    assert.equal(isNeutral(+1, 1, -1, 1), true);
  });

  it('isNeutral returns false when net ≠ 0', () => {
    assert.equal(isNeutral(+2, 1, -1, 1), false);
  });
});

// ---------------------------------------------------------------------------
// Cross-reference: verify formula answers in the answer key match our table
// ---------------------------------------------------------------------------

describe('charge-balance — cross-reference with answer-key-42-flat.json', () => {
  const KEY_PATH = path.resolve(__dirname, '../data/answer-key-42-flat.json');

  it('loads answer key without error', () => {
    assert.doesNotThrow(() => JSON.parse(fs.readFileSync(KEY_PATH, 'utf8')));
  });

  it('every formula in our charge table appears in the answer key (as answer or question subject)', () => {
    const key = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));

    // Collect all text: answers, acceptable answers, and question text
    // Some formulas (K2O, MgBr2, FeCl2, Ca(OH)2, (NH4)3PO4) are question SUBJECTS
    // (e.g. "Name: K2O") rather than correct answers
    const allText = new Set(
      (key.questions || [])
        .flatMap(q => [
          q.answer,
          ...(q.acceptableAnswers || []),
          // Extract formulas from question text like "Name: K2O"
          ...(q.question || '').split(/\s+/)
        ])
        .map(a => (a || '').trim())
        .filter(Boolean)
    );

    const testedFormulas = COMPOUNDS.map(c => c.formula);
    for (const formula of testedFormulas) {
      assert.ok(
        allText.has(formula),
        `Formula "${formula}" in charge table but not found anywhere in answer key — remove or update`
      );
    }
  });

  it('Mg(OH)3 appears in the answer key as a question subject (not a correct answer)', () => {
    const key = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));
    const neutralityQuestion = (key.questions || []).find(q => q.id === 'Q4a');
    assert.ok(neutralityQuestion, 'Q4a should exist in answer key');
    assert.ok(
      neutralityQuestion.question.includes('Mg(OH)3'),
      'Q4a question should reference Mg(OH)3'
    );
    assert.equal(neutralityQuestion.answer, 'No', 'Q4a answer must be "No" (Mg(OH)3 is not neutral)');
  });

  it('K2SO4 appears as the neutral compound in Q4b', () => {
    const key = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));
    const neutralQ = (key.questions || []).find(q => q.id === 'Q4b');
    assert.ok(neutralQ, 'Q4b should exist in answer key');
    assert.ok(
      neutralQ.question.includes('K2SO4'),
      'Q4b question should reference K2SO4'
    );
    assert.equal(neutralQ.answer, 'Yes', 'Q4b answer must be "Yes" (K2SO4 is neutral)');
  });
});
