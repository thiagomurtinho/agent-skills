# pr-text — skeleton (fill, don't ship verbatim)

```markdown
[Claudinho]

## O que muda
- <bullet 1: o que o reviewer ganha, linguagem simples>
- <bullet 2>

## Por quê
<motivação curta>. Closes #<N>.

## Detalhe técnico
- `path/file.ts:linha` — <decisão / o que mudou>
- <trade-off ou nota não óbvia do diff>

## Como testar
- `<comando de teste>` — <resultado real / CI status>
- <passo manual, se houver>

## DoD
- [ ] <item verificável espelhado da issue>
```

Rules: first line `[Claudinho]`. Título = conventional-commit + valor. Após criar, assignees (user + anthropic-code-agent). Nunca alegar CI/teste verde não observado.
