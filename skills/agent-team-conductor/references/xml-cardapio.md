# xml-like prompt cardápio — shaping a member's `<task>`

Load when writing a recruited member's prompt. A member doesn't inherit your conversation, so its
`<task>` must be self-contained. Below: the tag menu (which tag for what), the base skeleton, the
golden rules, and one worked example per model tier. This is only about the prompt's shape.

## Tag menu — reach for a tag only when it earns its place

| tag | isolates | use when |
|---|---|---|
| `<task>` | the whole envelope | always — wraps the brief so its bounds are unambiguous |
| `<responsibility>` | the single goal | always — one sentence, what to produce; keeps scope from drifting |
| `<files>` | the work surface | always for code — the exact files to touch |
| `<constraints>` / `<must-not>` | the limits | when there are things explicitly **not** to touch (negative delimitation) |
| `<return-format>` | the output contract | always — the condensed result you want back (verdict + `file:line`) |
| `<grounding>` | the anti-fabrication rule | always — don't invent; report missing info; cite provenance |
| `<handoff>` | the minimal context transfer | **always** — see below |
| `<context>` | background, *not* instruction | when the member needs framing it can't infer (keeps "why" out of the "what") |
| `<input>` | data to process | when you paste data the member operates on (label it so it isn't read as a command) |
| `<process>` / `<step>` | an ordered sequence | only when the order genuinely matters; otherwise leave the *how* to the model |
| `<examples>` | a demonstration | when the pattern is easier shown than described (1–2, not edge cases) |

## `<handoff>` — always present, minimal and focused

The member starts with no memory of your work. `<handoff>` is the **minimal, focused** context this
task needs — the decision that led here, the file/contract references it depends on, and the expected
return. Nothing extra: it is the *minimal entry*, not a context dump. If it isn't needed for *this*
task, it doesn't go in.

## Base skeleton

```xml
<task>
  <responsibility>…</responsibility>
  <files>…</files>
  <constraints>…</constraints>
  <return-format>…</return-format>
  <grounding>don't fabricate; if info is missing, say so; cite file:line</grounding>
  <handoff>minimal focused context for this task only</handoff>
</task>
```

Golden rules: semantic tag names; keep the scheme consistent across members; avoid deep nesting; put
the primary instruction in its own tag; refer to a tag by name when you mention its content.

## Worked example — `sonnet-executor` (Sonnet · medium)

```xml
<task>
  <responsibility>Implement the REST handlers listTodos, createTodo, completeTodo.</responsibility>
  <files>src/api/todos.ts, src/api/todos.test.ts — only these.</files>
  <constraints>Do not touch src/store/ or the routing config.</constraints>
  <return-format>The two file paths + test result (npm test src/api/todos.test.ts) + any gap hit.</return-format>
  <grounding>Don't invent a store method; if TodoStore lacks one, report it. Cite file:line.</grounding>
  <handoff>Persist via the TodoStore interface in src/store/types.ts (already defined — import it). Mirror the shape of src/api/users.ts. Expected back: green tests for all three endpoints.</handoff>
</task>
```

## Worked example — `sonnet-executor-high` (Sonnet · high)

```xml
<task>
  <responsibility>Extract the shared token-validation logic into one module.</responsibility>
  <files>create src/auth/validate.ts; edit src/api/middleware.ts and src/ws/handshake.ts to call it.</files>
  <constraints>Do not change the validate(token) → {valid, claims} signature; both call sites depend on it. Don't touch token issuing.</constraints>
  <return-format>Diff summary + confirmation both call sites use the new module + npm test result.</return-format>
  <grounding>Don't fabricate behavior; if the two call sites need different handling, report it rather than forking the contract.</grounding>
  <handoff>Both src/api/ and src/ws/ duplicate the same JWT check today; the goal is one source of truth with identical accept/reject behavior. Expected back: tests green, no behavior change.</handoff>
</task>
```

## Worked example — `haiku-runner` (Haiku)

```xml
<task>
  <responsibility>Run the checks and report the result.</responsibility>
  <constraints>Run only; do not edit any file or attempt a fix (no Write tools).</constraints>
  <return-format>Per command pass/fail; for failures, the failing test names and the exact error lines, quoted.</return-format>
  <grounding>Report only what the commands produced; if one fails to run, report that verbatim.</grounding>
  <handoff>Commands: npm run build, npm test, npm run lint. Expected back: a concise pass/fail per command with the failing lines.</handoff>
</task>
```
