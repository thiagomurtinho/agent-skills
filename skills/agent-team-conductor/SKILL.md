---
name: agent-team-conductor
description: >
  Use when preparing an agent-team teammate: choose the model that fits the workload
  (Haiku / Sonnet / Sonnet-high / Opus) and write a clear xml-like task prompt with a
  minimal focused handoff. Triggers: spawning a teammate, Agent(name=…), "which model for this
  member", "how to structure the teammate prompt".
license: Proprietary
metadata:
  author: thiago
  version: "2.0.0"
---

<agent-team-conductor version="2.0.0">

# Agent Team Conductor

When preparing an agent-team member, make two choices before spawning it:

1. Pick the model that fits the workload.
2. Shape the prompt as a self-contained xml-like `<task>` with a minimal focused `<handoff>`.

The goal is a teammate brief that is cheap enough, strong enough, and clear enough to execute without
inherited conversation context.

<mandatory-taskcreate>
**MANDATORY — no exceptions.** Whenever work runs through an agent team, the work MUST be distributed as
explicit task records via `TaskCreate` (one task per unit of work) and assigned with `TaskUpdate`
(`owner` = teammate name; `status` pending -> in_progress -> completed). NEVER hand a teammate its work
only inside the spawn `<task>` brief — that leaves `~/.claude/tasks/<team>/` empty, breaks the dashboard
board (shows 0/0), and erases the audit trail.

Order: `TaskCreate` for every work unit -> spawn teammates via `Agent(name=…)` (no team-creation step
-- the session is already an implicit team with `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` on) ->
`TaskUpdate owner=<teammate>` to assign -> teammates flip status as they progress. The spawn `<task>`
brief still carries the self-contained context, but it POINTS AT the task it owns; it does not replace it.

Verify before declaring the team running: `ls ~/.claude/tasks/<team>/*.json` must list one file per work
unit. If empty, you skipped `TaskCreate` — stop and create them.
</mandatory-taskcreate>

<model-routing>
Pick the member's model up front, by the kind of work. Rule: the stronger model where a mistake is
costly; the lower the effort, the more fully specified the task.

| recruit for | model | effort | type |
|---|---|---|---|
| run a command & report (build / test / lint / migration / log) | Haiku | — | `haiku-runner` |
| well-specified implementation (the common case) | Sonnet | `medium` | `sonnet-executor` |
| delicate: cross-module integration, contract-touching refactor | Sonnet | `high` | `sonnet-executor-high` |
| a whole RFC / complete front: wide scope + design judgment (GATED — see below) | Opus | `medium` | `opus-executor` |

Pick the lowest tier that fits; the default is `sonnet-executor`. **Opus is gated:** the `opus-executor`
tier is recruited ONLY when the user explicitly asks, in chat, to run a front on Opus. It is never the
default and never auto-selected — absent an explicit request the ceiling is `sonnet-executor-high`. Apply the choice in the spawn
instruction: name the matching `subagent_type`, name the intended model/effort, and confirm the
created teammate actually matches. The defs in `assets/roster/` carry the role behavior, tools, and
model/effort defaults where the runtime honors them.

Two notes that protect the choice:

- **Never set `CLAUDE_CODE_SUBAGENT_MODEL`** — it overrides every member's model and erases this choice.
- A planned model is not enough: if the spawned teammate does not show the intended model, stop and
  respawn or correct it before spending work tokens.
- Effort is per model: `medium`/`high` for Sonnet; Haiku has none.

Full routing detail → `references/model-routing.md`.
</model-routing>

<xml-prompt>
Write each member's prompt in the xml-like `<task>` form, so the brief is unambiguous and
self-contained (the member does not inherit your conversation). **Always include `<handoff>`** — the
*minimal, focused* context that this task needs and nothing more.

```xml
<task>
  <responsibility>one sentence — what to produce</responsibility>
  <files>exact files to touch</files>
  <constraints>what NOT to touch</constraints>
  <return-format>the condensed result wanted back — verdict + file:line</return-format>
  <grounding>don't fabricate; if info is missing, say so; cite file:line</grounding>
  <handoff>minimal focused context for THIS task only: the decision, the file/contract refs, the expected return — nothing extra</handoff>
</task>
```

The full tag menu (when to reach for `<context>`, `<input>`, `<process>`, `<examples>`, …) and one
worked example per model tier → `references/xml-cardapio.md`.
</xml-prompt>

</agent-team-conductor>
