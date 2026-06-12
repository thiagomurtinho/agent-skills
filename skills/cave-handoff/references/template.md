# HANDOFF.md template

6 sections. ≤120 lines total. English recommended (cheaper tokens) — but keep user's language if they wrote in it.

```md
# Handoff: <task-name>
status: planning|implementing|debugging|testing|review
updated: YYYY-MM-DD

## Mission
<1-3 lines. What done looks like. Definition of done as checklist if non-obvious.>

## State
Done:
- <fact>
Not done:
- <fact>

## Decisions
<!-- FULL SENTENCES. Survives compression untouched. -->
- D: <decision>. Why: <reason>. Consequence: <what next session must respect>.

## Files
Read first:
- `path` — <why, key symbols>
Touch only:
- `path` — <change made / planned>
Do not touch:
- `path` — <reason>

## Fail
<!-- "retry only if" in FULL SENTENCES -->
- Tried: <what>. Got: `<exact error signature>`. Retry only if: <condition>.

## Next
1. <action> → verify: `<command>` → expect: <result>
2. ...
```

Rules:
- `## Next` items always carry verify command + expected result. Action without success criterion = vague = useless to fresh session.
- No git state section. collect.sh derives live.
- Decisions that outlive the task → move to ADR/CLAUDE.md at task end, not here.

## Filled example (caveman register)

```md
# Handoff: essay-correction async pipeline
status: debugging
updated: 2026-06-12

## Mission
SQS consumer processes essay batch → stores correction in `at-irt` DB. Done = e2e test green + no msg loss on consumer crash.

## State
Done:
- producer + queue infra (CDK)
- consumer skeleton, idempotency key on `essay_id`
Not done:
- DLQ redrive
- partial batch failure handling

## Decisions
- D: Use `ReportBatchItemFailures`, not manual delete. Why: manual delete swallowed errors during spike test. Consequence: handler must return `batchItemFailures` array; never throw for single-item errors.

## Files
Read first:
- `src/consumers/essayConsumer.ts` — handler, `processBatch()`
- `test/e2e/essayPipeline.spec.ts` — failing test, scenario "crash mid-batch"
Touch only:
- `src/consumers/essayConsumer.ts`
Do not touch:
- `infra/queue.ts` — infra approved in review, redeploy expensive

## Fail
- Tried: visibility timeout 30s. Got: `MessageNotInflight` on retry path. Retry only if: timeout raised to ≥ 2x max processing time and heartbeat extension implemented.

## Next
1. Implement `batchItemFailures` return → verify: `bun test test/e2e/essayPipeline.spec.ts` → expect: "crash mid-batch" green
2. Add DLQ redrive doc note → verify: validate.py exit 0
```
