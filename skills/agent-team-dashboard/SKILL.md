---
name: agent-team-dashboard
description: >
  Sobe um dashboard web live (auto-refresh) para acompanhar um agent team do Claude Code —
  anel de progresso, quadro de tarefas (grade por fase ou kanban por status), cards dos
  agentes e feed de conversas entre eles. Use quando estiver orquestrando um team (após
  TeamCreate/Agent/SendMessage) e o trabalho for longo, ou quando o usuário pedir para
  "acompanhar o time", "ver o progresso dos agentes", "dashboard do team" ou quiser visão
  visual em vez de ler idle-notifications no chat. Roda local, abre o navegador sozinho.
license: Proprietary
metadata:
  author: thiago
  version: "1.0.0"
---

# Agent Team Dashboard

Sobe um servidor Node local (zero deps) que lê os logs do harness em `~/.claude/` e serve uma página live; o navegador abre sozinho. Output: uma URL `http://localhost:<porta>` que faz auto-refresh enquanto o time trabalha.

Stance: o valor é ver o andamento **enquanto** roda. Por isso é server + poll, não HTML estático — e por isso é opt-in: pergunta antes, pra não roubar o foco de quem prefere o chat.

<workflow>
1. Ofereça (não imponha). Após criar/disparar um team para trabalho longo, pergunte com AskUserQuestion se o usuário quer abrir o dashboard. Só siga se aceitar.
2. Detecte o team. Considere ativos os diretórios em `~/.claude/teams/*/` que têm subpasta `inboxes/`. Um só → use; vários → pergunte qual. O `server.js` auto-detecta quando `TEAM` não é passado; passe explícito só pra desambiguar.
3. Escolha o destino pelo ambiente. No Claude desktop (existe a ferramenta `preview_start`) pergunte "no preview do app ou no navegador?". No CLI/terminal use navegador direto, sem perguntar.
4. Suba o server pelo caminho do destino — navegador (4a) ou preview (4b).
5. Reporte o acesso no chat (passo 5). Sempre mostre as duas URLs e o PID, e avise que o painel é somente leitura.
</workflow>

<navegador>
Caminho 4a. Rode o helper a partir do repo onde o time trabalha. Acha porta livre (a partir de 4317), sobe o server em background, abre o navegador e imprime `URL`/`PID`. `REPO` default = dir atual (usado só pra timeline de commits).

```bash
bash skills/agent-team-dashboard/assets/launch.sh [TEAM] [REPO]
```
</navegador>

<preview>
Caminho 4b. O preview do Claude desktop abre HTML como `file://` num sandbox que bloqueia `fetch` a `localhost` (resultaria em "servidor offline"). Por isso NÃO use `launch.sh` aqui — sirva pelo próprio sistema de preview, que carrega `http://localhost:<port>/` same-origin. Garanta o `.claude/launch.json` abaixo e rode a ferramenta `preview_start` (name `agent-team-dashboard`), nunca via Bash.

```json
{
  "version": "0.0.1",
  "configurations": [{
    "name": "agent-team-dashboard",
    "runtimeExecutable": "bash",
    "runtimeArgs": ["-c", "TEAM=<team> REPO='<repo>' PORT=4321 node skills/agent-team-dashboard/assets/server.js"],
    "port": 4321
  }]
}
```
</preview>

<reporting>
Passo 5. Sempre devolva no chat, copiáveis:

- Local: `http://localhost:<port>`
- LAN (mesma Wi-Fi, iPhone/iPad): `http://<IP>:<port>` — IP via `ipconfig getifaddr en0`

O `launch.sh` (4a) já imprime as duas + o `PID` (parar com `kill <PID>`); no preview (4b) monte a URL LAN com o IP. Diga explicitamente que o painel é somente leitura (espelha os logs, não edita nada).
</reporting>

<gotchas>
- **Painel é SOMENTE LEITURA — não é editor da skill.** O dashboard espelha os logs do team; não altera tasks, mensagens nem arquivos. O lápis ✏️ da toolbar do preview do Claude desktop edita só o DOM em memória — some no reload e NÃO mexe na skill. Para mudar o dashboard de verdade, edite os arquivos (`assets/index.html`, `server.js`), nunca pelo preview. O chip "👁 somente leitura" no header sinaliza isso ao usuário.
- **Conversas: feed acumulado, exibe só as últimas 100.** Os `inboxes/<agente>.json` guardam só mensagens não-lidas (drenam quando os agentes leem). O server contorna isso: no boot faz seed dos transcripts do team (`~/.claude/projects/<repo>/**/*.jsonl`, identidade via briefing "Você é `nome`"; orchestrator multi-destinatário = team-lead) e acumula o inbox ao vivo num store em `$TMPDIR`. O feed mostra as últimas 100; o contador no header mostra o total (ícone `i` explica). Mensagens drenadas antes do server subir e fora dos transcripts não são recuperáveis.
- **LAN:** o server escuta em `0.0.0.0` → acessível por `localhost` E pelo IP da Wi-Fi (iPhone/iPad na mesma rede, ver URL no `launch.sh`). Se não abrir: firewall do macOS / VPN / isolamento de rede de convidados. Acesso remoto fora da LAN = backlog (Cloudflare tunnel, PLAN §8.1).
- **Mora na pasta da skill, nunca no repo do time.** Não copie `server.js`/`index.html` para dentro do projeto que os agentes estão editando — rode daqui apontando `REPO` pra lá.
- **`REPO` é só pra commits.** Tarefas, agentes e conversas vêm de `~/.claude/`, independentes do `REPO`. Se a timeline de commits vier vazia, o `REPO` está errado — não o team.
- **Porta ocupada / Node ausente** o `launch.sh` já trata: incrementa a porta e falha com mensagem clara se faltar Node 18+.
- **Sem fase no subject** (convenção `F\d`) a grade-por-fase agrupa tudo em "Fase ?"; nesse caso prefira a view **kanban** (agnóstica a fase).
</gotchas>

## Fontes de dado (referência)

Tudo sob `~/.claude/`:

| Dado | Caminho | Formato |
|---|---|---|
| Tarefas | `tasks/<TEAM>/<n>.json` | `{id, subject, description, owner, status, blocks[], blockedBy[]}` |
| Conversas | `teams/<TEAM>/inboxes/<agente>.json` | array `{from, text, summary, timestamp, ...}` — só pendentes |
| Membros | `teams/<TEAM>/config.json` | `{members:[{name, agentId, agentType}]}` |
| Commits | `git log` no `REPO` | derivado |

## Arquivos

- `assets/launch.sh` — entrypoint: porta livre + server background + abre browser + PID.
- `assets/server.js` — HTTP puro (Node stdlib). `GET /api/state` → JSON lido fresco a cada request; qualquer outra rota serve `index.html`.
- `assets/index.html` — UI vanilla JS, poll 2/4/8s, tema dark/light, grade/kanban. Cores por agente: nomes conhecidos fixos, demais via hash determinístico.
- `PLAN.md` — histórico de design e upgrades opcionais (ex.: §3.5 conversas completas via jsonl).
