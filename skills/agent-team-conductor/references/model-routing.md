# Model routing — choosing a member's model

Load when deciding which model a recruited team member should run. The one rule, then the roster and
how to apply it.

## The rule

> Put the **stronger model where a mistake is costly**; the **lower the effort, the more fully
> specified** the task it receives. Low effort and high specification are two faces of one choice —
> a member on low effort gets a task so specified that little is left to decide.

## Recruitable roster

| type | model | effort | recruit for | tools |
|---|---|---|---|---|
| `sonnet-executor` (default) | Sonnet | `medium` | well-specified implementation, tests, technical docs | Read, Write, Edit, Bash, Grep, Glob |
| `sonnet-executor-high` | Sonnet | `high` | delicate but Sonnet-tractable: cross-module integration, contract-touching refactor, branch-heavy logic | Read, Write, Edit, Bash, Grep, Glob |
| `haiku-runner` | Haiku | — (no effort knob) | run a command & report: build / test / lint / migration / log collection | Bash, Read, Grep — no Write/Edit |

## The ladder — pick the lowest tier that fits

1. **Run a command & report** → `haiku-runner` (Haiku).
2. **Well-specified implementation** (the common case) → `sonnet-executor` (Sonnet `medium`).
3. **Delicate but still Sonnet-tractable** (integration, contract refactor) → `sonnet-executor-high`
   (Sonnet `high`) — raise the effort, not the model.

Default is `sonnet-executor`. Moving up a tier is a deliberate choice, made because the task is
delicate, not by reflex.

## How to bind the model to the member

- **By `subagent_type`** — spawn with `subagent_type: "sonnet-executor"` (etc.). The defs in
  `assets/roster/*.md` carry both the **model** and the **tool set** (e.g. `haiku-runner` has no
  Write/Edit), and their body is appended to the member's prompt.
- **By `model` directly** — set `Agent` `model: "sonnet" | "haiku"` on the spawn call.

## Two notes that protect the choice

- **Never set `CLAUDE_CODE_SUBAGENT_MODEL`.** It overrides the model of *every* member, ignoring each
  one's frontmatter / spawn model — flattening the whole roster to a single model and erasing the
  per-member choice this skill exists to make. Leave it unset (or `inherit`).
- **Effort is per model.** `medium`/`high` apply to Sonnet; Haiku has no effort knob. An unsupported
  level falls back to the highest the model supports.
