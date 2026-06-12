# Caveman compression for handoff docs

Adapted from caveman skill (JuliusBrussee/caveman). Target: ~50-65% char reduction on prose, 0% loss on anchors.

## Drop list
- Articles: a, an, the (o, a, os, as, um, uma in PT)
- Filler: just, really, basically, actually, simply, in order to, it's important to note
- Hedging: probably, might want to, I think, it seems
- Pleasantries + meta: "this section describes", "as mentioned above"
- Narrative connectors: then we, after that, next we tried
- Redundant subjects when context carries them

## Transform list
- Causality → arrows: "because X happened, Y broke" → `X → Y broke`
- Verbose verb phrases → short verbs: "implement a solution for" → fix; "perform an investigation of" → check
- Common abbreviations in prose: DB, auth, config, fn, impl, env, msg, repo, prod
- Lists of full sentences → fragments, one fact per line

## Byte-exact list (NEVER touch)
- Paths: `src/consumers/essayConsumer.ts`
- Symbols: `processBatch()`, `ReportBatchItemFailures`
- Commands + flags: `bun test --filter e2e`
- Error signatures: `MessageNotInflight`
- URLs, env var names, branch names, versions
- Code blocks

Verification after compress: grep every backtick token from original → must exist identical in output.

## Auto-clarity overrides (full sentences mandatory)
1. Decision entries (D/Why/Consequence)
2. "Retry only if" conditions
3. Irreversible actions (migrations, deletes, deploys)
4. Anything where fragment has 2 readings

Why: misread decision in fresh session costs hours; full sentence costs ~15 tokens. Trade always favors clarity here.

## Before / after pairs

Verbose:
> We investigated the authentication flow and discovered that the issue was being caused by the middleware not properly validating the token expiry. After several attempts, we decided to fix the comparison operator.

Caveman:
> Auth middleware: token expiry check uses `<`, needs `<=`. Fix decided.

(31 words → 12 words, anchor `<=` exact)

Verbose:
> The next step is to run the test suite in order to verify that the changes we made to the consumer are working as expected.

Caveman:
> Run `bun test test/e2e/` → expect green.

Verbose (decision — DO NOT compress to fragments):
> Drizzle migration manual, not introspection. Custom naming → unstable diffs.

Correct (auto-clarity):
> D: Generate Drizzle migrations manually, not via introspection. Why: existing schema has custom naming and introspection produced unstable diffs. Consequence: every new migration must be reviewed by hand before applying.

## Language note
Caveman compresses style, not language. PT-BR handoff → PT-BR caveman fine ("Novo ref por render → re-render. Envolver com `useMemo`."). English still ~10-20% cheaper in tokens; recommend EN for handoff body, user's call.
