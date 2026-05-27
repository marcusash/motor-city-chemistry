/**
 * normalize.cjs — Formula and name normalization for answer comparison
 * 
 * Rules (from copilot-instructions.md):
 * - Strip spaces, lowercase, convert Unicode subscripts to ASCII digits
 * - Accept equivalent notations: Cu(SO4) = CuSO4 when subscript is 1
 * - For names: lowercase, collapse whitespace, normalize Roman numeral spacing
 * - Accept common alternates: "ferrous chloride" for "iron(II) chloride"
 */

'use strict';

const UNICODE_SUBSCRIPTS = {
  '\u2080': '0', '\u2081': '1', '\u2082': '2', '\u2083': '3', '\u2084': '4',
  '\u2085': '5', '\u2086': '6', '\u2087': '7', '\u2088': '8', '\u2089': '9'
};

const UNICODE_SUPERSCRIPTS = {
  '\u2070': '0', '\u00B9': '1', '\u00B2': '2', '\u00B3': '3', '\u2074': '4',
  '\u2075': '5', '\u2076': '6', '\u2077': '7', '\u2078': '8', '\u2079': '9',
  '\u207A': '+', '\u207B': '-'
};

/**
 * Normalize a chemical formula for comparison.
 * - Convert Unicode sub/superscripts to ASCII
 * - Strip whitespace
 * - Remove implicit subscript 1 in parentheses: (SO4)1 → (SO4)
 */
function normalizeFormula(formula) {
  if (!formula) return '';
  let f = String(formula);

  // Convert Unicode subscripts/superscripts
  for (const [uni, ascii] of Object.entries(UNICODE_SUBSCRIPTS)) {
    f = f.replaceAll(uni, ascii);
  }
  for (const [uni, ascii] of Object.entries(UNICODE_SUPERSCRIPTS)) {
    f = f.replaceAll(uni, ascii);
  }

  // Strip all whitespace
  f = f.replace(/\s+/g, '');

  // Remove trailing 1 subscripts: (OH)1 → (OH), Cl1 → Cl
  f = f.replace(/(\)|\b[A-Z][a-z]?)1(?=[^0-9]|$)/g, '$1');

  return f;
}

/**
 * Normalize a compound name for comparison.
 * - Lowercase
 * - Collapse whitespace
 * - Normalize Roman numeral spacing: "iron (II)" → "iron(ii)"
 */
function normalizeName(name) {
  if (!name) return '';
  let n = String(name).toLowerCase().trim();

  // Collapse multiple spaces
  n = n.replace(/\s+/g, ' ');

  // Normalize Roman numeral spacing: "iron (II)" or "iron( II )" → "iron(ii)"
  // Only remove spaces BEFORE ( and spaces INSIDE parens — not the space AFTER )
  // e.g. "iron (ii) chloride" → "iron(ii) chloride" (space after ) is preserved)
  n = n.replace(/\s+\(/g, '(');   // remove space before opening paren
  n = n.replace(/\(\s+/g, '(');   // remove space after opening paren
  n = n.replace(/\s+\)/g, ')');   // remove space before closing paren

  return n;
}

/**
 * Check if a student answer matches any acceptable answer.
 * Tries formula comparison first, then name comparison.
 * If the correct answer looks like a formula (no spaces, starts with uppercase),
 * only formula comparison is used to avoid false positives (e.g., Co ≠ CO).
 */
function answersMatch(studentAnswer, correctAnswer, acceptableAnswers) {
  if (!studentAnswer) return false;

  const allAcceptable = [correctAnswer, ...(acceptableAnswers || [])];
  const isFormula = /^[A-Z][A-Za-z0-9()\[\]+-]*$/.test(correctAnswer.trim());

  // Try formula comparison
  const studentFormula = normalizeFormula(studentAnswer);
  for (const acceptable of allAcceptable) {
    if (studentFormula === normalizeFormula(acceptable)) return true;
  }

  // Only try name comparison for non-formula answers (avoids Co vs CO false positive)
  if (!isFormula) {
    const studentName = normalizeName(studentAnswer);
    for (const acceptable of allAcceptable) {
      if (studentName === normalizeName(acceptable)) return true;
    }
  }

  return false;
}

module.exports = { normalizeFormula, normalizeName, answersMatch };
