# GSD discipline over Agent Teams

Load when running **interdependent code work with a knowable decomposition** — assigning models,
sizing tasks, partitioning files. For exploratory work (competing-hypothesis debug, research), most
of this is overhead; let the team self-organize.

Grounded in the project's GSD references. Two layers, never conflated:

- **GSD is a discipline** — *how* work is decomposed, *where* human decision points sit, *which* model
  does each thing, *how* it stays auditable. Substrate-agnostic (single session, subagents, or team).
- **Agent Teams is an execution substrate** — a lead, independent teammates, a shared task list, a
  mailbox. The useful comparison is **raw team vs. team + GSD discipline**, not "GSD or Teams".

## The seven GSD principles mapped onto Teams

| GSD principle | Mechanism on Agent Teams | Friction / loss |
|---|---|---|
| Hierarchy Milestone → Phase → Plan → Task | Lead decomposes into shared-task-list tasks | Teams is a flat task plan, not nested phases. One team per lead, no sub-teams → you **can't nest teams to represent phases**, so the hierarchy stays shallow; Milestone/Phase structure lives in the lead's planning doc |
| Human gate per level | `require plan approval` + you steering the lead with criteria | **Approval is the lead's, not yours** — the native human gate becomes "instruct the lead with criteria" |
| Disjoint-file waves | Lead assigns different file sets per teammate; task-list file lock | **No worktree**: disjointness is a plan promise, not infrastructure-guaranteed |
| Model routing | Model per teammate (strong reasons, efficient executes) | Works well; lead tends to be the strong model, executors efficient |
| Mechanical = no model | `TaskCreated`/`TaskCompleted` hooks running deterministic scripts | Works, but mechanical work still tends to pass through a token-costing teammate unless you force the hook |
| Auditability (PLAN + STATE) | Shared task list + a planning doc the lead maintains | Less structured; team state is **ephemeral**, gone on cleanup |
| Triage (orchestrate only when it pays) | The decision to create a team or not | Identical in spirit; don't spin a team for sequential work |

Four of seven map cleanly (partial hierarchy, routing, mechanical, triage); **three lose something** —
human gates (become mediated), disjoint waves (lose the worktree), auditability (becomes ephemeral).
Those three are exactly what the discipline must compensate for by hand.

## Routing rule and roster

> **Put the strong model where a mistake is expensive; the lower the executor's effort, the higher the
> specification it receives.** Expensive reasoning sits at the top; well-specified volume goes to the
> cheap model; deterministic read-and-report goes lower. A non-lead Opus is the **exception**.

| Role | Model | Effort | When | Tools |
|---|---|---|---|---|
| **team-lead** | Opus | `high` (`xhigh` for hard planning) | always the lead; decomposes, assigns, approves teammate plans, escalates | coordination, Read, light Bash — **no production Write** |
| **sonnet-executor** (default) | Sonnet | `medium` | well-specified implementation, localized change, tests, technical docs | Read, Write, Edit, Bash, Grep, Glob |
| **sonnet-executor-high** | Sonnet | `high` | Sonnet-tractable but delicate: cross-module integration, contract-touching refactor | Read, Write, Edit, Bash, Grep, Glob |
| **haiku-runner** | Haiku | — (no effort knob) | run a command and report output: build, test, lint, migration, log collection | Bash, Read, Grep — **no Write/Edit** |
| **opus-fallback** (last resort) | Opus | `high`/`xhigh` | intrinsic high risk, high complexity, or recovering a task a Sonnet failed | Read, Write, Edit, Bash, Grep, Glob |

The lead is the running session — **Opus at team creation** (fixed for the team's life; prior chat
model irrelevant). No teammate gets a spawn tool (Teams doesn't nest). **Keep 3–5 teammates active** —
token cost grows with each one and coordination overhead/conflict risk climbs past that; the
`haiku-runner` is cheap but is still a session. The four teammate roles ship in `assets/roster/`;
reference them by `Agent` `subagent_type`. The default is **Sonnet `medium`**
precisely *because it receives the most detail*: low reasoning budget, so the task arrives so specified
that little is left to decide — low effort and high spec are two faces of one choice.

## Complexity ladder → routing

Lead classifies each task, places it on the **lowest rung that solves it**; moving up is an explicit,
logged decision.

1. **Run & report** (build, test, lint, migration, log) → `haiku-runner`.
2. **Well-specified implementation** (the majority) → `sonnet-executor` (`medium`).
3. **Tractable but delicate** (integration, contract refactor) → `sonnet-executor-high`.
4. **High risk / high complexity** → `opus-fallback` directly (skip Sonnet on purpose).

Rung-1 boundary: if a command is fully predetermined **and nobody reads the output**, it's cheaper as
a **hook/script** than a Haiku teammate (a teammate carries fixed context cost). The `haiku-runner`
earns its place only on "run **and** tell me what happened".

## Task contract — "maximum detail"

Because `sonnet-executor` runs at `medium`, the task must arrive almost unambiguous. Each carries:

- **Objective** in one sentence: what exists at the end.
- **Exact files** to touch — **disjoint** from every other task in the same wave (no worktree, so this
  is what prevents overwrite).
- **Inputs & outputs**: contracts, types, formats.
- **Verifiable acceptance criteria** (what the `haiku-runner`/verifier checks).
- **Constraints and what NOT to touch** (explicit negative delimitation).
- **Examples** or a reference to an existing codebase pattern.
- **Expected return**: the condensed, standardized report you want back (verdict + `file:line` +
  evidence — workers return ~1-2k-token summaries, not raw dumps, to preserve the lead's context).
- **On-conflict**: what to do if this teammate's result diverges from a peer's — escalate the
  disagreement to the lead, don't silently pick a side.

Rule: if the lead can't write this, the task isn't ready for a Sonnet `medium` — bump to
`sonnet-executor-high` or send back to decomposition.

"Maximum detail" means **right altitude, not brittleness**: give the smallest high-signal spec that
removes ambiguity and decisions — exact files, contracts, acceptance criteria — not hardcoded
step-by-step logic that boxes in the executor. Detail away the *what* and the *boundaries*; leave the
*how* to the model.

## Disjoint-file waves

Only parallelize tasks whose file sets **don't intersect**. Same-file tasks are **sequenced**. Without
worktree isolation, disjointness is the lead's promise, backed by the task list's file lock — the
single biggest preventer of paying execution tokens twice and of avoidable merge rounds.

## Escalation rule (Sonnet → Opus)

1. A `sonnet-executor`/`-high` delivers the task.
2. The verifier (or `haiku-runner` running the acceptance criteria) **rejects** it.
3. The lead returns it **once**, with the reason, for the same Sonnet to retry.
4. Rejected a second time → the lead **escalates** the task to `opus-fallback`, passing the history of
   both attempts and the errors.

Per task, last resort, **logged** (task, attempts, why it rose). Keeps "go to Opus" from becoming the
easy path that detonates the budget, and preserves the discipline's auditability.

## Auditability — the PLAN doc

Team state is ephemeral; there is no durable STATE.md by construction, and it dies on cleanup. Keep a
versioned planning doc (e.g. `PLAN.md`) recording, per task: owner, model+effort, wave, dependencies,
files, and escalation history. This is structured note-taking that compensates for the substrate's
ephemerality — the auditability GSD wants but Teams doesn't give for free.

## Routing-killer and effort notes

- **Never set `CLAUDE_CODE_SUBAGENT_MODEL`.** It overrides the model of *every* subagent and teammate,
  ignoring each definition's frontmatter — flattening this whole roster to one model. Leave it unset
  (or `inherit`).
- **Effort is per model.** `medium`/`high` for Sonnet, `high`/`xhigh` for Opus; Haiku ignores effort.
  Unsupported levels fall back to the highest supported. Effort in a teammate definition's frontmatter
  is honored by Teams per this roster; if your Claude Code version ignores it, state the intended
  effort in the spawn prompt instead.

## When the discipline pays — and when it's dead weight

Run the full discipline (roster + waves + gates + escalation) **only when all hold**: interdependent
code, an expensive plan mistake, a decomposition knowable up front, and cleanly partitionable files.
Then cheap gates + disjoint waves + routing + mechanical-in-hook cut rework and tokens enough to pay
the ceremony.

Drop it — let the raw team self-organize — when the decomposition is **exploratory and emerges on the
way** (debug hypotheses, cross-layer negotiation, research), the task is small enough that fixed
overhead doesn't amortize, or the value is in **agents talking to each other** more than executing a
fixed plan. Forcing waves there fixes too early what should emerge.

Corollary: the biggest fragility of GSD-over-Teams is the lost worktree. When you need the discipline
but **not** direct agent-to-agent chat, **subagents with worktree isolation** are the more coherent
substrate — they keep file disjointness by infrastructure. Reach for a team when you need both the
discipline *and* the mailbox.
