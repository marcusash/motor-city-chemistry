# Motor City Chemistry: Project Brief

**Owner:** Marcus Ash (CVP of Design, Microsoft)
**Builder:** FR (Research Lead, Forge)
**Student:** Kai Ash, 15, SAAS, Chem 10, Teacher: Martin, Block 6
**Status:** Active, first iteration complete
**Board:** [projects/5](https://github.com/users/marcusash_microsoft/projects/5)

## Problem Statement

Kai takes paper-based chemistry tests at school. His teacher uses standards-based grading: each skill is rated P (Proficient) or NP (Not Proficient). When Kai gets an NP, he needs targeted practice on that specific skill before the next assessment. Today, there is no system that:

1. Reads Kai's handwritten test answers from a scan
2. Grades them against a verified answer key
3. Identifies exactly which skills are weak
4. Generates a new practice test targeting those weaknesses
5. Tracks improvement over time

Motor City Chemistry solves all five.

## Product Vision

A closed-loop study system:

```
Scan graded quiz → Extract answers (GPT-4o OCR)
  → Diagnose per-skill gaps → Generate targeted practice test
  → Kai takes test on paper → Scan → Grade → Repeat
```

Each cycle narrows the gap. The system remembers what Kai got wrong and generates tests that drill exactly those concepts until they flip from NP to P.

## What Exists Today (v0.1)

### Artifacts Delivered

| File | Purpose |
|------|---------|
| `chem-42-practice-test.html` | Practice test #1, matches Quiz 9 format |
| `chem-42-answer-key.html` | Answer key #1 with hints and rationale |
| `chem-42-answer-key.json` | Machine-readable answer key for auto-grading |
| `chem-42-practice-test-2.html` | Practice test #2, targets specific gaps |
| `chem-42-answer-key-2.html` | Answer key #2 with hints and rationale |
| `kai-chem-grade-report.html` | Quiz 9 grade analysis canvas |
| `kai-practice-test-grade-report.html` | Practice test #1 grade report |

### Capabilities Demonstrated

1. **PDF scan extraction.** Extract raw JPEG pages from scanned PDFs using byte-marker detection (FF D8 FF...FF D9). No external dependencies.

2. **GPT-4o vision OCR.** Send scanned pages to GPT-4o via GitHub Models API. Extracts:
   - Printed question text and tables
   - Handwritten student answers (chemical formulas, compound names, explanations)
   - Teacher grade marks (P/NP circles on rubric)
   - Confidence: HIGH for printed text and formulas, MEDIUM for handwriting, LOW for rubric marks

3. **Standards-based grading.** Per-skill P/NP with 67% threshold (matches teacher's system). Skills map to specific questions. Grade rollup shows exactly which standards are met.

4. **Targeted test generation.** Practice test #2 was generated entirely from practice test #1 errors:
   - 4.2.6 errors (covalent prefixes on ionic) → Section A: 6 questions mixing ionic and covalent
   - 4.2.7 error (wrong Roman numeral) → Section B: 4 transition metal charge problems
   - 4.2.8 errors (no criss-cross) → Section C: 5 formula-from-name with charge balance check

5. **Answer verification.** All charge balances programmatically verified before publishing. Zero tolerance for wrong answers in the answer key.

6. **iOS-compatible answer keys.** Learned the hard way: JavaScript and `<details>/<summary>` elements do not work in iOS Files app preview. All answer keys use flat HTML+CSS. Hints in yellow boxes, answers in green boxes, always visible. Works everywhere.

## How the Grading Algorithm Works

### Step 1: OCR Extraction
```
Scanned PDF → Extract JPEG pages (byte markers)
  → Send to GPT-4o vision with structured prompt
  → Returns: { questions, kaiAnswers, teacherGrades }
```

GPT-4o prompt asks for each question's content, Kai's handwritten answer (exact text), and the teacher's grade if visible. OCR confidence is rated per-field.

### Step 2: Answer Comparison

For formulas:
- Normalize: strip spaces, lowercase, convert Unicode subscripts to digits
- Compare normalized strings
- Accept equivalent notations: Cu(SO₄) = CuSO₄ when subscript is 1

For compound names:
- Normalize: lowercase, collapse whitespace, normalize Roman numeral spacing
- Accept known alternates: "ferrous chloride" for "iron(II) chloride"
- Flag partial credit cases (e.g., correct name but wrong prefix)

### Step 3: Skill Rollup
- Each question maps to one or more skills (defined in answer key JSON)
- Per skill: count correct / total questions
- Threshold: >= 67% correct per skill = P (matches teacher's standards-based grading)
- Overall: list all skills with P/NP status

### Step 4: Gap Analysis
- Compare current results to previous results
- Flag: improved skills (NP → P), persistent gaps (NP → NP), regressions (P → NP)
- Persistent gaps become the focus of the next practice test

### Step 5: Test Generation
- Select question templates that target persistent NP skills
- Vary the specific compounds/elements (don't repeat exact questions)
- Include scaffolding: reference tables, rule reminders, show-work columns
- Match the teacher's test format so Kai recognizes the structure

## Design Constraints

1. **Paper workflow is non-negotiable.** Kai's school uses paper tests. The system must work with scan input.

2. **No app install required.** All student-facing content is HTML files that open in any browser. No npm, no build step, no server.

3. **iOS compatibility.** Files are shared to Kai's phone. Must render correctly in iOS Files app preview and Safari. No JavaScript. No interactive HTML elements that require JS to function.

4. **Teacher format matching.** Practice tests must look like Kai's real quizzes so the practice feels familiar. Same question numbering (Q4, Q5, Q6, Q7), same table structures, same reference tables.

5. **Verified correctness.** Every answer in every answer key is programmatically verified. Charge balances are checked computationally. FR does not publish an answer key without running verification.

6. **Progressive difficulty.** Answer keys present hints before full answers. Tests build from easier to harder within each section.

## Lessons Learned (v0.1)

1. **GPT-4o OCR is unreliable on teacher grade marks.** The circled P/NP on rubric pages was misread multiple times. Student handwriting and printed text are much more reliable. Always have a human verify OCR'd grades.

2. **JavaScript does not execute in iOS local HTML files.** First answer key used JS buttons. Completely broken on Kai's phone. Rebuilt with `<details>/<summary>`, also broken in Files app preview. Final version: flat HTML, everything visible, zero interaction.

3. **Students confuse ionic and covalent naming rules.** Kai's #1 gap was using covalent prefixes (mono-, di-) on ionic compounds. The answer key needed explicit "Why NOT dipotassium monoxide?" callouts. The practice test needed to mix both types so he learns to classify first, then name.

4. **Criss-cross method needs a "check" step.** Kai wrote formulas without verifying charge balance. Practice test #2 adds a "Neutral? (check)" column forcing him to multiply charges by subscripts and confirm the sum is zero.

5. **Scan quality matters.** Phone camera scans via Microsoft Lens produce much better OCR results than flatbed scanner PDFs with heavy JPEG compression.

## Future Product Direction

### Phase 1: Automated Pipeline (next)
- `scripts/extract-scan.cjs`: Extract pages from any scanned PDF
- `scripts/ocr-answers.cjs`: Send pages to GPT-4o, return structured JSON
- `scripts/grade.cjs`: Compare OCR output to answer key JSON, produce grade report
- `scripts/generate-test.cjs`: Generate practice test from grade report gaps

### Phase 2: Question Bank
- `data/standard-42.json`: All Standard 4.2 question templates
- Parameterized: swap elements, compounds, charges
- Tagged by skill, difficulty, question type
- Supports random test generation with guaranteed skill coverage

### Phase 3: Multi-Standard
- Extend to Standards 4.1 (Bond Types) and 4.3 (Covalent Lewis Structures)
- Eventually: full Chem 10 curriculum coverage
- Cross-standard tests for cumulative review

### Phase 4: Web UI
- Simple web app: upload scan, see grades, get next test
- No login, no account. Just scan and grade.
- GitHub Pages deployment from this repo

## How to Use (Today, Manual Process)

1. **Print** `artifacts/chem-42-practice-test-2.html` (or whichever test is current)
2. **Kai takes the test** on paper with pencil
3. **Scan** with phone camera or Microsoft Lens
4. **Send scan to FR** (or run OCR script when available)
5. **FR grades** via GPT-4o OCR + answer key comparison
6. **Review grade report** with Kai
7. **Kai studies answer key** (hints first, then full answers)
8. **Generate next test** from remaining gaps
9. **Repeat** until all skills are P
