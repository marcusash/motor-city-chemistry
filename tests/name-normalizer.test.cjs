/**
 * name-normalizer.test.cjs
 * Unit tests for normalizeName() and answersMatch() in name mode.
 *
 * Chemistry naming rules tested:
 *   - Case insensitivity (names, unlike formulas, are lowercased)
 *   - Roman numeral spacing normalization: "iron (II)" → "iron(ii)"
 *   - Common alternates: "ferrous chloride" ↔ "iron(II) chloride"
 *   - Whitespace collapse
 *
 * Run: node --test tests/name-normalizer.test.cjs
 */

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeName, answersMatch } = require('../shared/normalize.cjs');

// ---------------------------------------------------------------------------
// Lowercase conversion
// ---------------------------------------------------------------------------

describe('normalizeName — lowercase', () => {
  it('lowercases all-caps input', () => {
    assert.equal(normalizeName('POTASSIUM OXIDE'), 'potassium oxide');
  });

  it('lowercases title-case input', () => {
    assert.equal(normalizeName('Potassium Oxide'), 'potassium oxide');
  });

  it('lowercases mixed-case with Roman numerals', () => {
    assert.equal(normalizeName('IRON(II) CHLORIDE'), 'iron(ii) chloride');
  });

  it('lowercases roman numeral inside parens', () => {
    assert.equal(normalizeName('Iron(III) Oxide'), 'iron(iii) oxide');
  });
});

// ---------------------------------------------------------------------------
// Roman numeral spacing normalization
// ---------------------------------------------------------------------------

describe('normalizeName — Roman numeral spacing', () => {
  it('removes space before opening paren: "iron (II)" → "iron(ii)"', () => {
    assert.equal(normalizeName('iron (II) chloride'), 'iron(ii) chloride');
  });

  it('removes spaces inside parens: "iron( II )" → "iron(ii)"', () => {
    assert.equal(normalizeName('iron( II ) chloride'), 'iron(ii) chloride');
  });

  it('handles no space (already compact): "iron(II)" → "iron(ii)"', () => {
    assert.equal(normalizeName('iron(II) chloride'), 'iron(ii) chloride');
  });

  it('normalizes copper(II) sulfate variants to same form', () => {
    const canonical = normalizeName('copper(ii) sulfate');
    assert.equal(normalizeName('Copper(II) Sulfate'), canonical);
    assert.equal(normalizeName('copper (II) sulfate'), canonical);
    assert.equal(normalizeName('COPPER(II) SULFATE'), canonical);
  });

  it('all iron(II) chloride variants normalize to same string', () => {
    const canonical = 'iron(ii) chloride';
    assert.equal(normalizeName('iron(II) chloride'), canonical);
    assert.equal(normalizeName('iron (II) chloride'), canonical);
    assert.equal(normalizeName('iron(ii) chloride'), canonical);
    assert.equal(normalizeName('IRON(II) CHLORIDE'), canonical);
    assert.equal(normalizeName('Iron(II) Chloride'), canonical);
  });
});

// ---------------------------------------------------------------------------
// Whitespace normalization
// ---------------------------------------------------------------------------

describe('normalizeName — whitespace', () => {
  it('collapses multiple internal spaces to one', () => {
    assert.equal(normalizeName('potassium  oxide'), 'potassium oxide');
  });

  it('collapses triple internal spaces', () => {
    assert.equal(normalizeName('magnesium   bromide'), 'magnesium bromide');
  });

  it('trims leading whitespace', () => {
    assert.equal(normalizeName('  calcium hydroxide'), 'calcium hydroxide');
  });

  it('trims trailing whitespace', () => {
    assert.equal(normalizeName('calcium hydroxide  '), 'calcium hydroxide');
  });

  it('trims both ends and collapses middle', () => {
    assert.equal(normalizeName('  ammonium  phosphate  '), 'ammonium phosphate');
  });
});

// ---------------------------------------------------------------------------
// Falsy / edge input
// ---------------------------------------------------------------------------

describe('normalizeName — falsy input', () => {
  it('returns empty string for empty string', () => {
    assert.equal(normalizeName(''), '');
  });

  it('returns empty string for null', () => {
    assert.equal(normalizeName(null), '');
  });

  it('returns empty string for undefined', () => {
    assert.equal(normalizeName(undefined), '');
  });
});

// ---------------------------------------------------------------------------
// Common alternates — normalizeName produces DIFFERENT strings
// (acceptableAnswers, not normalizeName, handles ferrous/iron(II) equivalence)
// ---------------------------------------------------------------------------

describe('normalizeName — common alternates are different strings', () => {
  it('ferrous chloride ≠ iron(ii) chloride after normalization', () => {
    // These are different accepted spellings — answered via acceptableAnswers[]
    assert.notEqual(normalizeName('ferrous chloride'), normalizeName('iron(II) chloride'));
  });

  it('ferric chloride ≠ iron(iii) chloride after normalization', () => {
    assert.notEqual(normalizeName('ferric chloride'), normalizeName('iron(III) chloride'));
  });
});

// ---------------------------------------------------------------------------
// answersMatch — name mode
// ---------------------------------------------------------------------------

describe('answersMatch — name mode', () => {
  it('accepts exact name match (case-insensitive via normalizeName)', () => {
    assert.equal(
      answersMatch('potassium oxide', 'potassium oxide', ['potassium oxide']),
      true
    );
  });

  it('accepts uppercase student answer for lowercase correct answer', () => {
    assert.equal(
      answersMatch('Potassium Oxide', 'potassium oxide', ['potassium oxide']),
      true
    );
  });

  it('accepts "iron (II) chloride" when correct answer is "iron(II) chloride"', () => {
    assert.equal(
      answersMatch(
        'iron (II) chloride',
        'iron(II) chloride',
        ['iron(II) chloride', 'iron (II) chloride', 'iron(ii) chloride', 'ferrous chloride']
      ),
      true
    );
  });

  it('accepts "ferrous chloride" as alternate for iron(II) chloride', () => {
    assert.equal(
      answersMatch(
        'ferrous chloride',
        'iron(II) chloride',
        ['iron(II) chloride', 'iron (II) chloride', 'iron(ii) chloride', 'ferrous chloride']
      ),
      true
    );
  });

  it('accepts "magnesium bromide" regardless of case', () => {
    assert.equal(
      answersMatch('Magnesium Bromide', 'magnesium bromide', ['magnesium bromide']),
      true
    );
  });

  it('rejects a name that is close but wrong', () => {
    assert.equal(
      answersMatch('iron chloride', 'iron(II) chloride', ['iron(II) chloride', 'iron (II) chloride', 'ferrous chloride']),
      false
    );
  });

  it('rejects blank answer', () => {
    assert.equal(answersMatch('', 'potassium oxide', ['potassium oxide']), false);
  });

  it('rejects null answer', () => {
    assert.equal(answersMatch(null, 'potassium oxide', ['potassium oxide']), false);
  });
});
