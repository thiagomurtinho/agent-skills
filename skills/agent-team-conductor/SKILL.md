---
name: agent-team-conductor
description: >
  Use when recruiting/spawning an agent-team teammate: pick its model up front by the kind of work
  (Haiku / Sonnet / Sonnet-high) and write its prompt in the xml-like task form, always with a
  minimal focused handoff. Triggers: spawning a teammate, Agent(team_name=…), "which model for this
  member", "how to structure the teammate prompt". Covers only the model choice and the prompt shape —
  running the team itself follows the platform defaults.
license: Proprietary
metadata:
  author: thiago
  version: "2.0.0"
---

<agent-team-conductor version="2.0.0">

# Agent Team Conductor

When you recruit an agent-team member, decide two things — **which model it runs** and **how its
prompt is shaped**. This skill covers exactly those, and nothing else — everything about running the
team itself follows the platform defaults.

<model-routing>
Pick the member's model up front, by the kind of work. Rule: the stronger model where a mistake is
costly; the lower the effort, the more fully specified the task.

| recruit for | model | effort | type |
|---|---|---|---|
| run a command & report (build / test / lint / migration / log) | Haiku | — | `haiku-runner` |
| well-specified implementation (the common case) | Sonnet | `medium` | `sonnet-executor` |
| delicate: cross-module integration, contract-touching refactor | Sonnet | `high` | `sonnet-executor-high` |

Pick the lowest tier that fits; the default is `sonnet-executor`. Apply the choice by spawning with
the matching `subagent_type` (defs in `assets/roster/`, which carry the model + tools) or by setting
`Agent` `model` directly. Two notes that protect the choice:

- **Never set `CLAUDE_CODE_SUBAGENT_MODEL`** — it overrides every member's model and erases this choice.
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
