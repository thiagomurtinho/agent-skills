---
name: rick-portal-handoff
description: Create, update, validate, and hydrate from a caveman-compressed operational state file (system temp by default — `$TMPDIR/<repo-slug>-HANDOFF.md`, override with `$HANDOFF_PATH`) that lets a fresh session continue work without reading the old conversation. Use whenever the user wants to save/transfer session state, says "handoff", "/handoff", "hydrate", "/hydrate", "inicie lendo o handoff", "inicie lendo o handoff em <path>", "leia o handoff", "lendo o handoff", "read the handoff", "compacta a sessão", "salva o estado", "vou limpar o contexto", "continue de onde paramos", mentions context getting full (60%+), is about to /clear or switch tasks, or opens a session where the resolved handoff file exists with status != done. Any message that just points at a handoff file ("inicie lendo o handoff em /tmp/...") means HYDRATE: read-only briefing, never act. Also use to compress an existing verbose handoff.
---

# rick-portal-handoff

Handoff = verifiable operational state, NOT conversation summary. Fresh session needs: mission, decisions, file map, failures, next actions. Not replay.

Caveman compression on prose. Anchors stay byte-exact. File reread every hydration → compression pays forever.

**Location:** handoff lives in system temp by default — `scripts/handoff-path.sh` resolves it (`$HANDOFF_PATH` if set, else `$TMPDIR/<repo-slug>-HANDOFF.md`). Deterministic per repo so CREATE and HYDRATE hit the same file. Temp default = no repo pollution, dies with the machine session; set `$HANDOFF_PATH=docs/ai/HANDOFF.md` to commit it and get `git log` archival instead.

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

**Budget:** handoff ≤ 120 lines. Over budget → cut Fail history first, then Context. Mission/Next/Files untouchable.

## Operations

### 1. CREATE / UPDATE (old session, before /clear or at milestone)

1. Run `scripts/collect.sh` → live git facts + `## handoff` block with resolved path (stdout, don't paste git facts into handoff)
2. Read existing handoff at resolved path if present → **delta update**: keep valid, remove obsolete, add new. Never regenerate from scratch
3. Write to resolved path per `references/template.md`. Compression rules: `references/compression.md`
4. Run `scripts/validate.py` (no arg → resolved path) → fix errors (exit 2) and warnings (exit 1) it reports
5. Show user the diff. User approves → done. Suggest committing handoff with milestone code

Incremental habit: update `## State` + `## Next` at every real milestone, not only at session end. End-of-session write at 70% context = degraded model writing from degraded memory. Avoid.

### 2. HYDRATE (fresh session) — READ-ONLY orientation, NEVER act

**Hydrate = briefing, not work.** Output is a context summary; then STOP and wait for the human's go. NEVER in hydrate: edit a file, `git add`/commit/push, publish, run a `## Next` step, or run any build/test/destructive command. Reading is allowed; mutating is not.

**Path:** if the user's message names a handoff path ("inicie lendo o handoff em /tmp/x.md"), use THAT exact path — it overrides the resolver. Otherwise run `scripts/handoff-path.sh` (or `scripts/collect.sh` `## handoff` block) to resolve it.

1. Get the handoff path (message path wins, else resolver). If the file does not exist, tell user, stop
2. Read the handoff file at that path
3. **Diff declared vs real.** Mismatch (files changed not in map, branch differs, status stale) → note it in the summary
4. Output a **≤2-paragraph context summary** of the prior session: what it was doing + key decisions + current state + what `## Next` proposes. Plain prose, no commands run
5. STOP. List the proposed first action as a suggestion only. Wait for explicit human go before reading map files or doing anything else

### 3. VALIDATE (standalone)

`scripts/validate.py [path]` — no arg → resolved path. Mechanical checks: sections present, paths exist, line budget, status valid, code block size, staleness vs git. Exit 0/1/2.

Semantic check (am-I-clear-to-a-stranger): only meaningful from a context-free reader. In Claude Code → spawn subagent with only the file + "list ambiguities, vague next steps, commands without success criteria". Same-session self-review = author grading own homework, skip it.

### 4. COMPRESS EXISTING (verbose handoff → caveman)

Read file → apply `references/compression.md` → rewrite → validate → show before/after line+char counts. Anchors byte-preserved (verify: every path/command in original still present identical in output).

## Anti-patterns

- Pasting `git status` / diffs / logs into handoff → collect.sh derives live
- Chronological narrative → state only
- Permanent architecture decisions accumulating → those go to ADR / CLAUDE.md; handoff dies with task
- HANDOFF_ARCHIVE/ directory → if committed (`$HANDOFF_PATH` points in-repo), `git log -- <path>` is the archive; temp default has no archive by design
- Compressing a decision into ambiguity → auto-clarity rule wins over budget

## Bundled

- `references/template.md` — the 6-section template + filled example
- `references/compression.md` — caveman rules adapted for handoff docs, before/after pairs
- `scripts/handoff-path.sh` — resolves handoff location (`$HANDOFF_PATH` > `$TMPDIR/<repo-slug>-HANDOFF.md`), single source of truth
- `scripts/collect.sh` — live git facts + resolved handoff path/existence to stdout, zero deps
- `scripts/validate.py` — mechanical lint, exit-coded, CI/hook-ready; default path mirrors the resolver
- `assets/commands/` — `/handoff` + `/hydrate` slash commands for Claude Code (copy to `.claude/commands/`)
- `assets/claude-md-snippet.md` — 2 lines for CLAUDE.md so hydration triggers even when user forgets
