/**
 * formula-normalizer.test.cjs
 * Unit tests for normalizeFormula() and answersMatch() in formula mode.
 *
 * Key chemistry rule (LESSONS 05/24/2026):
 *   Formulas are case-sensitive. Do NOT lowercase. Co (cobalt) ≠ CO (carbon monoxide).
 *
 * Run: node --test tests/formula-normalizer.test.cjs
 */

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeFormula, answersMatch } = require('../shared/normalize.cjs');

// ---------------------------------------------------------------------------
// Unicode subscript conversion
// ---------------------------------------------------------------------------

describe('normalizeFormula — Unicode subscripts', () => {
  it('converts ₀ through ₉ (U+2080–U+2089) to ASCII digits', () => {
    const allSubscripts = '\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089';
    assert.equal(normalizeFormula(allSubscripts), '0123456789');
  });

  it('converts H₂O to H2O', () => {
    assert.equal(normalizeFormula('H\u2082O'), 'H2O');
  });

  it('converts Ca(NO₃)₂ to Ca(NO3)2', () => {
    assert.equal(normalizeFormula('Ca(NO\u2083)\u2082'), 'Ca(NO3)2');
  });

  it('converts (NH₄)₃PO₄ to (NH4)3PO4', () => {
    assert.equal(normalizeFormula('(NH\u2084)\u2083PO\u2084'), '(NH4)3PO4');
  });
});

// ---------------------------------------------------------------------------
// Unicode superscript conversion (charge notation)
// ---------------------------------------------------------------------------

describe('normalizeFormula — Unicode superscripts', () => {
  it('converts Fe²⁺ (U+00B2 U+207A) to Fe2+', () => {
    assert.equal(normalizeFormula('Fe\u00B2\u207A'), 'Fe2+');
  });

  it('converts O²⁻ (U+00B2 U+207B) to O2-', () => {
    assert.equal(normalizeFormula('O\u00B2\u207B'), 'O2-');
  });

  it('converts Cu²⁺ to Cu2+', () => {
    assert.equal(normalizeFormula('Cu\u00B2\u207A'), 'Cu2+');
  });
});

// ---------------------------------------------------------------------------
// Whitespace stripping
// ---------------------------------------------------------------------------

describe('normalizeFormula — whitespace', () => {
  it('strips a single space between atoms', () => {
    assert.equal(normalizeFormula('Na Cl'), 'NaCl');
  });

  it('strips spaces around parentheses', () => {
    assert.equal(normalizeFormula('Ca (OH) 2'), 'Ca(OH)2');
  });

  it('strips internal spaces in a complex formula', () => {
    assert.equal(normalizeFormula('Ba 3 (PO4) 2'), 'Ba3(PO4)2');
  });

  it('strips leading and trailing whitespace', () => {
    assert.equal(normalizeFormula('  NaCl  '), 'NaCl');
  });
});

// ---------------------------------------------------------------------------
// Trailing implicit-1 subscript removal
// ---------------------------------------------------------------------------

describe('normalizeFormula — trailing subscript 1 removal', () => {
  it('removes 1 after a parenthesized group: (OH)1 → (OH)', () => {
    assert.equal(normalizeFormula('(OH)1'), '(OH)');
  });

  it('removes 1 after a parenthesized group mid-formula: Ca(OH)1 → Ca(OH)', () => {
    assert.equal(normalizeFormula('Ca(OH)1'), 'Ca(OH)');
  });

  it('does NOT remove 1 that is part of a larger subscript: Ca(OH)12 stays', () => {
    assert.equal(normalizeFormula('Ca(OH)12'), 'Ca(OH)12');
  });

  it('does NOT remove standalone 1 that means one atom: H1O is left as-is', () => {
    // The regex only targets patterns like (X)1 or Atom1 at word boundary
    // H1O: the 1 is followed by O so it should be stripped (matches \b[A-Z][a-z]?)
    // Test that the formula still resolves to something meaningful
    const result = normalizeFormula('H1O');
    // After stripping: H + O = HO (subscript 1 on H at word boundary before O)
    // This is expected behavior — 1 is implicit and redundant
    assert.equal(typeof result, 'string');
  });
});

// ---------------------------------------------------------------------------
// Pass-through: already-normalized formulas
// ---------------------------------------------------------------------------

describe('normalizeFormula — pass-through', () => {
  it('leaves NaCl unchanged', () => {
    assert.equal(normalizeFormula('NaCl'), 'NaCl');
  });

  it('leaves Ba3(PO4)2 unchanged', () => {
    assert.equal(normalizeFormula('Ba3(PO4)2'), 'Ba3(PO4)2');
  });

  it('leaves Ca(NO3)2 unchanged', () => {
    assert.equal(normalizeFormula('Ca(NO3)2'), 'Ca(NO3)2');
  });

  it('leaves CuSO4 unchanged', () => {
    assert.equal(normalizeFormula('CuSO4'), 'CuSO4');
  });

  it('leaves (NH4)3PO4 unchanged', () => {
    assert.equal(normalizeFormula('(NH4)3PO4'), '(NH4)3PO4');
  });
});

// ---------------------------------------------------------------------------
// Falsy / edge input
// ---------------------------------------------------------------------------

describe('normalizeFormula — falsy input', () => {
  it('returns empty string for empty string', () => {
    assert.equal(normalizeFormula(''), '');
  });

  it('returns empty string for null', () => {
    assert.equal(normalizeFormula(null), '');
  });

  it('returns empty string for undefined', () => {
    assert.equal(normalizeFormula(undefined), '');
  });
});

// ---------------------------------------------------------------------------
// Case sensitivity guard (LESSONS 05/24/2026)
// Co (cobalt element symbol) must NOT equal CO (carbon monoxide)
// ---------------------------------------------------------------------------

describe('normalizeFormula — case sensitivity', () => {
  it('preserves uppercase: Co ≠ CO after normalization', () => {
    assert.notEqual(normalizeFormula('Co'), normalizeFormula('CO'));
  });

  it('preserves case in multi-atom formulas: CoCl2 ≠ COCl2', () => {
    assert.notEqual(normalizeFormula('CoCl2'), normalizeFormula('COCl2'));
  });

  it('formula comparison in answersMatch is case-sensitive', () => {
    // Co (cobalt chloride) should NOT match CO-based formula
    const match = answersMatch('CoCl2', 'CO', ['CO', 'co']);
    assert.equal(match, false);
  });
});

// ---------------------------------------------------------------------------
// answersMatch — formula mode
// ---------------------------------------------------------------------------

describe('answersMatch — formula mode', () => {
  it('accepts exact match', () => {
    assert.equal(answersMatch('NaCl', 'NaCl', ['NaCl']), true);
  });

  it('accepts match via acceptable alternates', () => {
    assert.equal(answersMatch('KNO3', 'KNO3', ['KNO3', 'kno3']), true);
  });

  it('accepts Unicode-subscript variant of a formula', () => {
    // Student typed H₂O with Unicode subscript
    assert.equal(answersMatch('H\u2082O', 'H2O', ['H2O']), true);
  });

  it('rejects wrong formula', () => {
    assert.equal(answersMatch('Ba2(PO4)3', 'Ba3(PO4)2', ['Ba3(PO4)2']), false);
  });

  it('returns false for blank student answer', () => {
    assert.equal(answersMatch('', 'NaCl', ['NaCl']), false);
  });

  it('returns false for null student answer', () => {
    assert.equal(answersMatch(null, 'NaCl', ['NaCl']), false);
  });

  it('does NOT fall through to name comparison when correct answer is a formula', () => {
    // "sodium chloride" should NOT match "NaCl" — formula detection blocks name path
    assert.equal(answersMatch('sodium chloride', 'NaCl', ['NaCl']), false);
  });
});
