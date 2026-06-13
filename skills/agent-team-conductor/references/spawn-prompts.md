# Spawn-prompt patterns

Load before writing your first spawn prompt. A teammate gets project context (CLAUDE.md, MCP, skills)
but **not the leader's conversation history** — everything it needs must be in the prompt. Each
example below is a self-contained **maximum-detail contract** (see `references/gsd-over-teams.md`),
spawned with the matching roster role via `Agent` `subagent_type`, and ends with the charter block
(`assets/teammate-charter.md`).

The contract every Sonnet/Opus task carries:
> **Role + exact disjoint files + inputs/outputs + verifiable acceptance criteria + what NOT to touch +
> example/pattern + expected return + on-conflict + the charter.**

Route each to the lowest roster rung that solves it (`gsd-over-teams.md` ladder). Run-and-report → a
`haiku-runner` or a hook, not a reasoning model.

---

## sonnet-executor — module builder (default rung, file-partitioned)

`subagent_type: sonnet-executor`. Name: `builder-api`.

> Build the REST layer for the TODO-tracker feature. **Files (yours only):** `src/api/todos.ts`,
> `src/api/todos.test.ts` — a teammate owns `src/store/`, do not touch it. **Inputs/outputs:** expose
> `listTodos`, `createTodo`, `completeTodo`; persist via the `TodoStore` interface in
> `src/store/types.ts` (already defined — import, don't redefine). **Acceptance:**
> `npm test src/api/todos.test.ts` green, all three endpoints implemented against `TodoStore`.
> **Do NOT touch** `src/store/`, routing config, or auth. **Pattern:** mirror `src/api/users.ts`.
> **Expected return:** the two file paths + test result summary + any `TodoStore` gap you hit.
> **On-conflict:** if `TodoStore` lacks a method you need, `SendMessage` the storage owner and the
> lead — do not edit `src/store/` to add it yourself.
>
> [charter block]

## sonnet-executor-high — contract-touching refactor (delicate rung)

`subagent_type: sonnet-executor-high`. Name: `refactor-auth`.

> Extract the token-validation logic shared by `src/api/` and `src/ws/` into one module.
> **Files (yours only):** create `src/auth/validate.ts`; edit `src/api/middleware.ts` and
> `src/ws/handshake.ts` to call it. **Inputs/outputs:** preserve the existing `validate(token) →
> {valid, claims}` contract — both call sites depend on it; do not change the signature. **Acceptance:**
> `npm test` green; no behavior change (same tokens accepted/rejected). **Do NOT touch** the token
> *issuing* code or cookie config. **Expected return:** the diff summary + confirmation both call sites
> use the new module. **On-conflict:** if the two call sites need different behavior, stop and
> `SendMessage` the lead — don't fork the contract silently.
>
> [charter block]

## haiku-runner — run & report (lowest rung)

`subagent_type: haiku-runner`. Name: `ci`.

> Run the acceptance checks for the current wave and report. **Commands:** `npm run build`,
> `npm test`, `npm run lint`. **Return:** for each, pass/fail; for failures, the failing test names and
> the exact error lines (quote them). Summarize long output. **Do not** edit any file or try to fix
> anything — you have no Write tools; just run and report.
>
> [charter block]

> Note: if these commands were fully fixed and nobody needed to read the result, a `command` hook would
> be cheaper than this teammate. The `haiku-runner` earns its place because the lead reads the report to
> decide escalation.

## opus-fallback — failure escalation (last resort)

`subagent_type: opus-fallback`. Name: `recover-1`. Spawn **only** after a Sonnet failed the same task
twice.

> Recover task #7 (websocket reconnect), which `builder-ws` (sonnet-executor) failed twice. **Prior
> attempts + rejections:** attempt 1 — reconnect loop never backed off, test `ws.reconnect.backoff`
> timed out; attempt 2 — added backoff but dropped queued messages, test `ws.reconnect.queue` failed.
> **Files (yours only):** `src/ws/reconnect.ts`, `src/ws/reconnect.test.ts`. **Acceptance:** both named
> tests green plus the full `src/ws/` suite. **Do NOT touch** the transport layer. Diagnose the root
> cause from the two failures before re-implementing — do not repeat either approach. **Expected
> return:** root-cause one-liner + the fix + test result. **On-conflict:** none expected; if the
> transport contract is the real problem, escalate to the lead rather than changing it.
>
> [charter block]

## security reviewer (review, parallel-lens — read-only)

`subagent_type: sonnet-executor-high` (or a `security-reviewer` definition). Name: `sec`.

> Review the authentication module at `src/auth/` for security vulnerabilities. **Focus:** token
> handling, session management, input validation. **Context:** the app uses JWT in httpOnly cookies;
> `src/auth/legacy/` is deprecated — skip it. **Acceptance/return:** a findings list, each with severity
> (critical/high/medium/low), exact `file:line`, and a one-line fix — condensed, not a code dump. **Do
> NOT** edit code; this is review only. **On-conflict:** if your read of a flow contradicts another
> reviewer's, surface both to the lead.
>
> [charter block]

---

## Plan-approval variant

For risky/destructive work, prepend: *"Work in read-only plan mode. Produce a plan and submit it for
approval before making any changes. I will only approve plans that include test coverage and do not
modify the database schema."* The teammate stays read-only until the lead approves; on rejection it
revises against the feedback and resubmits. Give the **lead** the approval criteria too — on Teams the
lead approves autonomously, so the gate is only as strong as the criteria you hand it.
