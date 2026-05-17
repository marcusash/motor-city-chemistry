# Copilot Instructions: Motor City Chemistry

> Read this before every task. It tells you what this project is, how it works, and what quality looks like.

## Agent OS

This repo is a spoke in the Forge agent system. For agent identity, skills, knowledge, and protocol:

- **Hub repo:** `C:\GitHub\forge`
- **Agent specs:** `forge/knowledge/agents/{ID}.md`
- **Skills:** `forge/skills/{ID}/_index.md`
- **Protocol:** `forge/.agent-protocol.md`
- **Lessons:** `forge/LESSONS.md`

Load your agent spec and skill index from the forge hub at session start.

## What This Project Is

Motor City Chemistry is an adaptive chemistry study tool for one student: Kai Ash (15, SAAS, Chem 10). It generates practice tests that target his specific weak areas, grades his scanned handwritten answers, and tracks improvement over time.

The workflow: Kai takes tests on paper. His work is scanned. The system grades it using GPT-4o vision OCR, identifies per-skill gaps, and generates the next practice test.

## Tech Stack (read carefully)

- **HTML + CSS only** for all student-facing content. Zero JavaScript. No frameworks.
- **Node.js scripts** (CJS) for the grading pipeline, test generation, and OCR.
- **JSON files** in `data/` for question banks, answer keys, and grade data.
- **GPT-4o** via GitHub Models API for OCR of handwritten chemistry notation.
- **No package.json yet.** If your task needs one, create it with `npm init -y` and add dependencies explicitly.
- **No build step.** HTML files are opened directly in a browser or iOS Files app.

## Critical Constraints

1. **No JavaScript in HTML files.** Kai opens HTML files on his iPhone in the iOS Files app preview, which does not execute JavaScript. No `<script>` tags. No `<details>/<summary>` (broken in Files app). All content must be flat HTML+CSS, always visible.

2. **Paper first.** Tests are printed and taken with pencil on paper. The system works with scanned input, not interactive screens.

3. **Teacher format matching.** Practice tests must look like Kai's real school quizzes: same question numbering style (Q4, Q5, etc.), same table structures, same reference tables. Familiar format reduces test anxiety.

4. **Verified correctness.** Every answer in every answer key must be chemically correct. All charge balances must be verified. If you generate chemistry content, double-check: ion charges, formula subscripts, compound names (IUPAC), and that all formulas are electrically neutral.

5. **Standards-based grading.** Kai's teacher grades P (Proficient) or NP (Not Proficient) per skill, with a 67% threshold. The system must match this. Do not invent a different grading scheme.

## Repository Structure

```
artifacts/         Student-facing HTML files (practice tests, answer keys, grade reports)
data/              JSON data files (question banks, answer keys, grade data)
docs/              Project documentation and briefs
scripts/           Node.js pipeline scripts (OCR, grading, test generation)
shared/            Shared utility functions (formula normalizer, name normalizer)
tests/             Unit tests for grading logic and normalizers
.squad/            Squad workflow config (DO NOT MODIFY)
.github/           CI workflows and templates (DO NOT MODIFY workflows)
```

## File Naming

- Practice tests: `chem-{standard}-practice-test-{n}.html`
- Answer keys: `chem-{standard}-answer-key-{n}.html` (HTML) and `.json` (machine-readable)
- Grade reports: `kai-{test-name}-grade-report.html`
- Scripts: descriptive kebab-case in `scripts/`, `.cjs` extension

## Chemistry Content Rules

- Use IUPAC naming conventions for all compounds.
- Distinguish ionic vs covalent naming: ionic compounds never use prefixes (mono-, di-). Covalent compounds do.
- Transition metals require Roman numeral notation: Iron(II) chloride, not ferrous chloride.
- All formulas must be charge-balanced. Verify: (cation charge x subscript) + (anion charge x subscript) = 0.
- Difficulty levels: 1 (intro), 2 (standard), 3 (advanced). Tag all content.
- Include reference tables (polyatomic ions, common charges) in practice tests.

## Answer Key Format (HTML)

Answer keys use this visual pattern:
- **Hint boxes:** Yellow background, show before the answer. Give a nudge without revealing the answer.
- **Answer boxes:** Green background, show the correct answer with step-by-step rationale.
- **"Why not X?" callouts:** Address common mistakes Kai has made (e.g., "Why not dipotassium monoxide? Because ionic compounds don't use prefixes.").
- All boxes are always visible (no toggles, no JS, no interaction).

## Answer Key Format (JSON)

Machine-readable answer keys follow this schema:
```json
{
  "standard": "4.2",
  "testId": "practice-test-1",
  "questions": [
    {
      "id": "Q4a",
      "skill": "4.2.1",
      "question": "Is CaCl2 electrically neutral?",
      "answer": "Yes",
      "verification": "Ca2+ (2+) + 2 Cl- (2-) = 0",
      "difficulty": 2,
      "hints": ["Check: do the total positive charges equal the total negative charges?"]
    }
  ]
}
```

## Formula/Name Normalization Rules

When comparing student answers to correct answers:
- Strip spaces, lowercase, convert Unicode subscripts to ASCII digits
- Accept equivalent notations: `Cu(SO4)` = `CuSO4` when subscript is 1
- For names: lowercase, collapse whitespace, normalize Roman numeral spacing
- Accept common alternates: "ferrous chloride" for "iron(II) chloride"

## What a Complete PR Looks Like

1. All exit criteria from the linked issue are met (check each one).
2. Chemistry content is factually correct and charge-balanced.
3. HTML files render correctly with no JavaScript. Test by opening the file in a browser.
4. If scripts were added: they run with `node scripts/<name>.cjs` and produce expected output.
5. If tests were added: they pass.
6. README.md updated if a new feature or file was added.
7. No files modified outside the scope of the issue.
8. Commit messages are clear and descriptive.

## Never Do These Things

- Do not add JavaScript to HTML files in `artifacts/`.
- Do not modify `.squad/` or `.github/workflows/`.
- Do not hardcode Kai's name in logic. Use config or function parameters.
- Do not publish an answer key without verifying every charge balance.
- Do not use `<details>`, `<summary>`, or any interactive HTML elements.
- Do not add CSS that depends on `:hover` or other interaction states for content visibility.