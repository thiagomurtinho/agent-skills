---
name: codex-delegate
description: Delegate a one-off task to the Codex (OpenAI) CLI via the bundled passthrough wrapper `scripts/run-codex.sh`. Use when the user says "delegate to codex", "run this on codex", "ask codex", "delega pro codex", or wants a second-model opinion / mechanical processing / isolated judge run outside the current agent's token budget. ONLY for Codex — not Claude, Gemini, or other models. Do NOT use for tasks that need MCP/tools from the current session — keep those in the current agent.
allowed-tools: Bash(scripts/run-codex.sh *) Bash(cat *) Bash(wc *) Read Write
---

# codex-delegate

Fire one-off tasks at the **Codex (OpenAI) CLI** through the bundled passthrough wrapper `scripts/run-codex.sh` (calls `codex exec`, returns output). Good for: second opinion from another model, mechanical processing, rewrite, isolated judge/critique, content generation — off the current agent's token budget.

Requires the `codex` binary on PATH (`codex` CLI installed and authenticated). The wrapper is self-contained: no host-project hooks, quota gating, or config required.

## When NOT to use
- Task belongs to the current agent / its own model → just do it inline.
- Task needs MCP or tools from the current session (Calendar, browser, repo MCP) → Codex can't see them.
- Strategic decision that's the user's to make.

## Wrapper signature
```
scripts/run-codex.sh [-m MODEL] [-s SANDBOX] [-e EFFORT] -- "<prompt>"
```
- Defaults: `-m gpt-5.4-mini` · `-s read-only` · `-e medium`.
- Don't pass raw `-c`, `-o`, or `--skip-git-repo-check` — the wrapper handles them.
- Capture output: redirect in your shell (`... -- "<p>" > /tmp/out.md; cat /tmp/out.md`). There is no `-o` flag.
- File context: embed it in the prompt (`$(cat file)` inside the context section), not via pipe — the wrapper reads `$*`, not stdin.

## Model routing
| Model | When | Flag |
|---|---|---|
| `gpt-5.4-mini` (default) | mechanical, cheap, fast, high volume / loops | (omit) |
| `gpt-5.5` | judgment/quality: final judge, critique, architecture | `-m gpt-5.5` |

## Effort routing
| Task | effort |
|---|---|
| Mechanical (rename, format, parse, 1:1 rewrite) | `-e low` |
| Standard analysis / synthesis | `-e medium` (default) |
| Deep reasoning, critique, judge | `-e high` |

## Sandbox routing
| Need | flag |
|---|---|
| Read/analyze only (default) | `-s read-only` |
| Edit files | `-s workspace-write` (confirm with user first) |

## Prompt format
Codex does NOT see the current conversation. Give full context and request an explicit output format. A compact XML-ish task block works well:
```
<task name="..." output="...">
  <objective>what to produce</objective>
  <context>...embedded file content / facts...</context>
  <constraints>...limits, "default skeptical", etc...</constraints>
  <output>required shape (e.g. "JSON only, no markdown fences")</output>
</task>
```
For JSON output, instruct it in the prompt ("return valid JSON only, no markdown, no code fences") — there is no format flag.

## Steps
1. **Components:** task · context files (embed in prompt) · model (mini/5.5) · effort · sandbox.
2. **Build & run:**
   ```bash
   scripts/run-codex.sh -m gpt-5.4-mini -e low -- '<task name="..." output="..."><objective>...</objective><context>...</context><output>...</output></task>'
   ```
   Capture to file:
   ```bash
   scripts/run-codex.sh -m gpt-5.5 -e high -- '<task ...>...</task>' > /tmp/codex-out.md 2>&1; tail -40 /tmp/codex-out.md
   ```
3. **Return:** show the output; if redirected, preview the file. On failure, surface the full error + a fix.
4. **Apply (optional):** `-s workspace-write` only with clear intent to edit; confirm before overwriting; then `git status`.

## Examples
Blind final judge (5.5, high):
```bash
scripts/run-codex.sh -m gpt-5.5 -e high -- '<task name="judge" output="verdict"><objective>Verdict VALIDATED|INVALIDATED|INCONCLUSIVE on the evidence.</objective><context>'"$(cat /tmp/evidence.md)"'</context><constraints>You did not see the executor conclusion. Default skeptical.</constraints><output>VERDICT + 3 checks + threats.</output></task>'
```
Mechanical (mini, low):
```bash
scripts/run-codex.sh -m gpt-5.4-mini -e low -- '<task name="changelog" output="markdown"><objective>Generate a changelog from this state.</objective><context>'"$(cat STATE.md)"'</context><output>Markdown.</output></task>' > changelog.md
```

## Verify
(1) wrapper exited cleanly; (2) output makes sense; (3) if redirected, check the file; (4) if `workspace-write`, run `git status`.
