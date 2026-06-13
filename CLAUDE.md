# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A collection of **reusable agent skills** (per the [Agent Skills spec](https://agentskills.io)) published via [skills.sh](https://skills.sh/thiagomurtinho/agent-skills). Not an application — there is no build step, no package manifest, no central runtime. Each `skills/<name>/` folder is an independent, self-contained unit shipped to AI coding agents (Claude Code, Codex, Cursor, 50+ others) through `npx skills add`.

Guiding principle: **AI prepares, human decides** — minimize tokens spent doing it.

## Layout

```
skills/<name>/
├── SKILL.md          # frontmatter (name, description) + instructions — the entry point
├── references/       # docs loaded on demand (progressive disclosure)
├── scripts/          # deterministic, exit-coded tooling (bash/python)
└── assets/           # slash commands, templates, copyable snippets
```

`name` in frontmatter MUST match the folder name (`[a-z0-9-]`, ≤64 chars). The `description` is the sole trigger mechanism — it carries the entire activation burden, so it is written imperative and deliberately pushy to fight under-triggering.

## Working on skills

There is no test runner or linter at the repo root. Each skill brings its own tooling. Commands below are run from the repo root.

**rick-portal-handoff** — session-state handoff. Scripts are zero-dep:
```bash
bash skills/rick-portal-handoff/scripts/handoff-path.sh        # resolve handoff location
bash skills/rick-portal-handoff/scripts/collect.sh             # live git facts to stdout
python skills/rick-portal-handoff/scripts/validate.py [path]   # mechanical lint, exit 0/1/2
```

**skill-forge** — authors/improves other skills; has the only substantial Python. Scripts run as a module from inside the skill dir:
```bash
cd skills/skill-forge
python scripts/quick_validate.py <skill-path>                  # fast spec check
python -m scripts.run_loop --eval-set <path> --skill-path <skill> --model <session-model-id> --max-iterations 5
```
The eval/benchmark loop, schemas, and grader/comparator/analyzer subagents are documented in `skills/skill-forge/references/`.

**agent-team-dashboard** — local Node HTTP server (Node 18+, stdlib only, zero deps):
```bash
bash skills/agent-team-dashboard/assets/launch.sh [TEAM] [REPO]   # free port from 4317, background, opens browser, prints PID
```

**codex-delegate / antigravity-delegate** — passthrough wrappers to external CLIs (`codex` / `agy` must be on PATH). Self-contained, no host config:
```bash
bash skills/codex-delegate/scripts/run-codex.sh [-m MODEL] [-s SANDBOX] [-e EFFORT] -- "<prompt>"
bash skills/antigravity-delegate/scripts/run-antigravity.sh -- "<prompt>"
```

To verify a skill end-to-end: read its `SKILL.md` and follow it to do a real task (skill-forge's `<evaluation>` describes this self-run loop). There is no CI gate.

## Authoring conventions (followed by every skill here)

These are not generic advice — they are the actual, load-bearing rules the existing skills embody. New or edited skills should match them.

- **State, not history** — handoff/memory files store final verifiable state, never chronological narrative ("we tried X then Y").
- **Derive, don't store** — anything git already knows (branch, diff, status, modified files) is fetched live by a script at use-time, never copied into a file where it goes stale. See `rick-portal-handoff/scripts/collect.sh`.
- **Caveman compression with auto-clarity** — prose gets compressed (~50%); but **anchors stay byte-exact**: file paths, symbol/function names, commands, flags, env vars, error signatures. Decisions, security-relevant notes, and retry conditions stay full sentences — ambiguity there costs more than tokens.
- **Scripts for determinism, model for judgment** — mechanical checks are exit-coded python/bash (hookable, CI-able); semantic/"is-this-clear-to-a-stranger" checks go to a context-free subagent, never same-session self-review.
- **Technique injection by need** — when forging a skill, classify the task and inject only matching techniques (skill-forge's INCLUDED/CONDITIONAL/EXCLUDED tiers in `references/technique-arsenal.md`). No maximalist template, no ceremonial reasoning blocks, no ALWAYS/NEVER walls where explaining *why* serves better.
- **Progressive disclosure** — keep `SKILL.md` lean (~under 500 lines); push detail to `references/` with an explicit load-trigger ("read `references/x.md` when …"), not a vague "see references/".

## Notes

- Skills may have mixed language: some are English, some Brazilian Portuguese (`agent-team-dashboard`). Match the language of the skill you're editing.
- `.claude/launch.json` is a local preview config for `agent-team-dashboard` (hardcoded to a specific machine path) — not part of any shipped skill.
- Some skills carry `license: Proprietary` in frontmatter despite the repo's MIT `LICENSE`; preserve the per-skill license as found.
