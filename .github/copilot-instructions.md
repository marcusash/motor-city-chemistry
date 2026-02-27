# Copilot Instructions — Motor City Chemistry

> This file is read by the GitHub Copilot Coding Agent before every task in this repo.
> Keep it accurate and current. Owner: GA (Grind Lead Architect).

## What This Project Is

Motor City Chemistry is an adaptive chemistry learning tool built for Kai, a high school student.
The goal: make chemistry engaging, visual, and personalized. Think Khan Academy but smaller, faster, and built for one student.

## Who Uses It

- **Kai** — the student. High school level. Needs clear explanations, visual aids, encouraging feedback.
- **Marcus** — the parent/owner. Reviews content and outcomes. Approves what ships.

## Tech Stack

- Language: TypeScript
- Framework: Next.js (or static if not yet scaffolded — check package.json)
- Data: JSON files in /data
- Tests: Jest
- CI: GitHub Actions
- Hosting: GitHub Pages (via personal repo marcusash/motor-city-chemistry)

## Code Standards

- All new features must include unit tests. Tests live in /tests.
- Use descriptive variable names. This codebase may be read by students.
- Comments are encouraged — explain the chemistry concept, not just the code.
- TypeScript strict mode. No implicit any.
- No hardcoded secrets. Use environment variables or GitHub Secrets.

## Repository Structure

\\\
data/          -- JSON data files (elements, compounds, questions, etc.)
docs/          -- Architecture and content documentation
scripts/       -- Utility and build scripts
tests/         -- Unit and integration tests
shared/        -- Shared utilities and types
artifacts/     -- Generated outputs (do not commit generated files here manually)
.squad/        -- Squad workflow config (do not modify unless you are GP or FO)
.github/       -- CI workflows and templates (do not modify workflows unless you are GP)
\\\

## What a Complete PR Looks Like

A PR is only complete when ALL of these are true:
1. The exit criteria listed in the linked issue are fully met (check each one)
2. Unit tests exist for all new logic and they pass
3. No TypeScript errors (tsc --noEmit passes)
4. README.md updated if a new feature was added
5. No files modified outside the scope of the issue

## Never Do These Things

- Do not modify .squad/team.md
- Do not modify .github/workflows/ unless the issue explicitly asks for it
- Do not commit package-lock.json changes unless dependencies actually changed
- Do not add TODO comments without a linked GitHub issue number
- Do not hardcode Kai's name in logic — use config or props

## Chemistry Content Standards

- All chemistry facts must be accurate. When in doubt, cite a source in a comment.
- Difficulty levels: 1 (intro), 2 (standard), 3 (advanced). Label all content.
- Questions must have exactly one correct answer unless explicitly specified otherwise.
- Use IUPAC naming conventions for all chemical compounds.

## Key Docs

- Architecture: docs/ARCHITECTURE.md (create if missing)
- Content plan: docs/content-plan.md (create if missing)
- Data schema: docs/data-schema.md (create if missing)