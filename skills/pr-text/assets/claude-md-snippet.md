## PR descriptions

Always use the `pr-text` skill before writing any pull-request body (`gh pr create` / `gh pr edit --body`).
Body order: `[Claudinho]` → `## O que muda` → `## Por quê` (Closes #N) → `## Detalhe técnico` (path:linha) →
`## Como testar` → optional `## DoD`. Title = conventional-commit prefix + product value. Derive diff facts
via `scripts/collect-pr.sh` — never fabricate file lists or test results. Assignees on PRs only.
