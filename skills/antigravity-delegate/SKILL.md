---
name: antigravity-delegate
description: Delegate a one-off task to the Antigravity (agy / Google Gemini) CLI via the bundled passthrough wrapper `scripts/run-antigravity.sh`. Use when the user says "delegate to antigravity", "run this on agy", "ask gemini cli", "delega pro agy", or wants a fast/cheap Gemini run for smoke tests, scouting, visual/browser checks, or a second-model opinion outside the current agent's token budget. ONLY for Antigravity/agy — not Claude, Codex, or other models. Do NOT use for tasks that need MCP/tools from the current session.
allowed-tools: Bash(scripts/run-antigravity.sh *) Bash(cat *) Bash(wc *) Read Write
---

# antigravity-delegate

Fire one-off tasks at the **Antigravity (`agy`, Google Gemini) CLI** through the bundled passthrough wrapper `scripts/run-antigravity.sh` (calls `agy -p`, returns output). Good for: fast/cheap Gemini runs, smoke tests, scouting, visual/browser validation, second-model opinion — off the current agent's token budget.

Requires the `agy` binary on PATH (override with `AGY_BIN`). The wrapper is self-contained: no host-project hooks, quota gating, or config required.

## SECURITY — read before use
The wrapper runs `agy` with **`--dangerously-skip-permissions` by default**. Reason: headless `agy` (no TTY) hangs forever waiting for interactive tool-approval. The flag lets it run unattended. This means the delegated Gemini run can use tools (incl. file writes) without per-action approval. Intended for **trusted local use**. Don't point it at untrusted prompts/repos. To make the flag opt-in instead, see `README.md` ("Evolving to opt-in").

## When NOT to use
- Task belongs to the current agent / its own model → do it inline.
- Task needs MCP or tools from the current session → agy can't see them.
- Strategic decision that's the user's to make.

## Wrapper signature
```
scripts/run-antigravity.sh [-m MODEL] -- "<prompt>"
```
- Default model: `Gemini 3.5 Flash (Low)`. Override with `-m "<model name>"`.
- No sandbox flag (agy hangs with it under no-TTY). No `-o` flag — capture by redirecting in your shell.
- Override the binary: `AGY_BIN=/path/to/agy scripts/run-antigravity.sh ...`.
- File context: embed in the prompt; the wrapper reads `$*`, not stdin.

## Prompt format
agy does NOT see the current conversation. Give full context and request an explicit output format. A compact XML-ish task block works well:
```
<task name="..." output="...">
  <objective>what to produce</objective>
  <context>...embedded facts...</context>
  <output>required shape</output>
</task>
```
agy has **no `--output-format json`** — if you want JSON, instruct it in the prompt ("return valid JSON only, no markdown, no code fences"). Validate non-TTY output by redirecting (`> /tmp/x; cat /tmp/x`).

## Steps
1. **Components:** task · context files (embed) · model.
2. **Run:**
   ```bash
   scripts/run-antigravity.sh -- '<task name="smoke" output="text"><objective>...</objective><context>...</context><output>...</output></task>' > /tmp/agy-out.md 2>&1; tail -40 /tmp/agy-out.md
   ```
3. **Return:** show output; on failure surface the full error + a fix.

## Verify
(1) wrapper exited cleanly; (2) output makes sense; (3) if redirected, check the file.
