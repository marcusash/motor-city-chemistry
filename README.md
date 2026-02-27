# Motor City Chemistry

Standards-based chemistry practice and grading tools for Kai Ash (SAAS, Chem 10, Teacher: Martin, Block 6).

Built by FR (Research Lead) in the Forge system. Designed for paper-first workflow: Kai takes tests on paper with pencil, scans his work, and the system grades it.

## What This Is

A targeted study system that:
1. Extracts Kai's graded quizzes from scanned PDFs using GPT-4o vision
2. Analyzes per-skill proficiency (P/NP) using standards-based grading
3. Generates practice tests targeting his specific weak areas
4. Produces answer keys with hints and step-by-step rationale
5. Grades practice test scans and tracks improvement over time

## Current Coverage

**Standard 4.2: Ionic Compound Formulas**
- 4.2.1: Assess whether ionic formula is neutral
- 4.2.2: Determine atoms, charges in compound
- 4.2.3: Use preferred charge to write formulas
- 4.2.4: Write formulas using polyatomic ions
- 4.2.5: Predict charge of ions from formula
- 4.2.6: Name simple ionic compounds (Type I)
- 4.2.7: Name Type II / III compounds
- 4.2.8: Write formula from compound name

## Kai's Progress (Standard 4.2)

### Quiz 9 (Teacher-graded, 2026-02-26)
| Skill | Result | Notes |
|-------|--------|-------|
| 4.2.1 | NP | Got neutrality check backwards |
| 4.2.2 | NP | Wrote NO₃ charge as 2- (should be 1-) |
| 4.2.3 | P | Can write formulas from ions |
| 4.2.4 | P | Can use polyatomic ions |
| 4.2.5 | P | Can predict charge from formula |
| 4.2.6 | NP | Left naming cells blank |
| 4.2.7 | NP | Left naming cells blank |
| 4.2.8 | NP | Can't write formulas from names |

### Practice Test #1 (FR-graded, 2026-02-26)
| Skill | Result | Change | Notes |
|-------|--------|--------|-------|
| 4.2.1 | **P** | Improved | Both compounds correctly assessed |
| 4.2.2 | **P** | Improved | Got NO₃ = 1- correct this time |
| 4.2.3-5 | Skip | | Not assessed per Marcus |
| 4.2.6 | NP | Same | Used covalent prefixes (di-, mono-) on ionic compounds |
| 4.2.7 | **P** | Improved | 2/3 correct (Ca(OH)₂, (NH₄)₃PO₄ right; FeCl₂ wrong) |
| 4.2.8 | NP | Same | 2/4 (KNO₃, CuSO₄ right; AlCl₂, Ba(PO₄) wrong) |

**3 skills improved, 2 still NP.** Remaining gaps:
1. Ionic vs covalent naming confusion (using mono-/di- on ionic compounds)
2. Transition metal charge calculation (wrote Iron(I) instead of Iron(II))
3. Criss-cross method for unequal charges (AlCl₃, Ba₃(PO₄)₂)

### Practice Test #2 (pending, targets gaps above)
- Section A: 6 questions, ionic vs covalent identification and naming
- Section B: 4 questions, transition metal charge calculation
- Section C: 5 questions, criss-cross method with charge balance check

## File Structure

```
artifacts/
  chem-42-practice-test.html      Practice test #1 (matches Quiz 9 format)
  chem-42-answer-key.html         Answer key #1 (flat HTML, works on iOS)
  chem-42-answer-key.json         Machine-readable answer key #1
  chem-42-practice-test-2.html    Practice test #2 (targeted at gaps)
  chem-42-answer-key-2.html       Answer key #2 (flat HTML, works on iOS)
  kai-chem-grade-report.html      Quiz 9 grade analysis + autograder design
  kai-practice-test-grade-report.html  Practice test #1 results vs Quiz 9
data/
  (question bank JSON, planned)
docs/
  project-brief.md                Full project brief and product vision
scripts/
  (scan-to-grade pipeline, planned)
shared/
  (formula normalizer, name normalizer, planned)
tests/
  (grading algorithm tests, planned)
```

## Design Principles

1. **Paper first.** Kai takes tests on paper with pencil. The system meets him where he is.
2. **Standards-based grading.** P/NP per skill, 67% threshold, matches teacher's system.
3. **Targeted practice.** Each test is generated from the previous test's errors.
4. **Hints before answers.** Answer keys show hints first, then step-by-step solutions.
5. **Works everywhere.** HTML files use zero JavaScript. Flat HTML+CSS only. Must work in iOS Files app preview, Safari, Chrome, and print.
6. **Verified answers.** All charge balances are programmatically checked before publishing.

## Scan-to-Grade Pipeline (Planned)

```
Print test → Kai writes on paper → Scan (phone/scanner)
    → GPT-4o vision OCR → Review/edit UI → Auto-grade
    → Per-skill P/NP report → Generate next practice test
```

## Tech Stack

- HTML/CSS for all student-facing content (no JS, no build step)
- GPT-4o vision (GitHub Models API) for OCR of handwritten chemistry notation
- Node.js for answer verification and test generation scripts
- Standards-based grading algorithm with formula/name normalizers

## Project Board

GitHub Projects: [projects/5](https://github.com/users/marcusash_microsoft/projects/5)
