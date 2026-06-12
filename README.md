# agent-skills

[![skills.sh](https://skills.sh/b/GH_OWNER/agent-skills)](https://skills.sh/GH_OWNER/agent-skills)

Reusable skills for AI coding agents (Claude Code, Codex, Cursor, and [50+ others](https://github.com/vercel-labs/skills#supported-agents)). Built around one principle: **AI prepares, human decides** — and the fewer tokens spent doing it, the better.

## Install

```bash
# all skills
npx skills add GH_OWNER/agent-skills

# one skill
npx skills add GH_OWNER/agent-skills --skill cave-handoff

# global, Claude Code only, no prompts
npx skills add GH_OWNER/agent-skills --skill cave-handoff -g -a claude-code -y
```

## Skills

| Skill | What | Why |
| --- | --- | --- |
| [cave-handoff](skills/cave-handoff/) | Session handoff as verifiable operational state — caveman-compressed `HANDOFF.md` + deterministic git collection + mechanical validation + hydration protocol | Fresh session continues work without reading old conversation. ~47% fewer chars than verbose handoff templates, 0% anchor loss, reread every hydration → savings compound |

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
