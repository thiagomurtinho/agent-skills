# agent-skills

[![skills.sh](https://skills.sh/b/thiagomurtinho/agent-skills)](https://skills.sh/thiagomurtinho/agent-skills)

Reusable skills for AI coding agents (Claude Code, Codex, Cursor, and [50+ others](https://github.com/vercel-labs/skills#supported-agents)). Built around one principle: **AI prepares, human decides** — and the fewer tokens spent doing it, the better.

## Install

```bash
# all skills
npx skills add thiagomurtinho/agent-skills

# one skill
npx skills add thiagomurtinho/agent-skills --skill rick-portal-handoff

# global, Claude Code only, no prompts
npx skills add thiagomurtinho/agent-skills --skill rick-portal-handoff -g -a claude-code -y
```

## Skills

| Skill | What | Why |
| --- | --- | --- |
| [rick-portal-handoff](skills/rick-portal-handoff/) | Session handoff as verifiable operational state — caveman-compressed `HANDOFF.md` + deterministic git collection + mechanical validation + hydration protocol | Fresh session continues work without reading old conversation. ~47% fewer chars than verbose handoff templates, 0% anchor loss, reread every hydration → savings compound |
| [codex-delegate](skills/codex-delegate/) | Delegate a one-off task to the Codex (OpenAI) CLI via a standalone passthrough wrapper — model/effort/sandbox routing baked in | Second-model opinion, mechanical processing, or isolated judge runs off the main agent's token budget. Self-contained: no host hooks or config |
| [antigravity-delegate](skills/antigravity-delegate/) | Delegate a one-off task to the Antigravity (`agy` / Gemini) CLI via a standalone passthrough wrapper | Fast/cheap Gemini runs — smoke tests, scouting, second opinion — off the main agent's budget. Self-contained |
| [pr-text](skills/pr-text/) | Compose a PR description in a fixed house-pattern (`[Claudinho]` → O que muda → Por quê → Detalhe técnico → Como testar → DoD), diff facts derived live via script | Reviewer grasps value before implementation in 10s; nothing fabricated; mirrors the issue house-pattern for diffs |

## Design principles

- **State, not history** — handoffs and memory files store final verifiable state, never chronological narrative.
- **Derive, don't store** — anything git already knows (branch, diff, status) is fetched live by script, never copied into files where it goes stale.
- **Caveman compression with auto-clarity** — prose gets compressed (~50%, after [caveman](https://github.com/JuliusBrussee/caveman)); paths, symbols, commands and error signatures stay byte-exact; decisions and retry-conditions stay full sentences because ambiguity there costs more than tokens.
- **Scripts for determinism, model for judgment** — mechanical checks are exit-coded Python/bash (hookable, CI-able); semantic checks go to a context-free subagent.

## Skill anatomy

Each skill follows the [Agent Skills spec](https://agentskills.io):

```
skills/<name>/
├── SKILL.md          # frontmatter (name, description) + instructions
├── references/       # docs loaded on demand
├── scripts/          # deterministic, exit-coded tooling
└── assets/           # slash commands, snippets to copy
```

## License

MIT
