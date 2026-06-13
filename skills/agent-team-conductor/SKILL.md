---
name: agent-team-conductor
description: >
  Firm operating doctrine for running a Claude Code agent team — gate hard before
  creating one, spawn teammates with self-contained prompts, partition work to avoid
  file conflicts, supervise without doing the work yourself, and clean up via the
  leader. Use when about to create or already running an agent team: "create/run an
  agent team", "orchestrate teammates", "parallelize this across agents", "coordinate
  the team", after TeamCreate/Agent(team_name)/SendMessage, or when "the team is stuck /
  not finishing / leader keeps doing the work itself". Complements agent-team-dashboard
  (that is observability; this is the operating doctrine).
license: Proprietary
metadata:
  author: thiago
  version: "1.0.0"
---

# Agent Team Conductor

Doctrine for the **leader** session orchestrating a Claude Code agent team. Agent teams
are experimental, token-expensive, and failure-prone. This skill keeps you from the two
ways they go wrong: **creating one you shouldn't**, and **mismanaging one you did**.

Tools the leader drives a team with: `TeamCreate`, `Agent` (`team_name`/`name`/`subagent_type`
→ spawn teammate), `TaskCreate`/`TaskList`/`TaskUpdate`/`TaskGet`, `SendMessage`, `Monitor`
(wait on teammates), `TaskStop`, `TeamDelete`. NL-only driving works too — the doctrine is
the same.

## 1. Stance

A team is the **expensive exception, not the default**. Each teammate is a full Claude
session with its own context window; token cost scales linearly per teammate plus
coordination overhead. Justify the spend before `TeamCreate`, not after.

## 2. The gate — decide before spawning

Spawn a team **only** for parallel work that is genuinely *independent*:
- Research / review from distinct angles (security vs perf vs tests on one PR).
- Debugging with competing hypotheses (teammates disprove each other → survivor is root cause).
- New modules / features where each teammate owns a separate piece.
- Cross-layer changes (frontend / backend / tests), one owner per layer.

Otherwise **don't**. Sequential work, edits to the same file, or dependency-heavy chains →
a **single session** (default) or **subagents** (when you only need a result reported back,
not cross-talk). Subagents are cheaper and have no coordination overhead — reach for a team
only when teammates must *talk to each other*, not just report up.

If the work doesn't clear this gate, say so and use the cheaper path. Don't create a team to
look busy.

## 3. Preflight — fail loud before spawning

```bash
bash skills/agent-team-conductor/scripts/preflight.sh
```

Verifies `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`, Claude Code ≥ v2.1.32, and that no team
already exists (one team per leader — limit is hard). Non-zero exit + message = fix that
first. Don't `TeamCreate` over a failed preflight.

## 4. Spawn discipline

A teammate inherits project context (CLAUDE.md, MCP, skills) but **not the leader's
conversation history**. Whatever it needs to act, put in the spawn prompt:

- **Self-contained brief**: exact file paths, the constraint set, the concrete deliverable,
  and the bar for "done" (e.g. severity ratings for a review). Vague prompt → wasted teammate.
- **Deterministic name** (`Agent` `name`): name each teammate so you can `SendMessage` it by
  name later. Tell the prompt what to call peers if they must coordinate.
- **Model**: teammates don't inherit the leader's `/model`. Set it deliberately per task.
- **Plan approval** for risky/destructive work: require the teammate to plan (read-only) and
  approve before it implements. Give the approval criteria in its prompt.
- **Reuse roles** via `subagent_type` — a `security-reviewer` subagent definition works as a
  teammate (its body appends to the system prompt; team tools stay available).
- **Append the charter**: paste `assets/teammate-charter.md` into every spawn prompt. It is
  the standing behavior that defuses the documented failure modes at the source.

Worked spawn-prompt examples per role → read `references/spawn-prompts.md` before writing your first.

## 5. Task discipline

- **Team size 3-5.** Three focused teammates beat five scattered. Returns diminish fast.
- **~5-6 tasks per teammate.** Too small → coordination overhead exceeds benefit; too big →
  teammates run long without check-ins and waste effort. Size each task as a self-contained
  deliverable (a function, a test file, a review).
- **Declare dependencies** (`blockedBy`) so the system unblocks dependents automatically.
- **Assign or auto-claim**: assign explicitly, or let idle teammates claim the next unblocked
  task themselves. Claiming is file-locked against races.
- **Partition files.** Two teammates editing the same file = overwrite. Split ownership so each
  teammate owns a disjoint file set.

## 6. Supervise — steer, don't substitute

- **Do not implement the tasks yourself.** The leader coordinates. If you catch yourself
  editing instead of delegating, stop and wait. `Monitor` (or wait on idle notifications) until
  teammates finish.
- **Steer drift** with `SendMessage` — redirect a wrong approach early, don't let it run.
- **Audit task health** instead of eyeballing:
  ```bash
  bash skills/agent-team-conductor/scripts/task-audit.sh
  ```
  Flags tasks stuck `in_progress`, dependents still blocked though their deps are `completed`
  (the documented status-lag bug), and unowned ready work. When it flags a stale task whose
  work is actually done, `TaskUpdate` it to `completed` to release the dependents.

## 7. Shutdown & cleanup

Always via the **leader**. Shut teammates down first (`TaskStop` / ask them to shut down —
they may finish the current tool call first, so it can be slow), confirm none are active, then
`TeamDelete` / clean up. **Never** let a teammate run cleanup — its team context may not resolve,
leaving shared state inconsistent.

## 8. Companion tools

- **Long run?** Offer the **agent-team-dashboard** skill — live web view of progress, tasks, and
  inter-agent messages. This skill is doctrine; that one is observability.
- **Hard quality gates?** Wire hooks: `TeammateIdle` (exit 2 to keep a teammate working),
  `TaskCreated`, `TaskCompleted` (exit 2 to block + send feedback). Hooks enforce mechanically
  what prose only asks.

## Gotchas (the ones that bite mid-run)

- **No in-process session resume.** `/resume` and `/rewind` don't restore in-process teammates;
  after resuming, the leader may message teammates that no longer exist → spawn fresh ones.
- **Permissions are set at spawn.** Teammates start in the leader's permission mode; you can't set
  per-teammate modes at spawn time. Pre-approve common ops before spawning — every teammate
  permission prompt surfaces to the *leader*.
- **Leader shuts down early.** It may declare the team done before tasks really are. Tell it to
  continue / wait for teammates.
- **Shutdown is slow.** Teammates finish the in-flight tool call before exiting.

Full failure-mode → recovery table: read `references/failure-modes.md` when something goes wrong.

## Bundled

- `scripts/preflight.sh` — env flag + version + one-team-limit check, exit-coded. Run before `TeamCreate`.
- `scripts/task-audit.sh` — reads `~/.claude/tasks/<team>/` live; flags stuck/blocked/unowned tasks.
- `references/spawn-prompts.md` — worked self-contained spawn prompts per role, charter included.
- `references/failure-modes.md` — every documented limitation paired with its recovery action.
- `assets/teammate-charter.md` — injectable behavior block; append to every spawn prompt.
