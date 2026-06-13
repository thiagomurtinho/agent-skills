---
name: agent-team-conductor
description: >
  Run a Claude Code agent team with GSD discipline — triage whether a team is even
  warranted, decompose into disjoint-file waves, route each task to the right model
  (Haiku/Sonnet/Opus by cost-of-mistake), spawn teammates from a maximum-detail task
  contract, gate before execution, escalate failures Sonnet→Opus, verify, and clean up
  via the leader. Use when about to create or already running an agent team: "create/run
  an agent team", "orchestrate teammates", "parallelize this across agents with a roster",
  "route models for the team", "coordinate the team", after TeamCreate/Agent(team_name)/
  SendMessage, or when "the team is stuck / overwriting files / leader does the work itself
  / burning tokens". Complements agent-team-dashboard (that is observability; this is doctrine).
license: Proprietary
metadata:
  author: thiago
  version: "1.1.0"
---

<agent-team-conductor version="1.1.0">

# Agent Team Conductor

Doctrine for the **leader** session running a Claude Code agent team. Output: a team run with
GSD discipline — right triage, model routing, disjoint waves, gated execution, escalation, and
clean teardown — instead of token waste, overwrites, and stalls.

Two layers, kept distinct (per `references/gsd-over-teams.md`):

- **Agent Teams is the substrate** — a lead, independent teammates with their own context windows,
  a shared task list, a mailbox for direct agent-to-agent messages.
- **GSD is the discipline applied on top** — *how* work is decomposed, *where* the human decision
  points sit, *which* model does each thing, and *how* it stays auditable.

The useful comparison is never "GSD or Teams" — it's **raw team vs. team + GSD discipline**. A team
is the **expensive exception**: each teammate is a full Claude session; token cost scales linearly
per teammate plus coordination overhead. Justify it before `TeamCreate`.

Tools the leader drives with: `TeamCreate`, `Agent` (`team_name`/`name`/`subagent_type` → spawn
teammate), `TaskCreate`/`TaskList`/`TaskUpdate`/`TaskGet`, `SendMessage`, `Monitor` (wait), `TaskStop`,
`TeamDelete`. The arc below is the GSD loop **Discuss → Plan → Approve → Execute → Verify → Ship**
rendered onto Teams: **Triage → Plan → Route → Spawn → Execute → Verify → Escalate → Ship** (Discuss
folds into Triage; Approve lives inside Plan as the lead-mediated gate).

<triage>
Two decisions before spawning anything.

**1. Team at all?** Spawn one only for parallel work that is genuinely *independent*: research/review
from distinct angles, competing-hypothesis debug, new modules with separate owners, cross-layer
changes. Sequential work, same-file edits, or dependency-heavy chains → a **single session**
(default) or **subagents** (a result reported back, no cross-talk). Reach for a team only when
teammates must *talk to each other*. Don't create a team to look busy.

**2. How much discipline on top?** This is the load-bearing call (full rationale in
`references/gsd-over-teams.md`):

- **Knowable decomposition + interdependent code + expensive plan mistakes** → run the **full GSD
  discipline**: routing roster, maximum-detail contracts, disjoint-file waves, escalation ladder.
  Cheap gates and clean partitioning pay for themselves in rework and tokens not spent twice.
- **Emergent/exploratory decomposition** (debug hypotheses, research, cross-layer negotiation) →
  let the team **self-organize** through the task list and mailbox. Forcing waves and contracts here
  fixes too early what should emerge — the discipline becomes dead weight.

Rule: the more it's *executing a known decomposition*, the more discipline helps; the more it's
*discovering the decomposition*, the more the raw team helps. And when you need the discipline but
**not** agent-to-agent chat, **subagents with worktree isolation** beat a team — they keep file
disjointness by infrastructure, which Teams cannot (see gotchas).
</triage>

<preflight>
Fail loud before spawning:

```bash
bash skills/agent-team-conductor/scripts/preflight.sh
```

Verifies `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`, Claude Code ≥ v2.1.32, and that no team already
exists (one team per leader — hard limit). Non-zero exit = fix that first; don't `TeamCreate` over it.
The **lead must be Opus at creation** — it's fixed for the team's life and does the expensive
reasoning. Be on Opus before you create the team; the prior chat model is irrelevant.
</preflight>

<plan>
Decompose, gate, and partition before any teammate runs.

- **Decompose** along the GSD hierarchy **Milestone → Phase → Plan → Task**. Teams is a flat task
  list and can't nest teams to represent phases, so the hierarchy stays shallow — keep the
  Phase/Milestone structure in your own planning doc, not in the team.
- **Size and cap.** Keep **3–5 teammates active** — token cost scales per teammate and coordination
  overhead/conflict risk climbs past that; three focused beat five scattered. Aim for ~5–6 tasks per
  teammate, each a self-contained deliverable.
- **Human gate before execution.** GSD wants a human gate at *every* level (roadmap, breakdown, plan,
  transition); on Teams only the **plan-approval** gate is mechanizable, and even that is *lost* in its
  native form — the **lead** approves teammate plans autonomously, not you. Approximate it: use
  `require plan approval`, give the lead explicit approval **criteria** ("only approve plans with test
  coverage; reject schema changes"), and hold the other levels by observing and steering. A bad plan
  approved by the lead costs the whole execution cycle; a gate before execution costs only planning
  tokens. Move the failure to the cheap phase.
- **Disjoint-file waves.** Only parallelize tasks whose file sets **don't intersect**; tasks touching
  the same file are **sequenced**, not concurrent. Teams has no worktree, so disjointness is a
  promise of your plan backed by the task list's file lock — not an infrastructure guarantee. This is
  the single most important rework-preventer.
- **Keep a PLAN/STATE doc** (e.g. `PLAN.md`). Team state is ephemeral — it vanishes on cleanup. A
  versioned planning doc recording tasks, owners, models, waves, and dependencies is what gives the
  run the auditability Teams doesn't provide natively.
</plan>

<roster>
Route every task to the cheapest model that solves it. One rule:

> **Put the strong model where a mistake is expensive; the lower the executor's effort, the higher
> the specification it receives.** A non-lead Opus is the exception, never the default.

Complexity ladder — place each task on the **lowest rung that solves it**; moving up is an explicit,
logged lead decision:

1. **Run & report** (build, test, lint, migration, log) → `haiku-runner`.
2. **Well-specified implementation** (the majority) → `sonnet-executor` (`medium`).
3. **Tractable but delicate** (cross-module integration, contract refactor) → `sonnet-executor-high`.
4. **High risk / high complexity** → `opus-fallback` directly (lead skips Sonnet on purpose).

Boundary for rung 1: if a command is fully predetermined **and nobody reads the output**, it's a
**hook/script**, not a Haiku teammate (a teammate carries fixed context cost) — "mechanical = no
model." Full roster table (model/effort/tools per role) → `references/gsd-over-teams.md`;
ready-to-install role definitions → `assets/roster/`, referenced by `subagent_type`.
</roster>

<spawn>
A teammate inherits project context (CLAUDE.md, MCP, skills) but **not the leader's conversation
history**. Every Sonnet/Opus task ships a **maximum-detail contract** (template in
`references/gsd-over-teams.md`):

- **Objective** in one sentence — what exists at the end.
- **Exact files** to touch — disjoint from every other task in the wave.
- **Inputs & outputs** — contracts, types, formats.
- **Verifiable acceptance criteria** — what the verifier / `haiku-runner` will check.
- **Constraints / what NOT to touch** — explicit negative delimitation.
- **Examples** or a pointer to an existing codebase pattern.
- **Expected return + on-conflict** — the condensed report format you want back, and what to do if
  the teammate's finding diverges from a peer's (escalate to the lead, don't silently pick a side).

If the lead can't write this, the task isn't ready for a Sonnet `medium` — bump it to
`sonnet-executor-high` or send it back to decomposition. Also: give each teammate a **deterministic
`name`** so you can `SendMessage` it later; reuse roles via `subagent_type`; and **append
`assets/teammate-charter.md`** to every spawn prompt (single responsibility, stay in your file set,
condensed standardized returns, escalate conflicts, mark `completed` when done). Worked per-role
examples → `references/spawn-prompts.md`.
</spawn>

<execute>
Steer, don't substitute.

- **Do not implement tasks yourself.** The leader coordinates. If you catch yourself editing instead
  of delegating, stop. `Monitor` (or wait on idle notifications) until teammates finish.
- **Steer drift** early with `SendMessage`; don't let a wrong approach run to completion.
- **Audit task health** instead of eyeballing:

```bash
bash skills/agent-team-conductor/scripts/task-audit.sh
```

Flags tasks stuck `in_progress`, dependents still blocked though their deps are `completed` (the
documented status-lag bug), and unowned ready work. When it flags a stale task whose work is done,
`TaskUpdate` it to `completed` to release dependents.
</execute>

<verify>
Every task has verifiable acceptance criteria (from its contract) — check them, don't assume done.

- Run the criteria mechanically: a `haiku-runner` (or a `command` hook) runs the build/tests/lint and
  reports pass/fail. Deterministic checks belong in **hooks**, off the model budget entirely.
- A task is shippable only when its criteria pass and its files are within its declared set.
</verify>

<escalation>
Sonnet → Opus on failure follows an explicit trigger, not a feeling:

1. A `sonnet-executor`/`-high` delivers the task.
2. The verifier (or `haiku-runner` running the acceptance criteria) **rejects** it.
3. The lead returns it **once**, with the rejection reason, for the same Sonnet to retry.
4. Rejected a second time → the lead **escalates** the task to `opus-fallback`, passing the history of
   both attempts and the errors.

Escalation is **per task**, last resort, and **logged** in the PLAN doc (which task, attempts, why it
went up). This keeps "go to Opus" from becoming the easy path that blows the budget.
</escalation>

<cleanup>
Always via the **leader**. Shut teammates down first (`TaskStop` / ask them to shut down — they may
finish the in-flight tool call, so it's slow), confirm none active, then `TeamDelete` / clean up.
**Never** let a teammate run cleanup — its team context may not resolve, leaving shared state
inconsistent. Before cleanup wipes the ephemeral team state, make sure the PLAN doc captured what's
worth keeping.
</cleanup>

<gotchas>
The ones that bite mid-run:

- **`CLAUDE_CODE_SUBAGENT_MODEL` kills routing.** It overrides *every* teammate's model, ignoring each
  definition's frontmatter — silently flattening the whole roster to one model. Leave it unset (or
  `inherit`).
- **No worktree → disjointness is only a promise.** Two teammates editing the same file overwrite
  each other; nothing isolates them. Partitioning is the lead's job, enforced by the wave plan.
- **Approval is mediated, not yours.** The lead approves teammate plans autonomously. You influence it
  only via criteria in its prompt + observation — there is no native "nothing advances without my OK".
- **Team state is ephemeral.** No durable STATE.md by construction; it dies on cleanup. The PLAN doc
  is your only persistence.
- **Effort is per model.** `medium`/`high` for Sonnet, `high`/`xhigh` for Opus, Haiku ignores effort;
  unsupported levels fall back to the highest supported.
- **No in-process session resume.** `/resume`/`/rewind` don't restore in-process teammates → spawn
  fresh ones.
- **Permissions set at spawn.** Teammates start in the leader's mode; every teammate permission prompt
  surfaces to the *leader*. Pre-approve common ops before spawning.
- **Experimental limits.** One team per leader, lead fixed for life, no nested teams, slow shutdown.

Full failure-mode → recovery table: read `references/failure-modes.md` when something goes wrong.
</gotchas>

<companions>
- **Long run?** Offer the **agent-team-dashboard** skill — live web view of progress, tasks, and
  inter-agent messages. This skill is doctrine; that one is observability.
- **Hard quality gates?** Wire hooks: `TeammateIdle` (exit 2 keeps a teammate working), `TaskCreated`,
  `TaskCompleted` (exit 2 blocks + sends feedback). Hooks enforce mechanically what prose only asks —
  and are where deterministic verification belongs.
</companions>

## Bundled

- `scripts/preflight.sh` — env flag + version + one-team-limit check, exit-coded. Run before `TeamCreate`.
- `scripts/task-audit.sh` — reads `~/.claude/tasks/<team>/` live; flags stuck/blocked/unowned tasks.
- `references/gsd-over-teams.md` — the roster table, routing ladder, task contract, escalation, waves,
  auditability, and the discipline-vs-raw-team decision. Load when planning interdependent code work.
- `references/spawn-prompts.md` — worked self-contained spawn prompts per roster role, charter included.
- `references/failure-modes.md` — every documented limitation paired with its recovery action.
- `assets/roster/` — ready-to-install subagent definitions (`sonnet-executor`, `sonnet-executor-high`,
  `haiku-runner`, `opus-fallback`); reference by `subagent_type`.
- `assets/teammate-charter.md` — injectable behavior block; append to every spawn prompt.

</agent-team-conductor>
