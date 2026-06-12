---
name: cave-handoff
description: Create, update, validate, and hydrate from docs/ai/HANDOFF.md — a caveman-compressed operational state file that lets a fresh session continue work without reading the old conversation. Use whenever the user wants to save/transfer session state, says "handoff", "/handoff", "hydrate", "/hydrate", "compacta a sessão", "salva o estado", "vou limpar o contexto", "continue de onde paramos", mentions context getting full (60%+), is about to /clear or switch tasks, or opens a session in a repo where docs/ai/HANDOFF.md exists with status != done. Also use to compress an existing verbose HANDOFF.md.
---

# cave-handoff

Handoff = verifiable operational state, NOT conversation summary. Fresh session needs: mission, decisions, file map, failures, next actions. Not replay.

Caveman compression on prose. Anchors stay byte-exact. File reread every hydration → compression pays forever.

## Core rules

**Compress (caveman):**
- Drop: articles, filler, hedging, pleasantries, narrative ("we investigated X then Y...")
- Fragments OK. Arrows for causality: `inline obj prop → new ref → re-render`
- State over history: final state only, never chronology
- One fact per line

**NEVER compress (byte-exact):**
- File paths, symbol names, function names, commands, flags, env vars
- Error signatures (short exact form)
- Code snippets (≤15 lines each, only if critical)

**NEVER fragment (full sentences — ambiguity here costs more than tokens):**
- `Decisions` entries (decision + why + consequence)
- `Fail` entries' "retry only if" conditions
- Anything irreversible or security-relevant

**Derive, don't store:** branch, commit, working tree, modified files = git's job. `scripts/collect.sh` fetches live at hydration. Storing copies → staleness → hallucinated state.

**Budget:** HANDOFF.md ≤ 120 lines. Over budget → cut Fail history first, then Context. Mission/Next/Files untouchable.

## Operations

### 1. CREATE / UPDATE (old session, before /clear or at milestone)

1. Run `scripts/collect.sh` → live git facts (stdout, don't paste into handoff)
2. Read existing `docs/ai/HANDOFF.md` if present → **delta update**: keep valid, remove obsolete, add new. Never regenerate from scratch
3. Write per `references/template.md`. Compression rules: `references/compression.md`
4. Run `scripts/validate.py docs/ai/HANDOFF.md` → fix errors (exit 2) and warnings (exit 1) it reports
5. Show user the diff. User approves → done. Suggest committing handoff with milestone code

Incremental habit: update `## State` + `## Next` at every real milestone, not only at session end. End-of-session write at 70% context = degraded model writing from degraded memory. Avoid.

### 2. HYDRATE (fresh session)

1. Read `docs/ai/HANDOFF.md`
2. Run `scripts/collect.sh` → live git state
3. **Diff declared vs real.** Mismatch (files changed not in map, branch differs, status stale) → list divergences to user before anything else
4. Restate: mission ≤ 5 bullets + first action
5. Read ONLY files in `## Files` read-first list. No broad repo exploration — handoff is the map
6. Then work

### 3. VALIDATE (standalone)

`scripts/validate.py docs/ai/HANDOFF.md` — mechanical checks: sections present, paths exist, line budget, status valid, code block size, staleness vs git. Exit 0/1/2.

Semantic check (am-I-clear-to-a-stranger): only meaningful from a context-free reader. In Claude Code → spawn subagent with only the file + "list ambiguities, vague next steps, commands without success criteria". Same-session self-review = author grading own homework, skip it.

### 4. COMPRESS EXISTING (verbose handoff → caveman)

Read file → apply `references/compression.md` → rewrite → validate → show before/after line+char counts. Anchors byte-preserved (verify: every path/command in original still present identical in output).

## Anti-patterns

- Pasting `git status` / diffs / logs into handoff → collect.sh derives live
- Chronological narrative → state only
- Permanent architecture decisions accumulating → those go to ADR / CLAUDE.md; handoff dies with task
- HANDOFF_ARCHIVE/ directory → `git log -- docs/ai/HANDOFF.md` is the archive
- Compressing a decision into ambiguity → auto-clarity rule wins over budget

## Bundled

- `references/template.md` — the 6-section template + filled example
- `references/compression.md` — caveman rules adapted for handoff docs, before/after pairs
- `scripts/collect.sh` — live git facts to stdout, zero deps
- `scripts/validate.py` — mechanical lint, exit-coded, CI/hook-ready
- `assets/commands/` — `/handoff` + `/hydrate` slash commands for Claude Code (copy to `.claude/commands/`)
- `assets/claude-md-snippet.md` — 2 lines for CLAUDE.md so hydration triggers even when user forgets
