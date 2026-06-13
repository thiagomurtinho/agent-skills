# Spawn-prompt patterns

Load before writing your first spawn prompt. A teammate gets project context (CLAUDE.md, MCP,
skills) but **not the leader's conversation history** — everything it needs to act must be in the
prompt. Each example below is self-contained and ends with the charter block (`assets/teammate-charter.md`).
Match this density; don't ship one-line briefs.

The pattern in every case:
> **Role + exact targets (paths) + the constraint/context it can't infer + the concrete deliverable
> + the bar for "done" + the charter.**

---

## Security reviewer (review, parallel-lens)

> Name: `sec`. Review the authentication module at `src/auth/` for security vulnerabilities. Focus
> on token handling, session management, and input validation. Context the codebase won't tell you:
> the app uses JWT tokens stored in httpOnly cookies, and `src/auth/legacy/` is deprecated — skip it.
> Deliverable: a findings list, each with a severity rating (critical/high/medium/low), the exact
> `file:line`, and a one-line fix. Done = every auth entry point under `src/auth/` examined and
> reported. Do not edit code; this is review only.
>
> [charter block]

## Competing-hypothesis investigator (debug, adversarial)

> Name: `hypo-2`. Bug: users report the app exits after one message instead of staying connected.
> Your hypothesis to test: the connection drops because the websocket heartbeat in
> `src/net/socket.ts` isn't reset on inbound messages. Investigate **only** this theory, prove or
> disprove it with evidence (logs, code paths, a repro). Then actively try to **disprove** the other
> investigators' theories via `SendMessage` — treat this as a scientific debate, not a handoff.
> Deliverable: append your verdict (confirmed / refuted + evidence) to `docs/debug-findings.md`.
> Done = your theory has a clear evidence-backed verdict and you've challenged at least one peer's.
>
> [charter block]

## Module builder (new feature, file-partitioned)

> Name: `builder-api`. Build the REST layer for the TODO-tracker feature. You own **only**
> `src/api/todos.ts` and `src/api/todos.test.ts` — no other files (a teammate owns the storage
> layer in `src/store/`). Contract: expose `listTodos`, `createTodo`, `completeTodo`; persist via
> the `TodoStore` interface in `src/store/types.ts` (already defined — import, don't redefine).
> Deliverable: the two files, with tests passing (`npm test src/api/todos.test.ts`). Done = all
> three endpoints implemented against `TodoStore` and tests green. If `TodoStore` is missing a
> method you need, `SendMessage` the storage owner — do not edit `src/store/`.
>
> [charter block]

## Test-coverage validator (review, gate)

> Name: `cov`. Validate test coverage for PR #142 (changed files: `src/api/todos.ts`,
> `src/store/sqlite.ts`). For each changed function, check there's a test exercising it including
> the error path. Deliverable: a table of `function → covered? → gap` and a list of concrete missing
> test cases. Done = every changed function assessed. Don't write the tests; report the gaps so the
> builder can.
>
> [charter block]

---

## Plan-approval variant

For risky/destructive work, prepend: *"Work in read-only plan mode. Produce a plan and submit it
for approval before making any changes. I will only approve plans that include test coverage and do
not modify the database schema."* The teammate stays read-only until the leader approves; on
rejection it revises against the feedback and resubmits.
