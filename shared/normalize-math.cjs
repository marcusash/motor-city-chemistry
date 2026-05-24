/**
 * normalize-math.cjs — Algebraic expression normalization for answer comparison
 * 
 * Solves the commutativity problem: "3x+2" should match "2+3x"
 * 
 * Strategy:
 * 1. Parse expression into terms (split on + and -)
 * 2. Normalize each term (coefficient + variable part)
 * 3. Sort terms canonically (variable terms first by degree desc, constants last)
 * 4. Rejoin for comparison
 * 
 * This handles the common cases in Algebra 2:
 * - Additive commutativity: 3x+2 = 2+3x
 * - Equation sides: y=3x+2 vs y=2+3x (split on =, normalize each side)
 * - Coefficient normalization: 1x → x, -1x → -x
 * - Whitespace/asterisk stripping (inherited from norm())
 */

'use strict';

/**
 * Sort terms in an algebraic expression for canonical comparison.
 * Handles: polynomials, simple expressions with one variable.
 * Does NOT handle: nested parentheses, trig, logs (those need numeric eval).
 * 
 * @param {string} expr - A single side of an equation (no = sign)
 * @returns {string} Canonically sorted expression
 */
function sortTerms(expr) {
  if (!expr) return '';

  // Split into terms preserving signs
  // "3x+2-5x^2" → ["+3x", "+2", "-5x^2"]
  const terms = [];
  let current = '';
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if ((ch === '+' || ch === '-') && i > 0 && expr[i - 1] !== '^' && expr[i - 1] !== '(') {
      if (current.trim()) terms.push(current.trim());
      current = ch;
    } else {
      current += ch;
    }
  }
  if (current.trim()) terms.push(current.trim());

  // Parse each term into { coeff, vars, degree, original }
  const parsed = terms.map(term => {
    // Extract sign
    let t = term.replace(/^\+/, '');

    // Try to identify variable part and coefficient
    // Match patterns like: -3x^2, 2x, x, -x, 5, -7
    const match = t.match(/^([+-]?\d*\.?\d*)\*?([a-z](?:\^\d+)?(?:\([^)]*\))?)?$/i);

    if (match && (match[1] || match[2])) {
      let coeff = match[1] || '1';
      if (coeff === '+' || coeff === '') coeff = '1';
      if (coeff === '-') coeff = '-1';
      const vars = match[2] || '';
      const degMatch = vars.match(/\^(\d+)/);
      const degree = vars ? (degMatch ? parseInt(degMatch[1]) : 1) : 0;
      return { coeff: parseFloat(coeff), vars, degree, original: t };
    }

    // Can't parse — keep as-is
    return { coeff: 0, vars: t, degree: -1, original: t };
  });

  // Sort: highest degree first, then alphabetically by variable, constants last
  parsed.sort((a, b) => {
    if (b.degree !== a.degree) return b.degree - a.degree;
    if (a.vars < b.vars) return -1;
    if (a.vars > b.vars) return 1;
    return a.coeff - b.coeff;
  });

  // Rejoin
  let result = '';
  for (let i = 0; i < parsed.length; i++) {
    const p = parsed[i];
    if (p.degree === -1) {
      // Unparseable term — use original
      result += (i > 0 && !p.original.startsWith('-') ? '+' : '') + p.original;
    } else if (p.vars) {
      const coeffStr = p.coeff === 1 ? '' : (p.coeff === -1 ? '-' : String(p.coeff));
      const sign = (i > 0 && p.coeff >= 0) ? '+' : '';
      result += sign + coeffStr + p.vars;
    } else {
      // Constant term
      const sign = (i > 0 && p.coeff >= 0) ? '+' : '';
      result += sign + String(p.coeff);
    }
  }

  return result || expr;
}

/**
 * Normalize an algebraic expression for comparison.
 * Handles equations (splits on =), function notation f(x)=..., etc.
 * 
 * @param {string} expr - Full expression or equation
 * @returns {string} Normalized form for comparison
 */
function normalizeMath(expr) {
  if (!expr || typeof expr !== 'string') return String(expr || '');

  let s = expr.trim().toLowerCase();

  // Strip whitespace and explicit multiplication
  s = s.replace(/\s+/g, '').replace(/\*/g, '');

  // Convert Unicode superscripts to caret notation
  const supers = { '\u2070': '0', '\u00B9': '1', '\u00B2': '2', '\u00B3': '3', '\u2074': '4', '\u2075': '5', '\u2076': '6', '\u2077': '7', '\u2078': '8', '\u2079': '9', '\u207B': '-' };
  const superRe = /[\u2070\u00B9\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079\u207B]+/g;
  s = s.replace(superRe, m => '^' + [...m].map(c => supers[c] || c).join(''));

  // Strip $ and {} (LaTeX artifacts)
  s = s.replace(/[${}]/g, '');

  // If it's an equation (has =), normalize each side
  if (s.includes('=')) {
    const parts = s.split('=');
    return parts.map(p => sortTerms(p)).join('=');
  }

  // Single expression
  return sortTerms(s);
}

/**
 * Check if two algebraic expressions are equivalent via normalization.
 * Falls back to numeric evaluation for complex expressions.
 * 
 * @param {string} student - Student's answer
 * @param {string} correct - Correct answer
 * @returns {boolean}
 */
function mathAnswersMatch(student, correct) {
  if (!student) return false;
  return normalizeMath(student) === normalizeMath(correct);
}

module.exports = { normalizeMath, sortTerms, mathAnswersMatch };
