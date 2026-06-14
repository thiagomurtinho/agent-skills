# Model routing — choosing a member's model

Use this when choosing the teammate model before spawning. Start from the workload, pick the lowest
tier that can execute it reliably, then make the selected model visible in the spawn instruction.

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

Model routing is complete only when the created teammate actually runs the selected model.

- Use `subagent_type` for the role definition: behavior, constraints, tool shape, and default
  model/effort metadata from `assets/roster/*.md`.
- Make the intended runtime model explicit in the spawn instruction, next to the role:
  `subagent_type: "haiku-runner", model: "haiku"` or
  `subagent_type: "sonnet-executor-high", model: "sonnet", effort: "high"`.
- If the Agent surface exposes a `model` / `effort` field, set it there. If it only accepts natural
  language, state the model and effort in the spawn request itself.
- After spawn, check the created teammate. If it inherited the wrong model, stop and respawn/correct it
  before it spends tokens on the task.

## Two notes that protect the choice

- **Never set `CLAUDE_CODE_SUBAGENT_MODEL`.** It overrides the model of *every* member, ignoring each
  one's frontmatter / spawn model — flattening the whole roster to a single model and erasing the
  per-member choice this skill exists to make. Leave it unset (or `inherit`).
- **Unset env does not prove routing worked.** The spawn result is the source of truth.
- **Effort is per model.** `medium`/`high` apply to Sonnet; Haiku has no effort knob. An unsupported
  level falls back to the highest the model supports.
