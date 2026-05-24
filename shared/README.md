# Shared Grading Framework: Cross-Subject Architecture

## Overview

The `shared/` directory contains normalizers that work across both Motor City Chemistry and Motor City Math. The pattern is the same:

```
student answer → normalize → compare to correct answer → P/NP result
```

The difference is what "normalize" means per subject:
- **Chemistry:** Unicode subscripts, formula equivalence, compound name matching
- **Math:** Term sorting (commutativity), coefficient normalization, superscript conversion

## Files

| File | Subject | What it normalizes |
|------|---------|-------------------|
| `shared/normalize.cjs` | Chemistry | Formulas (H₂O→H2O), names (iron(II)→iron(ii)) |
| `shared/normalize-math.cjs` | Math | Expressions (2+3x→3x+2), equations (y=2+3x→y=3x+2) |

## How to integrate into Motor City Math

The commutativity bug in MCM's `checkAnswer()` (shared/scripts.js line 234) is that `norm()` only strips whitespace and lowercases — it doesn't sort terms. Fix:

```javascript
// In shared/scripts.js, replace the string comparison in checkAnswer():
// OLD: return u === c;
// NEW:
function sortTerms(expr) { /* ... copy from normalize-math.cjs ... */ }
return sortTerms(u) === sortTerms(c);
```

Or, for a cleaner integration, extract `sortTerms()` into the existing `norm()` function.

## Grading Pipeline (grade.cjs)

The grading script works identically for both subjects:

```
node scripts/grade.cjs <student-answers.json> <answer-key.json>
```

For math, the answer key uses numeric tolerance for number answers and `normalizeMath()` for expression answers. The `answersMatch()` function can be extended:

```javascript
function answersMatch(student, correct, options) {
  if (typeof correct === 'number') {
    // Numeric comparison with tolerance
    return Math.abs(parseFloat(student) - correct) <= (options.tolerance || 0.5);
  }
  // Try math normalization (handles commutativity)
  if (mathAnswersMatch(student, correct)) return true;
  // Fall back to chemistry normalization
  if (chemAnswersMatch(student, correct)) return true;
  return false;
}
```

## Commutativity Cases Handled

| Student writes | Correct answer | Result |
|---------------|---------------|--------|
| `y=2+3x` | `y=3x+2` | ✅ PASS |
| `5x^2+3x+1` | `1+3x+5x^2` | ✅ PASS |
| `p(x)=-500+18x` | `p(x)=18x-500` | ✅ PASS |
| `c(m)=75+35m` | `c(m)=35m+75` | ✅ PASS |
| `y=25x+11` | `y=25x+10` | ❌ FAIL (correct) |

## Not Handled (needs numeric eval)

- Factored forms: `(x+2)(x+3)` vs `x^2+5x+6`
- Distribution: `2(x+3)` vs `2x+6`
- Nested expressions: `sqrt(x^2+1)` type

These require a symbolic algebra evaluator or numeric sampling — tracked as future work.
