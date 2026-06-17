---
name: pr-text
description: Compose a pull-request description in a fixed house-pattern so a reviewer understands value before implementation. Use BEFORE every `gh pr create`/`gh pr edit --body`, and whenever the user says "texto de PR", "descrição de PR", "corpo do PR", "escreve o PR", "abre PR", "PR body", "write the PR", "describe this PR". The body is derived from live git/gh facts (never fabricated) and always opens with the `[Claudinho]` prefix.
---

# pr-text

PR description = reviewer interface before it is a merge request. Reviewer must grasp **what changes and why it matters** in 10 seconds, then drill into detail. Mirror of the issue house-pattern, adapted for a diff.

**Derive, don't fabricate.** Branch, base, diff stat, commits, touched files = git's job → `scripts/collect-pr.sh` fetches them live. Never invent file lists or test results. If a fact is missing (no tests ran, CI red), say so plainly.

## When I use this

Any time a PR body is being written or rewritten — opening (`gh pr create`), editing (`gh pr edit --body-file`), or when the user asks for PR text. Always, not optionally.

## Steps

1. Run `scripts/collect-pr.sh [base]` (default base `main`) from the repo → live facts: branch, base, commit subjects, diff stat, touched files, linked issues from commit/branch refs.
2. Write the body to a temp file (heredoc) in the order below. pt-br content unless the repo writes PRs in English.
3. Apply: `gh pr create --base <base> --title "<value-title>" --body-file <tmp>` (or `gh pr edit <N> --body-file <tmp>`).
4. Assignees + prefix per global rules (below).

## Body order (fixed)

1. **`[Claudinho]`** — first line, alone. Mandatory prefix for every GitHub message.
2. **`## O que muda`** — 1-3 bullets, plain language: what the reviewer gets. No jargon in the first bullet.
3. **`## Por quê`** — motivation/context. Link the issue: `Closes #N` (or `Refs #N` if it doesn't fully close it).
4. **`## Detalhe técnico`** — touched files `path:linha`, key decisions, trade-offs, anything non-obvious in the diff. This is where the volume goes.
5. **`## Como testar`** — verifiable steps + what actually ran (CI status, test command, manual check). State honestly if nothing ran.
6. **`## DoD`** (optional) — checklist when the PR closes a spec'd issue; mirror the issue's DoD checkboxes.

## Title

Conventional-commit prefix + product value, not the raw symptom. `fix(fetch): timeout impede domínio inteiro de travar` beats `add timeout to fetch`. Keep priority tags (`[P0]`) if the issue carried them.

## Rules (global)

- Body starts with `[Claudinho] ` — every PR body, comment, review.
- After creating: assign both the user and the Claude bot: `gh pr edit <N> --add-assignee <user> --add-assignee anthropic-code-agent`. Assignees on PRs only — never on issues.
- Keep the `Co-Authored-By: Claude <noreply@anthropic.com>` trailer on commits.
- Never claim green tests/CI you didn't observe. Missing fact → "N/A" or ask once.

See `references/template.md` for a fill-in skeleton and `assets/claude-md-snippet.md` for the host-repo reminder.
