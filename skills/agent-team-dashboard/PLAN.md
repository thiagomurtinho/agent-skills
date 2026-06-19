# PLAN — agent-team-dashboard (skill)

> Handoff / plano de implementação. Estilo runbook: lê frio, executa direto.
> **Origem:** construído ao vivo orquestrando o time `dli-absorcao` (refactor DLI do research-harvester, 2026-06-13). Provou-se útil → virar skill reutilizável.

---

## 0. TL;DR (o que é)

Dashboard **live** (auto-refresh) que lê os logs de um **agent team** do Claude Code e mostra, num HTML bonito (dark/light, glassmorphism):
- anel de progresso + barras por fase
- quadro de tarefas em **grade** (por fase) **ou kanban** (por status)
- cards dos agentes (cor própria, estado trabalhando/ocioso/concluído, tarefa atual)
- feed de **conversas** entre agentes (bolhas coloridas, filtro, expandir)
- timeline de commits do repo

Server Node **zero-dependência** lê os arquivos do harness e serve `/api/state`; a página faz poll.

**Estado atual:** funciona, parametrizado por `TEAM`. Cópia em `assets/server.js` + `assets/index.html`. Falta generalizar (ver §3) pra virar plug-and-play em qualquer team.

---

## 1. Fontes de dado (o que o harness expõe)

Tudo em `~/.claude/`:

| Dado | Caminho | Formato |
|---|---|---|
| Tarefas | `tasks/<TEAM>/<n>.json` | `{id, subject, description, owner, status, blocks[], blockedBy[]}` |
| Conversas | `teams/<TEAM>/inboxes/<agente>.json` | array `{from, text, summary, timestamp, color, type, read}` — **só msgs pendentes/não-lidas** (não é arquivo completo) |
| Membros | `teams/<TEAM>/config.json` | `{members:[{name, agentId, agentType}]}` |
| Commits | `git log` no `REPO` | derivado |

**Gotcha das conversas:** as `inboxes/` guardam só o que ainda não foi lido — histórico parcial. Pra histórico COMPLETO seria preciso parsear os transcripts `projects/<...>/<session>/subagents/agent-*.jsonl` (verbosos; cada SendMessage vira evento). Não feito; é o upgrade de §3.5.

---

## 2. Como roda hoje

```bash
TEAM=<nome-do-team> REPO=<path-do-repo> PORT=4317 node assets/server.js
# abre http://localhost:4317   ·   Ctrl+C para parar
```

- `server.js`: HTTP puro. `GET /api/state` → JSON lido FRESCO a cada request (= live). Qualquer outra rota → serve `index.html`.
- `index.html`: vanilla JS, poll a cada N seg (2/4/8 toggle), re-render. Tema e view persistem em `localStorage`.

**Defaults atuais (hardcoded, trocar na generalização):** `TEAM='dli-absorcao'`, `REPO='/Volumes/Shared HD/Source/ai-tools/research-harvester'`, `PORT=4317`.

---

## 3. Plano de generalização (pra virar skill de qualquer team)

Checklist. Cada item é pequeno e isolado.

### 3.1 Cores automáticas por agente  ⬅ maior ganho
- HOJE: `const COLORS={'core-dev':'#4a9eff',...}` fixo nos 5 nomes deste time → outro time sai cinza.
- FIX: gerar cor do nome via hash → paleta fixa (8-10 cores boas). Determinístico (mesmo nome = mesma cor sempre).
- Onde: `index.html`, função `colorFor()`. Manter um override opcional pra nomes conhecidos.

### 3.2 Fase opcional (fallback elegante)
- HOJE: grade agrupa por regex `F(\d)` no subject (convenção deste projeto). Sem isso → tudo cai em "Fase ?".
- FIX: se nenhum task casar `F\d`, esconder a grade-por-fase e default pra **kanban** (que é agnóstico). Barras de fase viram "sem fases" ou somem.

### 3.3 Auto-detect do team
- A skill deve descobrir o team ativo: listar `~/.claude/teams/*/` (excluir os sem `inboxes/`). Se 1 → usa. Se vários → pergunta ao usuário. Passar via `TEAM`.
- REPO: default = cwd da sessão (onde o time trabalha).

### 3.4 Port handling + launch helper
- `assets/launch.sh`: acha porta livre (tenta 4317, incrementa), sobe o server em background, `open` no browser, imprime URL + PID + "kill <PID> pra parar".
- Tratar "porta ocupada" e "Node ausente".

### 3.5 (opcional) Conversas completas via transcripts
- Ler `subagents/agent-*.jsonl` e extrair eventos de mensagem → feed com histórico inteiro, não só inbox pendente.
- Custo: parse de JSONL grande + mapear agentId↔nome (via config.json). Fazer só se o feed parcial incomodar.

---

## 4. Estrutura-alvo da skill

```
agent-team-dashboard/
├── SKILL.md            # frontmatter (name, description, when-to-use) + runbook curto
├── PLAN.md             # este arquivo
└── assets/
    ├── server.js       # generalizado (§3.1-3.3)
    ├── index.html      # generalizado (§3.1-3.2)
    └── launch.sh       # §3.4
```

### SKILL.md — frontmatter sugerido
```yaml
---
name: agent-team-dashboard
description: >
  Sobe um dashboard web live (auto-refresh) pra acompanhar um agent team do
  Claude Code — progresso, quadro de tarefas (grade/kanban), agentes e conversas.
  Use quando estiver orquestrando um team (spawnar teammates com Agent/SendMessage) e quiser
  ver o andamento visualmente em vez de ler idle-notifications no chat.
---
```

### SKILL.md — corpo (runbook)
1. Detectar team ativo (§3.3). 2. `bash assets/launch.sh [TEAM] [REPO]`. 3. Devolver a URL ao usuário. 4. Lembrar como parar. 5. Nota: snapshot de conversas = inbox pendente (ver §3.5 pra histórico completo).

---

## 5. Gatilhos (quando a skill dispara)

- usuário diz "acompanhar o time", "dashboard do team", "ver progresso dos agentes", "watch the team"
- logo após spawnar os teammates quando o trabalho vai ser longo
- usuário pede visão visual em vez do chat

NÃO disparar pra: tarefa single-agent, ou quando não há team ativo.

---

## 6. Decisões já tomadas (não rediscutir)

- **Live > snapshot**: server local + poll, não HTML estático com dados embutidos. (file:// não lê disco; o usuário quis auto-refresh.)
- **Zero deps**: Node stdlib só (http/fs/child_process). Nada de npm install.
- **Cores do time** = identidade visual central — por isso §3.1 é prioridade.
- **Inbox como fonte de conversa** = pragmático e suficiente pra "o que está rolando agora"; transcript completo é opt-in.
- **Fora do repo de trabalho**: o dashboard mora na pasta da skill, nunca commitado no repo que o time está editando.

---

## 7. Próximos passos (ordem)

1. [x] §3.1 cores automáticas (hash determinístico + override conhecidos)
2. [ ] §3.2 fase opcional → default kanban (index.html)
3. [x] §3.3 auto-detect team (server.js detectTeam, REPO=cwd)
4. [x] §3.4 launch.sh (porta livre, background, open, PID, LAN IP)
5. [x] escrever SKILL.md (frontmatter + runbook + caminho preview/navegador)
6. [ ] testar contra um team diferente do dli-absorcao (validação real da generalização)
7. [x] §3.5 conversas completas via jsonl — seed dos transcripts no boot (identidade via briefing "Você é `nome`", orchestrator=team-lead) + acumulação do inbox ao vivo em `$TMPDIR/agent-team-dashboard-feed-<team>.json`
8. [x] paleta Claude desktop (dark `#262624` / light `#FAF9F5`, accent terracotta `#C15F3C`); tema segue system
9. [x] responsivo (980/760/460) + mobile order (quadro antes de commits)
10. [x] feed limita às últimas 100 (contador mostra total) + ícone `i` com tooltip de limites
11. [x] LAN: server escuta `0.0.0.0` (localhost + IP da Wi-Fi simultâneo)

**DoD:** `bash launch.sh` num team qualquer → dashboard colorido, kanban funcional, sem editar código.

---

## 8. Backlog (não implementado — salvar pra depois)

### 8.1 Acesso remoto via Cloudflare Quick Tunnel (fora da LAN / 5G)
URL HTTPS pública temporária sem DNS/porta. App segue ouvindo em localhost; `cloudflared` faz o egress.
```bash
brew install cloudflared
cloudflared tunnel --url http://localhost:4321   # → https://random-words.trycloudflare.com
```
- URL muda a cada restart. **Pública** → qualquer um com o link acessa. Não expor sem auth.
- Túnel persistente (domínio fixo): `cloudflared tunnel login/create/route dns` + `~/.cloudflared/config.yml` (ingress → `http://localhost:4321`).
- Possível atalho: flag `--tunnel` no `launch.sh` que sobe o quick tunnel junto. Avaliar guard de segurança (o dashboard é read-only, mas mostra conteúdo interno do time).
