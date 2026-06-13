# Cardápio de Técnicas de Prompting do Ecossistema Claude

> **Onde colocar cada instrução, regra, comportamento ou workflow.**
> Catálogo prático de superfícies + técnicas, com templates XML-like, matriz de decisão e árvore de roteamento.
>
> **Data de verificação:** 13 de junho de 2026.
> **Fontes:** documentação oficial Anthropic (`code.claude.com/docs`, `docs.claude.com`, `support.claude.com`). Itens não confirmados na doc oficial estão marcados como `[NÃO CONFIRMADO]`.

---

## Sumário

1. [Resumo executivo](#1-resumo-executivo)
2. [Glossário](#2-glossário)
3. [Mapa das superfícies](#3-mapa-das-superfícies)
4. [Catálogo de técnicas](#4-catálogo-de-técnicas)
5. [Matriz de decisão](#5-matriz-de-decisão)
6. [Árvore de decisão](#6-árvore-de-decisão)
7. [Templates XML-like](#7-templates-xml-like)
8. [Exemplos comparativos](#8-exemplos-comparativos)
9. [Anti-patterns](#9-anti-patterns)
10. [Recomendações](#10-recomendações)
11. [Referências oficiais](#11-referências-oficiais)
12. [Checklist de revisão](#12-checklist-de-revisão)
- **Apêndice A** — [Catálogo de técnicas com forma XML-like e rationale](#apêndice-a--catálogo-de-técnicas-com-forma-xml-like-e-rationale)
- **Apêndice B** — [Por que cada tag XML-like nos templates](#apêndice-b--por-que-cada-tag-xml-like-nos-templates)
- **Apêndice C** — [Caso de uso → técnicas aplicáveis](#apêndice-c--caso-de-uso--técnicas-aplicáveis)
- **Apêndice D** — [Matriz: técnica × superfície (onde mora melhor)](#apêndice-d--matriz-técnica--superfície-onde-mora-melhor)

---

## 1. Resumo executivo

O ecossistema Claude oferece **três produtos distintos** — **Claude.ai** (chat web/desktop/mobile + Projects), **Claude Code** (agente de terminal/IDE/web/desktop) e **Claude API / Agent SDK** (programático). Cada um tem superfícies próprias onde uma instrução pode "morar". A pergunta central — *"tenho uma instrução: onde coloco?"* — não tem resposta única; depende de **cinco eixos**:

- **Persistência:** vale só nesta tarefa, neste projeto, ou sempre?
- **Natureza:** é fato, regra, procedimento ou ação determinística?
- **Carregamento:** entra no contexto sempre ou só sob demanda?
- **Enforcement:** é guia comportamental (o modelo pode ignorar) ou regra dura (executada pelo cliente)?
- **Escopo de compartilhamento:** só você, o time, ou a organização?

A regra de ouro do enforcement, declarada na própria doc: **CLAUDE.md, rules, skills, output styles e memória são *contexto*, não configuração imposta** — o modelo lê e tenta seguir, sem garantia. Para *bloquear* algo independentemente do que o modelo decida, use **hooks** (ex: `PreToolUse`) ou **permissões** em `settings.json`. Essa distinção governa metade das decisões de arquitetura.

Sobre XML-like: ele melhora **delimitação e previsibilidade** quando há múltiplos blocos heterogêneos (input do usuário + instruções + exemplos + schema de saída) e ajuda a prevenir injeção isolando dados não confiáveis. Mas **adiciona ruído** em tarefas curtas e em campos onde o formato nativo já é estruturado (frontmatter YAML, JSON de settings, schema de tool). A profundidade da estrutura deve acompanhar o tamanho da tarefa.

---

## 2. Glossário

| Termo | Definição |
|---|---|
| **System prompt** | Instrução base que define identidade, capacidades e estilo do modelo na sessão. Em Claude Code é montado a partir de presets + flags; no Agent SDK é mínimo por padrão. |
| **CLAUDE.md** | Arquivo markdown lido no início de toda sessão do Claude Code. Entregue como *mensagem de usuário após o system prompt* — não é enforcement. |
| **Auto memory** | Notas que o próprio Claude escreve entre sessões (aprendizados/preferências), por repositório, em `~/.claude/projects/<project>/memory/`. |
| **Rules (`.claude/rules/`)** | Instruções modulares em arquivos `.md`, opcionalmente escopadas a caminhos via frontmatter `paths`. |
| **Skill** | `SKILL.md` (frontmatter YAML + corpo). Carrega sob demanda. Padrão aberto Agent Skills. Engloba os antigos *custom slash commands*. |
| **Subagent** | Assistente especializado com contexto isolado, system prompt, modelo e ferramentas próprios. |
| **Output style** | Modifica diretamente o system prompt do Claude Code (papel, tom, formato). |
| **Hook** | Comando/LLM/HTTP disparado em eventos do ciclo de vida; pode permitir/negar/bloquear/injetar contexto de forma **determinística**. |
| **MCP** | Model Context Protocol: padrão aberto para conectar tools, resources e prompts externos. |
| **Plugin** | **Contêiner de distribuição** que empacota skills, agents, hooks, MCP servers, output styles, LSP servers, monitors e themes. |
| **Settings** | Configuração determinística (JSON): permissões, modelo, sandbox, hooks, plugins habilitados. |
| **Project (Claude.ai)** | Workspace persistente com *instructions* + *knowledge base*. ≠ diretório de projeto do Claude Code. |
| **Project (Claude Code)** | Diretório versionado contendo `.claude/`, `CLAUDE.md`, `.mcp.json`. ≠ Project do Claude.ai. |
| **Headless / `-p`** | Modo não interativo (`claude -p`), para scripts, pipes e CI. |
| **Agent SDK** | Biblioteca (TS/Python) para uso programático; antes "Claude Code SDK". `ClaudeAgentOptions` (renomeado de `ClaudeCodeOptions`). |
| **Connector** | Servidor MCP exposto via Claude.ai (Directory). |
| **Worktree** | Cópia git isolada para sessões/subagents paralelos (`.claude/worktrees/`). |

---

## 3. Mapa das superfícies

> Para cada item: **o que pode conter · persistência · escopo · melhor uso · limitações.**

### A. Claude.ai — chat (web, desktop, mobile)

#### A.1 Chat comum (fora de Projects)
- **Contém:** instruções ad-hoc, contexto da tarefa, anexos.
- **Persistência:** apenas a conversa atual. Mensagens de continuação herdam o contexto até o limite da janela.
- **Escopo:** uma conversa. **Não portável** entre conversas (salvo via memória/busca).
- **Melhor uso:** tarefas pontuais, exploração, instruções que mudam a cada turno.
- **Limitações:** sem persistência estruturada; reeditar/reenviar uma mensagem reinicia a árvore daquele ponto.

#### A.2 Anexos e arquivos no chat
- **Contém:** documentos, imagens, dados como **fatos** da tarefa.
- **Persistência:** a conversa atual.
- **Melhor uso:** dados de referência one-shot. Para reuso, mova para Project Knowledge.

#### A.3 Memória e preferências do usuário (perfil)
- **Dois toggles** em *Settings > Capabilities* (confirmado na doc oficial):
  - **"Search and reference chats"** — busca conversas anteriores quando relevante (planos pagos).
  - **"Generate memory from chat history"** — síntese automática dos chats, **atualizada a cada 24h**, que dá contexto a cada novo chat *standalone*. **Não inclui chats dentro de Projects.**
- **Preferências de perfil:** instruções globais aplicadas a toda nova conversa.
- **Persistência:** longa, editável. Chats *incognito* são **excluídos** da memória. Importação/exportação de memória entre IAs é experimental.
- **Controle organizacional:** Enterprise tem toggle org-wide ("Generate memory from chat history", ligado por padrão).
- **Melhor uso:** preferências estáveis sobre você (papel, estilo, formato, terminologia).
- **Limitações:** não é fonte oficial de verdade; pode conter conhecimento obsoleto; síntese tem atraso de até 24h.

#### A.4 Artifacts
- **Contém:** código, documentos, HTML/React, visualizações geradas — conteúdo destinado a uso fora da conversa.
- **Persistência:** vive na conversa; iterável.
- **Melhor uso:** entregáveis standalone (>20 linhas, reutilizáveis). Não para respostas curtas/conversacionais.

#### A.5 Research e web search
- **Contém:** recuperação de informação atual da web.
- **Melhor uso:** fatos recentes, verificação, pesquisa multi-fonte.

#### A.6 Connectors / integrações na conversa
- **Contém:** acesso a servidores MCP (ex: Google Drive, Slack) via Claude.ai.
- **Melhor uso:** ler/agir sobre sistemas externos sem colar dados manualmente.

### B. Claude Projects (Claude.ai)

> Project ≠ diretório do Claude Code. Disponível em planos pagos.

| Componente | O que colocar | Persistência | Compartilhamento |
|---|---|---|---|
| **Project Instructions** | Identidade e objetivo do projeto, papel, tom, formato, regras permanentes, padrões editoriais. Texto que se aplica a **todos os chats** do projeto. | Persistente no projeto | Time/org (Team/Enterprise) |
| **Project Knowledge** | Glossário, decisões permanentes, regras de arquitetura, exemplos, documentação extensa, dados de referência. Em planos pagos ativa **RAG** ao se aproximar do limite de contexto. | Persistente; biblioteca de referência | Time/org |
| **Arquivos enviados ao Project** | PDF, DOCX, CSV, TXT, HTML, código etc. | Persistente no knowledge base | Time/org |
| **Chats individuais no Project** | Contexto temporário de uma tarefa específica. | Só aquele chat | Por chat |
| **Memória do Project** | Cada Project tem espaço de memória **separado**; memória de Project não se mistura com a memória global standalone. | Por projeto | Por projeto |

**Quirk crítico:** *o contexto **não** é compartilhado entre chats de um mesmo Project* — apenas o **knowledge base** é. Decisões importantes que precisam persistir vão para Instructions ou Knowledge, nunca "escondidas" em um chat antigo.

**Onde colocar o quê:**
- Identidade/objetivo, tom, regras curtas → **Instructions**.
- Glossário, decisões, arquitetura, exemplos, docs extensas → **Knowledge**.
- Contexto efêmero de uma tarefa → **mensagem no chat**.

### C. Claude Code — superfícies de execução

Mesmas capacidades centrais (CLAUDE.md, skills, hooks, subagents, MCP, settings) em superfícies diferentes:

| Superfície | Natureza | Notas |
|---|---|---|
| **CLI interativo** (`claude`) | Terminal | Superfície de referência; todas as features. |
| **Claude Code on the web** | Sessão em nuvem | Ambiente isolado; setup scripts; `SessionStart` hook; teleport p/ terminal. |
| **Claude Code Desktop** | App | Chat + Code + terminal embutido; sessões paralelas; computer use opcional. |
| **VS Code (extensão)** | IDE | Prompt box, checkpoints, MCP IDE embutido. |
| **JetBrains** | IDE | Plugin oficial. |
| **Cursor** | IDE | `[NÃO CONFIRMADO]` na doc oficial atual; Cursor integra Claude por conta própria — verifique compatibilidade. |
| **Headless `claude -p`** | Não interativo | Scripts, pipes, CI. `--output-format json/stream-json`. |
| **Background agents / `claude agents`** | Concorrente | `agent view`; dispatch; supervisor. |
| **Worktrees** | Paralelo | `claude -w`; isolamento por cópia git. |
| **Routines / scheduled tasks** | Agendado | Web ou CLI (`/loop`, `/schedule`); triggers schedule/API/GitHub. |
| **GitHub Actions / GitLab CI** | Pipeline | `@claude` em issues/PRs; ações oficiais. |
| **Agent SDK** | Programático | TS/Python; presets de system prompt. |

**Portabilidade:** CLAUDE.md, skills, subagents, output styles, hooks, MCP e settings são portáveis entre superfícies do Claude Code (terminal, IDE, web, desktop, SDK com `settingSources`). O que **depende de implementação**: GitHub/GitLab usam YAML de pipeline próprio; SDK exige código TS/Python; rotinas web têm UI própria.

### D. CLAUDE.md e instruções persistentes

**Ordem de carregamento** (escopo mais amplo → mais específico; o mais específico é lido por último):

| Escopo | Local | Para quê | Compartilhado com |
|---|---|---|---|
| **Managed policy** | macOS `/Library/Application Support/ClaudeCode/CLAUDE.md` · Linux/WSL `/etc/claude-code/CLAUDE.md` · Windows `C:\Program Files\ClaudeCode\CLAUDE.md` | Padrões corporativos, segurança, compliance | Toda a org (não pode ser excluído) |
| **User** | `~/.claude/CLAUDE.md` | Preferências pessoais em todos os projetos | Só você |
| **Project** | `./CLAUDE.md` ou `./.claude/CLAUDE.md` | Padrões do time, arquitetura, comandos | Time (via VCS) |
| **Local** | `./CLAUDE.local.md` (gitignore) | Preferências pessoais do projeto | Só você |

**Mecanismos relacionados:**
- **Hierarquia de diretórios:** sobe da CWD até a raiz; arquivos pais carregados *em full* no launch; subdiretórios carregam *sob demanda* ao Claude ler arquivos lá.
- **Imports `@`:** `@path/to/file.md` (relativo ou absoluto), recursivo até 4 níveis; arquivos importados entram no contexto no launch (não economizam tokens).
- **AGENTS.md:** Claude lê `CLAUDE.md`, **não** `AGENTS.md`; importe-o (`@AGENTS.md`) ou crie symlink.
- **`claudeMdExcludes`** (settings): pula CLAUDE.md de outros times em monorepos (glob por caminho absoluto). Managed policy não pode ser excluído.
- **`claudeMd`** (em `managed-settings.json`): coloca conteúdo de CLAUDE.md direto no settings gerenciado.
- **`--add-dir` + `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1`:** carrega CLAUDE.md de diretórios adicionais.

**O que pertence ao CLAUDE.md:** fatos estáveis do repo, arquitetura, comandos de build/teste, padrões de código, restrições, convenções, critérios de conclusão. **Alvo: < 200 linhas.**

**O que NÃO deve ir:** procedimentos longos e multi-passo (→ skill), tarefas pontuais, documentação enciclopédica, exemplos enormes, instruções usadas raramente, regras escopadas a um caminho (→ `.claude/rules/`).

#### `.claude/rules/`
- Arquivos `.md` modulares; descoberta recursiva.
- **Sem `paths`:** carregados sempre, mesma prioridade que `.claude/CLAUDE.md`.
- **Com frontmatter `paths`** (globs): só carregam quando Claude trabalha com arquivos correspondentes.
- **`~/.claude/rules/`:** rules pessoais (carregadas antes das de projeto → projeto tem prioridade).
- **Symlinks** suportados (compartilhar rules entre projetos).

### E. Auto Memory

- **Local:** `~/.claude/projects/<project>/memory/` com `MEMORY.md` (índice) + arquivos de tópico.
- **Carregamento:** primeiras **200 linhas ou 25KB** de `MEMORY.md` em toda sessão; arquivos de tópico carregam sob demanda.
- **Escopo:** por repositório git; **compartilhado entre worktrees** do mesmo repo; **machine-local** (não sincroniza entre máquinas/nuvem).
- **Controle:** ligado por padrão; toggle via `/memory` ou `autoMemoryEnabled`; `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`; `autoMemoryDirectory` p/ realocar.
- **Subagents** podem ter auto memory própria (campo `memory: user|project|local`).
- **Quem escreve:** o Claude (vs. CLAUDE.md, escrito por você). Plain markdown — auditável/editável via `/memory`.
- **Riscos:** conhecimento obsoleto; não substitua documentação oficial; revise periodicamente.

### F. Skills (e commands legados)

- **Arquivo:** `<skill>/SKILL.md` (frontmatter YAML + corpo markdown). Padrão aberto **Agent Skills**.
- **Onde vivem / precedência:** Enterprise (managed) > Personal (`~/.claude/skills/`) > Project (`.claude/skills/`); Plugin (`<plugin>/skills/`, namespaced `plugin:skill`).
- **Carregamento progressivo:** descrição sempre no contexto; corpo só ao invocar. Em subagent com campo `skills`, o corpo é injetado no startup.
- **Invocação:** automática (Claude decide pela `description`) ou explícita (`/skill-name`).
- **Commands legados:** `~/.claude/commands/` e `.claude/commands/` **foram fundidos em skills**; continuam funcionando; um skill com mesmo nome tem precedência. Migração: mover `commands/x.md` → `skills/x/SKILL.md` (ganha diretório para arquivos de apoio + frontmatter de invocação).
- **Frontmatter** (todos opcionais; `description` recomendado): `name`, `description`, `when_to_use`, `argument-hint`, `arguments`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `disallowed-tools`, `model`, `effort`, `context: fork`, `agent`, `hooks`, `paths`, `shell`.
- **Convenção de encapsulamento (house convention, não exigida pelo spec):** frontmatter com `metadata.version` (semver entre aspas) + **uma tag raiz única** com o nome da skill carregando a versão — `<skill-name version="1.0.0">…</skill-name>` — envolvendo todo o corpo (título incluso); `version` da tag = `metadata.version`, bumpados juntos. Ver template **7.5**.
- **Controle de quem invoca:** `disable-model-invocation: true` (só você) · `user-invocable: false` (só Claude) · `skillOverrides` (settings).
- **Argumentos / substituições:** `$ARGUMENTS`, `$ARGUMENTS[N]`, `$N`, `$name`, `${CLAUDE_SESSION_ID}`, `${CLAUDE_EFFORT}`, `${CLAUDE_SKILL_DIR}`.
- **Contexto dinâmico:** `` !`comando` `` (inline) ou bloco ` ```! ` — roda o shell **antes** de o Claude ver o conteúdo, e injeta a saída.
- **Execução em subagent:** `context: fork` + `agent: Explore|Plan|general-purpose|<custom>`.
- **Tool permissions:** `allowed-tools` (pré-aprova) e `disallowed-tools` (remove do pool).
- **Quando usar skill em vez de:** CLAUDE.md (procedimento, não fato) · subagent (quer rodar no contexto principal, não isolado) · Project Instructions (é Claude Code, não Claude.ai) · prompt direto (é reutilizável) · hook (não precisa ser determinístico/em evento) · MCP (não precisa de servidor externo) · script (precisa de orquestração do modelo).

### G. Agents e subagents

- **Built-in:** **Explore** (read-only, Haiku, rápido; pula CLAUDE.md/git) · **Plan** (read-only, plan mode; pula CLAUDE.md/git) · **general-purpose** (todas as tools) · helpers (`statusline-setup`, `claude-code-guide`).
- **Custom — onde / precedência:** Managed (1, maior) > `--agents` JSON (2) > `.claude/agents/` (3) > `~/.claude/agents/` (4) > Plugin (5).
- **Frontmatter:** `name`*, `description`*, `tools`, `disallowedTools`, `model` (`sonnet|opus|haiku|fable|<id>|inherit`), `permissionMode` (`default|acceptEdits|auto|dontAsk|bypassPermissions|plan`), `maxTurns`, `skills` (preload), `mcpServers`, `hooks`, `memory` (`user|project|local`), `background`, `effort`, `isolation: worktree`, `color`, `initialPrompt`. (Plugin subagents ignoram `hooks`, `mcpServers`, `permissionMode`.)
- **Invocação:** linguagem natural · `@"nome (agent)"` (garante) · `--agent <nome>` ou setting `agent` (sessão inteira assume o system prompt do subagent).
- **Isolamento:** janela de contexto fresca; **não** vê histórico, skills já invocadas ou arquivos lidos (exceto **fork**).
- **Critérios de delegação:** tarefa verbosa cujo output você não reusará; restrição de tools; trabalho self-contained que retorna resumo.
- **Diferenciações:**
  - **Subagent:** delega dentro de uma sessão; retorna resumo.
  - **Fork (`/fork`):** subagent que **herda** toda a conversa; ideal p/ tarefa lateral sem reexplicar; não pode forkar de novo.
  - **Background agent (`claude agents`/`--bg`):** sessões paralelas independentes, monitoradas em um painel.
  - **Agent team:** lead + teammates que se comunicam (experimental: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`).
  - **Worker externo (Codex/Gemini):** integração customizada, fora do padrão nativo.
  - **Agent SDK agent:** definição programática (`AgentDefinition`).
  - **Hook `agent`:** chama um subagent como handler de evento (≠ subagent de tarefa).

### H. Hooks

**Cinco tipos de handler** (confirmados): `command` · `prompt` (chamada LLM única) · `agent` (subagent com tools) · `http` · `mcp_tool`.

**Eventos** (lista oficial atual): `SessionStart`, `Setup`, `InstructionsLoaded`, `UserPromptSubmit`, `UserPromptExpansion`, `MessageDisplay`, `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PostToolUseFailure`, `PostToolBatch`, `PermissionDenied`, `Notification`, `SubagentStart`, `SubagentStop`, `TaskCreated`, `TaskCompleted`, `Stop`, `StopFailure`, `TeammateIdle`, `ConfigChange`, `CwdChanged`, `FileChanged`, `WorktreeCreate`, `WorktreeRemove`, `PreCompact`, `PostCompact`, `SessionEnd`, `Elicitation`, `ElicitationResult`.

- **Onde o texto vive:** hooks `command` → script externo; hooks `prompt`/`agent` → campo de prompt na config (settings.json, frontmatter de skill/agent, plugin).
- **Entrada:** JSON via stdin (`tool_input`, `tool_name`, `CLAUDE_PROJECT_DIR` etc.).
- **Saída / decisão:** exit code (2 = block, semântica por evento), ou JSON estruturado (`allow`/`deny`/`block`/`ask`, adicionar contexto, mensagens). Matchers filtram por tool name/args (`if`).
- **Quando LLM única (`prompt`):** julgamento simples sem tools (ex: "esta mudança quebra a convenção X?").
- **Quando agente (`agent`):** validação que precisa investigar (ler arquivos, rodar comandos).
- **Quando `command`:** validação determinística (lint, testes, regex). Preferível por custo/determinismo.
- **Hooks diferem de:** instruções comportamentais (CLAUDE.md) — hooks são **determinísticos e em evento**. Use hook para política de segurança, validação, linter, observabilidade, notificação.

### I. Output Styles

- **Built-in:** Default · **Proactive** (executa imediatamente) · **Explanatory** (insights educacionais) · **Learning** (`TODO(human)`).
- **Onde:** `~/.claude/output-styles` (user) · `.claude/output-styles` (project) · managed · plugin (`output-styles/`).
- **Frontmatter:** `name`, `description`, `keep-coding-instructions` (manter instruções de engenharia), `force-for-plugin`.
- **Como funciona:** **modifica o system prompt** diretamente; lido uma vez no início da sessão (efetiva após `/clear` ou nova sessão). Seleção via `/config` ou setting `outputStyle`.
- **Bom para:** tom, formato padrão de resposta, modo professor, nível de detalhe, papel (ex: analista de dados em vez de engenheiro).
- **Não use como substituto de:** regras de projeto (CLAUDE.md), skills, agents, validações/segurança (hooks/permissões), conhecimento técnico (knowledge/rules).

### J. System prompts via CLI

**Quatro flags** (funcionam em interativo e `-p`):

| Flag | Comportamento |
|---|---|
| `--system-prompt` | **Substitui** todo o system prompt por texto. |
| `--system-prompt-file` | Substitui pelo conteúdo de um arquivo. |
| `--append-system-prompt` | **Acrescenta** ao prompt padrão. |
| `--append-system-prompt-file` | Acrescenta o conteúdo de um arquivo. |

- `--system-prompt` e `--system-prompt-file` são mutuamente exclusivos; as flags de append combinam com qualquer das de substituição.
- **Substituição** descarta tool guidance, instruções de segurança e convenções de código — você assume tudo. **Extensão (append)** preserva o padrão e adiciona o que difere.
- Relacionados: `-p`/`--print` (headless), `--bare` (pula auto-discovery: hooks, skills, plugins, MCP, auto memory, CLAUDE.md), `--agent`/`--agents`, `--model`, `--tools`/`--allowedTools`/`--disallowedTools`, `--mcp-config`/`--strict-mcp-config`, `--setting-sources`, `--settings`, `--output-format text|json|stream-json`, `--json-schema`, `--safe-mode`.
- **Impacto:** `--append-*` preserva CLAUDE.md, skills, hooks, plugins, MCP, auto memory. `--system-prompt` substitui o prompt mas CLAUDE.md/memória ainda carregam pelo fluxo normal de mensagens. `--bare`/`--safe-mode` desligam o auto-discovery.
- **Risco:** sobrescrever o system prompt sem entender que perde tool guidance e safety. Em scripts, reaplicar a cada invocação.

### K. Agent SDK

- **Default:** system prompt **mínimo** (só instruções essenciais de tools). Para o prompt completo: `systemPrompt: { type: "preset", preset: "claude_code" }`.
- **Quatro abordagens de system prompt:**

| Abordagem | Persistência | Tools padrão | Safety | Controle |
|---|---|---|---|---|
| **CLAUDE.md** | Por projeto (arquivo) | Preservadas | Mantida | Só adições |
| **Output styles** | Arquivos (cross-project) | Preservadas | Mantida | Substitui default |
| **`systemPrompt` + `append`** | Sessão | Preservadas | Mantida | Só adições |
| **Custom `systemPrompt`** | Sessão | **Perdidas** (a menos que incluídas) | Deve ser adicionada | Controle total |

- **CLAUDE.md exige `settingSources` / `setting_sources`:** o preset `claude_code` sozinho **não** carrega CLAUDE.md — inclua `'project'` e/ou `'user'`.
- **Outros pontos programáticos:** `agents` (AgentDefinition), `skills`, `hooks` (callbacks), `tools`/`createSdkMcpServer`, `mcpServers`, `permissionMode`/`canUseTool`, session resume/fork, `--json-schema`/structured outputs.
- **Migração:** `ClaudeCodeOptions` → `ClaudeAgentOptions` (Python); system prompt deixou de ser default; `settingSources` passou a ser explícito.
- **Comparação:** SDK com prompt mínimo (agente especializado) · SDK + preset `claude_code` (comportamento de Claude Code) · preset + `append` (estende) · custom (controle total) · `claude -p` (mesmo motor via CLI).

### L. MCP

**Superfícies (cada descrição é uma instrução de decisão para o modelo):**

| Superfície | Função |
|---|---|
| **Tool name** | Identifica a ação. |
| **Tool description** | Diz **quando chamar / quando não chamar / quais dados / efeitos colaterais / como interpretar o resultado.** É prompt de fato. |
| **Input schema + descrições de campo** | Contrato de parâmetros. |
| **Resources / resource descriptions / templates** | Conteúdo lido como contexto. |
| **Prompts MCP** | Expostos como **comandos** (executáveis via `/`); aceitam argumentos. |
| **Elicitation** | Servidor pede input adicional ao usuário. |
| **`roots/list`** | Servidor descobre o diretório de lançamento. |
| **Retorno (texto/estruturado)** | Vira contexto/resultado. |
| **`list_changed`** | Atualização dinâmica de tools/prompts/resources. |

- **Escopos / precedência:** Local (`~/.claude.json`, padrão) → Project (`.mcp.json`, versionável) → User → Plugin → connectors do Claude.ai. (Os três escopos casam por nome; plugins/connectors por endpoint.)
- **Transports:** `http`/`streamable-http` (recomendado) · `sse` (deprecado) · `stdio` · `ws`.
- **Managed MCP:** `managed-mcp.json`, allowlists/denylists, restrições enterprise.
- **Tool Search:** carregamento diferido de tools MCP (default).
- **Nome de tool em regras:** `mcp__<server>__<tool>` (plugin: `mcp__plugin_<plugin>_<server>__<tool>`).
- **`sampling`** (servidor pedir geração ao cliente): `[NÃO CONFIRMADO]` como recurso exposto na doc do Claude Code.
- **Diferenciações:**
  - **MCP tool:** ação executável com schema.
  - **MCP resource:** dado/contexto lido.
  - **MCP prompt:** comando reutilizável (≠ skill, ≠ slash command nativo).
  - **Connector:** servidor MCP via Claude.ai.
  - **Hook `mcp_tool`:** dispara em uso de tool MCP (≠ a tool em si).
  - **Tool nativa:** Read/Edit/Bash etc. do Claude Code.

### M. Plugins

- **Empacotam:** skills, agents, hooks, MCP servers, output styles, LSP servers, monitors, themes (`plugins-reference`).
- **Distribuição:** pessoal · projeto · marketplace (oficial Anthropic + comunidade) · organizacional.
- **Mecanismos:** `plugin.json` (manifesto), marketplaces (GitHub/git/local/URL/npm), habilitação por escopo, versionamento/release channels, dependências, precedência, atualização (`/reload-plugins`), confiança/segurança.
- **Esclarecimento:** plugin é **contêiner de distribuição**, **não** um novo tipo de prompt. Não crie plugin para um prompt isolado.

### N. Settings e permissões (moldam comportamento)

| Mecanismo | Classe |
|---|---|
| `~/.claude/settings.json` (user), `.claude/settings.json` (project), `.claude/settings.local.json` (local), managed settings | Configuração determinística |
| `permissions.allow / ask / deny` | Restrição/política |
| Permission modes (`default`/`acceptEdits`/`plan`/`auto`/`dontAsk`/`bypassPermissions`) | Política |
| Sandbox (`sandbox.enabled`) | Restrição |
| `model`, `effortLevel`, `fallbackModel` | Capacidade |
| `enabledPlugins`, `outputStyle`, `agent`, `hooks` | Capacidade/distribuição |
| Variáveis de ambiente (`env`) | Configuração |

**Precedência (resumo):** managed/policy > local > project > user (com merge de arrays em alguns campos). `--settings`/`--setting-sources` ajustam por sessão.
**Classificação:** a maioria é **configuração/restrição/política/capacidade** determinística — não prompt em linguagem natural. Exceções textuais: `claudeMd`, `system prompt` (setting), output style.

### O. Ferramentas e integrações externas

| Local | Classe |
|---|---|
| GitHub Actions / GitLab CI (`@claude`, prompts em YAML) | Integração externa (recurso nativo via plugin/action oficial) |
| Templates de issue / comentários com menção | Convenção de projeto |
| Scripts shell, Makefiles, package scripts | Convenção de projeto / `claude -p` |
| Chamadas HTTP à API / apps com Anthropic API | Arquitetura customizada |
| Workers externos (Codex, Gemini) chamados pelo Claude | Integração externa |
| Prompts em banco/arquivos versionados | Arquitetura customizada |

**Classes:** recurso nativo do Claude · padrão MCP · convenção de projeto · integração externa · arquitetura customizada.

---

## 4. Catálogo de técnicas

### 4.1 Estrutura e delimitação
XML-like tags · Markdown · seções nomeadas · delimitadores · YAML frontmatter · JSON · JSON Schema · templates · variáveis/placeholders · contratos de entrada e saída.

**XML-like — quando vale:** múltiplos blocos heterogêneos; isolar input não confiável (`<input>`) de instruções (`<instructions>`); forçar saída em `<output>`. **Quando vira ruído:** tarefa curta; campo já estruturado (frontmatter/JSON/schema). **Profundidade:** rasa para tarefas pequenas (tags simples); aninhada só quando o ganho de clareza > 10%. **Híbrido:** XML para estrutura semântica, Markdown para densidade textual interna.

### 4.2 Definição da tarefa
Objetivo · contexto · motivação · escopo · não-escopo · restrições · critérios de aceitação · definition of done · prioridades · trade-offs · pressupostos · ambiguidades conhecidas.

### 4.3 Raciocínio e execução
Decomposição · planejamento · plan-then-execute · fases · tasks/subtasks · checkpoints · verificação antes de avançar · geração e comparação de alternativas · crítica · revisão · reflexão orientada a evidências · self-consistency · evaluator–optimizer · orchestrator–workers · map-reduce · fan-out/fan-in · debate · pesquisa iterativa · hipótese→teste→conclusão · escalonamento entre modelos.

> **Não peça raciocínio privado.** Prefira **artefatos observáveis:** plano, decisões, evidências, verificações, resultados de tools, riscos, conclusão.

### 4.4 Uso de contexto
Contexto mínimo necessário · progressive disclosure · referências sob demanda · exemplos/few-shot · contraexemplos · documentos de apoio · recuperação por busca · separação fato×instrução · freshness · proveniência · tratamento de conflitos.

### 4.5 Controle de tools
Tools permitidas/proibidas · tool choice · ordem de execução · paralelismo · side effects · aprovação humana · retry · timeout · idempotência · validação de parâmetros · verificação de resultados · fallback · escalonamento.

### 4.6 Qualidade da resposta
Formato · schema · nível de detalhe · audiência · linguagem · tom · citações · evidências · incerteza · separação fato×inferência · validação · testes · revisão final · checklist.

### 4.7 Engenharia de agentes
Identidade · responsabilidade única · autoridade · limites · handoff · memória · isolamento · comunicação entre agentes · formato de retorno · critérios de delegação/escalonamento · budget · model routing · prevenção de trabalho duplicado · resolução de conflitos.

### 4.8 Mapeamento técnica → superfície (resumo)

| Técnica | Onde aplicar tipicamente |
|---|---|
| Contrato de saída / schema | `<output-format>` no prompt; `--json-schema` / structured outputs (SDK) |
| Few-shot / exemplos | Project Knowledge; arquivo de apoio da skill; corpo do prompt |
| Plan-then-execute | Plan mode; output style Proactive; instrução no prompt |
| Verificação determinística | **Hook** `command`/`PostToolUse`; CI |
| Restrição de tools | `allowed-tools` (skill); `tools`/`disallowedTools` (subagent); `permissions` (settings) |
| Identidade/papel persistente | Output style; Project Instructions; `--append-system-prompt` |
| Conhecimento de domínio sob demanda | Skill (`user-invocable: false`); `.claude/rules` com `paths` |
| Orquestrador–workers | Subagents (`Agent(...)`); agent teams |
| Memória de longo prazo | Auto memory; subagent `memory:`; Project Knowledge |
| Progressive disclosure | Skill (corpo carrega só ao invocar; arquivos de apoio sob demanda) |

---

## 5. Matriz de decisão

> **Contexto** = consumo de tokens no carregamento. **Auto** = pode disparar/ser invocado automaticamente. **Tools** = pode chamar ferramentas.

| Mecanismo | Prompt textual? | Escopo | Persistência | Carregamento | Auto? | Tools? | Compartilhável? | Versionável? | Custo de contexto | Melhor uso | Evitar quando |
|---|:--:|---|---|---|:--:|:--:|:--:|:--:|---|---|---|
| **Chat (Claude.ai)** | Sim | Conversa | Sessão | Imediato | Não | Sim (UI) | Não | Não | Baixo | Tarefa pontual | Precisa persistir |
| **Project Instructions** | Sim | Projeto (ai) | Persistente | Toda conversa do projeto | — | — | Time/org | Não nativo | Médio | Papel/tom/regras do projeto | É procedimento longo |
| **Project Knowledge** | Sim (docs) | Projeto (ai) | Persistente | RAG/sob demanda (pago) | — | — | Time/org | Não nativo | Médio–alto | Glossário/decisões/exemplos | Política dura |
| **Memória (Claude.ai)** | Sim (síntese) | Usuário | Longa (24h) | Todo chat standalone | Sim | Não | Não | Não | Baixo | Preferências sobre você | Fonte de verdade |
| **CLAUDE.md** | Sim | User/proj/local/org | Toda sessão | Launch (full) | — | — | Conforme escopo | Sim | Médio (≤200 linhas) | Fatos estáveis do repo | Procedimento/doc enorme |
| **`.claude/rules`** | Sim | Proj/user | Sessão ou por path | Launch ou ao abrir match | — | — | Sim | Sim | Médio | Regras modulares por caminho | Tarefa pontual |
| **Auto memory** | Sim | Repo | Entre sessões | 200 linhas/25KB | Sim (escrita) | — | Worktrees do repo | Local (não VCS) | Baixo | Aprendizados do Claude | Documentação oficial |
| **Skill** | Sim | User/proj/plugin/org | Sob demanda | Só ao invocar (desc sempre) | Sim (opcional) | Sim (`allowed-tools`) | Sim | Sim | Baixo até invocar | Procedimento reutilizável | Precisa ser determinístico |
| **Command legado** | Sim | User/proj | Sob demanda | Ao invocar | Não (sem auto) | Sim | Sim | Sim | Baixo | Compat.; migrar p/ skill | Quer recursos de skill |
| **Subagent** | Sim (system prompt) | Proj/user/plugin/managed/CLI | Sessão | Ao delegar | Sim | Sim (restrito) | Sim | Sim | Isolado (próprio) | Trabalho verboso/isolado | Tarefa interativa curta |
| **Hook `command`** | Não (script) | User/proj/managed | Por evento | No evento | Sim | — (script) | Sim | Sim | Mínimo | Validação determinística | Precisa julgamento do modelo |
| **Hook `prompt`** | Sim | User/proj/managed | Por evento | No evento | Sim | Não | Sim | Sim | Baixo | Julgamento simples sem tools | Validação determinística basta |
| **Hook `agent`** | Sim | User/proj/managed | Por evento | No evento | Sim | Sim | Sim | Sim | Médio | Validação que investiga | Script resolveria |
| **Output style** | Sim | User/proj/plugin/managed | Sessão | System prompt (launch) | — | — | Sim | Sim | Médio | Papel/tom/formato sempre | É regra de projeto |
| **CLI system prompt** | Sim | Invocação | Invocação | No comando | — | — | Via script | Sim (script) | Médio | Script/CI one-off | Uso interativo recorrente |
| **Agent SDK system prompt** | Sim | Código | Sessão | Na query | — | Sim | Via código | Sim | Variável | Agente programático | Quer config em arquivo |
| **MCP tool description** | Sim | Servidor | Enquanto conectado | Tool listing | Sim (decisão) | Sim | Sim | Sim (servidor) | Médio (cresce c/ nº tools) | Quando/como usar a tool | Vaga/genérica |
| **MCP resource** | Sim | Servidor | Sob demanda | Ao referenciar | Sim | — | Sim | Sim | Baixo–médio | Contexto externo | Dado deveria ser fato fixo |
| **MCP prompt** | Sim | Servidor | Sob demanda | Como comando | Não | — | Sim | Sim | Baixo | Comando reutilizável do servidor | Confundir com skill |
| **Plugin** | Indireto | Conforme escopo | Persistente | Conforme componente | — | — | Sim | Sim | Conforme conteúdo | Distribuir um conjunto | Um prompt isolado |
| **Settings** | Raro | User/proj/local/managed | Persistente | Launch | — | — | Sim | Sim | Nenhum (config) | Permissão/modelo/sandbox | Comportamento textual |
| **CI (GitHub/GitLab)** | Sim (YAML) | Repo/pipeline | Persistente | No evento de CI | Sim | Sim | Time | Sim | N/A | Garantia em PR/MR | Iteração local rápida |

---

## 6. Árvore de decisão

```text
Tenho uma nova instrução. Onde devo colocá-la?

├─ É Claude.ai (chat/Projects) ou Claude Code/SDK?
│
├─ [CLAUDE.AI]
│   ├─ Vale só nesta conversa? .................... MENSAGEM DE CHAT
│   ├─ É sobre VOCÊ (preferência/estilo/papel)
│   │   e vale em tudo? ........................... MEMÓRIA / PREFERÊNCIAS DE PERFIL
│   ├─ Vale para um corpo de trabalho específico?
│   │   ├─ É papel/tom/regra curta? .............. PROJECT INSTRUCTIONS
│   │   └─ É doc/glossário/decisão/exemplo? ...... PROJECT KNOWLEDGE
│   └─ É entregável reutilizável? ................ ARTIFACT
│
└─ [CLAUDE CODE / SDK]
    ├─ Precisa ser DETERMINÍSTICA (executada
    │   independentemente do que o modelo decida)?
    │   ├─ Reage a um EVENTO do ciclo de vida? ... HOOK (command/prompt/agent)
    │   ├─ É bloqueio de tool/comando/caminho? ... SETTINGS permissions (deny/ask)
    │   └─ É garantia em PR/MR? ................... CI (GitHub Actions/GitLab)
    │
    ├─ É um FATO estável do repositório?
    │   ├─ Específica de um CAMINHO? ............. .claude/rules (paths)
    │   ├─ Vale no repo todo? .................... CLAUDE.md (project)
    │   ├─ Pessoal, todos os projetos? .......... ~/.claude/CLAUDE.md
    │   └─ Política da organização? ............. MANAGED CLAUDE.md / settings
    │
    ├─ É um PROCEDIMENTO/workflow reutilizável?
    │   ├─ Roda no contexto principal? ........... SKILL
    │   ├─ Precisa de contexto ISOLADO/restrito? . SUBAGENT
    │   └─ Herda toda a conversa atual? .......... FORK
    │
    ├─ Muda só TOM/FORMATO/PAPEL de resposta? .... OUTPUT STYLE
    │
    ├─ Precisa de SISTEMA EXTERNO (API/DB/SaaS)? . MCP (tool/resource/prompt)
    │
    ├─ É um conjunto a DISTRIBUIR (várias peças)? . PLUGIN
    │
    ├─ É one-off em SCRIPT/CI? ................... CLI --append-system-prompt / -p
    │
    ├─ É programático (app/serviço)? ............. AGENT SDK
    │
    └─ Lógica pura sem julgamento do modelo? ..... CÓDIGO CONVENCIONAL / SCRIPT
```

**Eixos de decisão (checklist mental):**
1. Válida sempre ou só nesta tarefa?
2. Fato, regra, procedimento ou ação?
3. Carregar sempre ou sob demanda?
4. Precisa de tools?
5. Precisa de contexto isolado?
6. Precisa ser determinística?
7. Reage a um evento?
8. Compartilhar com o time?
9. Um projeto ou todos?
10. Altera conteúdo, comportamento, formato ou permissão?
11. Específica de um caminho do repo?
12. Reutilizável fora do Claude Code?

---

## 7. Templates XML-like

> Cada template respeita o **formato real** do mecanismo. XML-like aparece **dentro dos campos textuais** (corpo de skill, prompt de hook, instruções, descrição de tool). Frontmatter é YAML; settings/hooks são JSON; schema é JSON Schema; SDK é TS/Python.

### 7.1 Prompt de chat
```xml
<task>
  <objective>Resumir o relatório anexo em até 5 bullets executivos.</objective>
  <context>
    Audiência: diretoria. Documento: <input>{{ARQUIVO}}</input>.
  </context>
  <constraints>
    Dados ausentes: declare "N/A". Não infira números.
  </constraints>
  <output-format>
    5 bullets, 1 frase cada, ordem de impacto decrescente.
  </output-format>
</task>
```

### 7.2 Project Instructions (Claude.ai)
```xml
<project-identity>
  <role>Analista sênior de produto SaaS B2B.</role>
  <tone>Direto, sem hedging. Português.</tone>
  <defaults>
    Sempre: resumo executivo + corpo estruturado.
    Separe fato de inferência.
  </defaults>
  <scope>Roadmap, métricas, especificações. Fora: jurídico/fiscal.</scope>
</project-identity>
```

### 7.3 `CLAUDE.md`
```markdown
# Projeto Acme API

## Stack & comandos
- Build: `make build` · Testes: `make test` · Lint: `make lint`

## Convenções
- TypeScript strict. Handlers em `src/api/handlers/`.
- Indentação: 2 espaços. Sem `any`.

## Restrições
- Nunca commitar direto na `main`.
- Migrations só em `migrations/`.

## Critério de conclusão
- `make test` e `make lint` passam antes de qualquer PR.

<!-- nota de mantenedor: regras de billing em .claude/rules/billing.md -->
@AGENTS.md
```

### 7.4 Rule por caminho (`.claude/rules/api.md`)
```markdown
---
paths:
  - "src/api/**/*.ts"
---

<rule domain="api">
  <must>Validar input em todo endpoint.</must>
  <must>Formato de erro padrão do projeto.</must>
  <must>Comentários OpenAPI nos handlers públicos.</must>
</rule>
```

### 7.5 Skill (`.claude/skills/pr-summary/SKILL.md`)

**Convenção de encapsulamento (house convention):** frontmatter spec-válido com `metadata.version` (semver entre aspas) + **uma única tag raiz** com o nome exato da skill, carregando a versão (`<pr-summary version="1.0.0">…</pr-summary>`). A tag `version` **deve** igualar `metadata.version` — mesmo valor em dois lugares, bumpados juntos. Tags semânticas aninham **dentro** da raiz; nenhuma tag solta no topo. Código sempre em fence; tabelas/listas em Markdown.

```markdown
---
name: pr-summary
description: Resume um PR e sinaliza riscos. Use ao revisar diffs, pedir mensagem de commit ou avaliar mudanças não commitadas — mesmo sem a palavra "PR".
metadata:
  version: "1.0.0"
allowed-tools: Bash(gh *)
---

<pr-summary version="1.0.0">

# PR Summary

## Contexto dinâmico
- Diff: !`gh pr diff`
- Arquivos: !`gh pr diff --name-only`

<task>
  <objective>Resumir o PR acima.</objective>
  <process>
    1. 3 bullets do que mudou.
    2. Liste riscos: erro não tratado, valor hardcoded, teste faltante.
  </process>
  <output-format>Bullets. Se diff vazio: "Sem mudanças não commitadas."</output-format>
</task>

</pr-summary>
```

> **Spec × convenção:** o padrão Agent Skills **não** exige a tag raiz — o harness embrulha a skill ativada no próprio `<skill_content name=…>` (espere um duplo-wrap benigno em runtime). A raiz é convenção da casa, para delimitar o corpo em arquivo e arbitrar versão. **Escape hatch:** em skills curtas, lineares ou subjetivas, dispense as tags semânticas internas (só Markdown limpo) — mas a tag raiz ainda envolve tudo.

### 7.6 Custom slash command legado (`.claude/commands/deploy.md`)
```markdown
---
description: Deploy para produção
disable-model-invocation: true
---

<task>
  <objective>Fazer deploy de $ARGUMENTS para produção.</objective>
  <process>1. Rodar testes. 2. Build. 3. Push. 4. Verificar.</process>
</task>
```
> Migração recomendada: `commands/deploy.md` → `skills/deploy/SKILL.md` (ganha arquivos de apoio).

### 7.7 Subagente (worker) — `.claude/agents/code-reviewer.md`
```markdown
---
name: code-reviewer
description: Revisor de código read-only. Use proativamente após mudanças.
tools: Read, Grep, Glob, Bash
model: inherit
---

<agent>
  <responsibility>Revisar código modificado. Não editar.</responsibility>
  <process>
    1. `git diff` para ver mudanças.
    2. Foco nos arquivos modificados.
  </process>
  <checklist>Legibilidade · nomes · duplicação · erros · segredos · validação · testes.</checklist>
  <return-format>
    Crítico (corrigir) / Aviso (deveria) / Sugestão (considerar). Com exemplo de fix.
  </return-format>
</agent>
```

### 7.8 Agente orquestrador — `.claude/agents/coordinator.md`
```markdown
---
name: coordinator
description: Coordena workers especializados em tarefas multi-fase.
tools: Agent(code-reviewer, debugger), Read, Bash
model: opus
---

<orchestrator>
  <strategy>Decompor → delegar a workers → sintetizar.</strategy>
  <delegation>
    Revisão → code-reviewer. Falhas/bugs → debugger.
  </delegation>
  <escalation>Conflito entre workers: apresentar ao usuário, não decidir sozinho.</escalation>
  <return-format>Síntese consolidada + decisões + riscos.</return-format>
</orchestrator>
```

### 7.9 Worker — `.claude/agents/debugger.md`
```markdown
---
name: debugger
description: Especialista em diagnóstico de erros e falhas de teste.
tools: Read, Edit, Bash, Grep, Glob
---

<agent>
  <responsibility>Achar causa-raiz e aplicar fix mínimo.</responsibility>
  <process>1. Capturar erro. 2. Reproduzir. 3. Isolar. 4. Fix mínimo. 5. Verificar.</process>
  <return-format>Causa-raiz + evidência + fix + teste + prevenção.</return-format>
</agent>
```

### 7.10 Hook do tipo `prompt` (`settings.json`)
```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "<audit><criteria>Todo arquivo alterado tem teste correspondente? Há valor hardcoded?</criteria><decide>Se faltar teste: block com a lista de arquivos sem teste. Senão: allow.</decide></audit>"
          }
        ]
      }
    ]
  }
}
```

### 7.11 Hook do tipo `agent` (`settings.json`)
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "agent",
            "prompt": "<task><objective>Após a edição, rodar a suíte de testes afetada e reportar só falhas.</objective><tools>Bash, Read</tools><return>Lista de testes falhando ou 'OK'.</return></task>"
          }
        ]
      }
    ]
  }
}
```

### 7.12 Hook `command` determinístico (`settings.json`)
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "./scripts/validate-readonly-query.sh" }
        ]
      }
    ]
  }
}
```

### 7.13 Output style (`.claude/output-styles/diagrams-first.md`)
```markdown
---
name: Diagrams first
description: Começa toda explicação com um diagrama
keep-coding-instructions: true
---

<style>
  <rule>Ao explicar código/arquitetura/fluxo, comece com diagrama Mermaid, depois prosa.</rule>
  <conventions>`flowchart TD` para controle; `sequenceDiagram` para requisições. ≤15 nós.</conventions>
</style>
```

### 7.14 `--append-system-prompt` (CLI/script)
```bash
claude --append-system-prompt "$(cat <<'EOF'
<rules>
  <output>Sempre TypeScript com docstrings e type hints.</output>
  <grounding>Dado ausente: declare "N/A". Nunca fabrique.</grounding>
</rules>
EOF
)" -p "Implemente a função de paginação"
```

### 7.15 Agent SDK (TypeScript)
```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Adicione um componente React de perfil de usuário",
  options: {
    systemPrompt: {
      type: "preset",
      preset: "claude_code",
      append: `<rules><style>Componentes funcionais; JSDoc em APIs públicas.</style></rules>`
    },
    settingSources: ["project"], // necessário p/ carregar CLAUDE.md
    allowedTools: ["Read", "Edit", "Bash"]
  }
})) {
  if (message.type === "assistant") console.log(message.message.content);
}
```

### 7.16 Descrição de MCP tool (a descrição É o prompt)
```json
{
  "name": "create_invoice",
  "description": "Cria uma fatura no ERP. CHAME quando o usuário confirmar valor, cliente e itens. NÃO chame se faltar qualquer um desses dados — peça antes. EFEITO COLATERAL: gera cobrança real e e-mail ao cliente. RETORNO: invoice_id + status. Interprete status='draft' como não enviada.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "customer_id": { "type": "string", "description": "ID do cliente no ERP (não o e-mail)." },
      "amount_cents": { "type": "integer", "description": "Valor total em centavos. Inteiro." },
      "items": { "type": "array", "description": "Itens da fatura.", "items": { "type": "string" } }
    },
    "required": ["customer_id", "amount_cents", "items"]
  }
}
```

### 7.17 MCP prompt (exposto como comando)
```json
{
  "name": "incident_review",
  "description": "Roteiro de pós-incidente.",
  "arguments": [
    { "name": "incident_id", "description": "ID do incidente", "required": true }
  ]
}
```
Corpo (texto retornado, XML-like):
```xml
<task>
  <objective>Pós-mortem do incidente {{incident_id}}.</objective>
  <sections>Timeline · causa-raiz · impacto · ações corretivas · prevenção.</sections>
  <grounding>Use só dados do incidente. Lacuna: "Informação insuficiente".</grounding>
</task>
```

### 7.18 Handoff entre agentes (no corpo do orquestrador)
```xml
<handoff>
  <to>debugger</to>
  <input>Arquivos com falha: {{lista}}. Logs: {{trecho}}.</input>
  <expected-return>Causa-raiz + fix + teste.</expected-return>
  <on-conflict>Se diagnóstico divergir do code-reviewer, escalar ao usuário.</on-conflict>
</handoff>
```

### 7.19 Tarefa paralelizável
```xml
<parallel-research>
  <fan-out>
    <branch agent="Explore">Módulo de autenticação</branch>
    <branch agent="Explore">Camada de banco</branch>
    <branch agent="Explore">Módulo de API</branch>
  </fan-out>
  <fan-in>Sintetizar achados com referências de arquivo. Sem dependência entre branches.</fan-in>
</parallel-research>
```

### 7.20 Code review (prompt/skill)
```xml
<code-review>
  <scope>Apenas o diff atual (`git diff`).</scope>
  <criteria>Correção · segurança · performance · legibilidade · testes.</criteria>
  <severity>Crítico / Aviso / Sugestão.</severity>
  <evidence>Cite arquivo:linha. Mostre o fix.</evidence>
</code-review>
```

### 7.21 Pesquisa técnica
```xml
<research>
  <question>{{PERGUNTA}}</question>
  <method>Hipótese → buscar evidência → confrontar fontes → conclusão.</method>
  <grounding>Citar proveniência. Conflito entre fontes: reportar, não resolver à força.</grounding>
  <output>Resposta + evidências + incertezas conhecidas.</output>
</research>
```

### 7.22 Implementação
```xml
<implementation>
  <objective>{{FEATURE}}</objective>
  <plan>Plan-then-execute: apresentar plano, aguardar OK, implementar.</plan>
  <verify>Rodar testes; mostrar evidência (saída do comando).</verify>
  <done>Testes verdes + lint limpo.</done>
</implementation>
```

### 7.23 Debugging
```xml
<debug>
  <repro>Passos de reprodução.</repro>
  <process>Isolar → hipótese → teste → fix mínimo → verificar.</process>
  <output>Causa-raiz + evidência + fix + prevenção.</output>
</debug>
```

### 7.24 Geração de documentação
```xml
<docgen>
  <source>{{ARQUIVOS}}</source>
  <audience>Devs novos no repo.</audience>
  <grounding>Documente só o que o código suporta. Lacuna: marcar "TODO".</grounding>
  <output>Markdown: visão geral · setup · exemplos.</output>
</docgen>
```

### 7.25 Saída JSON com schema
```xml
<task>
  <objective>Extrair campos do documento.</objective>
  <output-format>Apenas JSON conforme o schema. Sem preâmbulo, sem cercas markdown.</output-format>
  <grounding>Campo ausente no documento: null. Nunca inventar.</grounding>
</task>
```
CLI: `claude -p --json-schema '{"type":"object","properties":{...}}' "..."`

### 7.26 Avaliação final
```xml
<evaluation>
  <rubric>Clareza · groundedness · cobertura · formato · tom.</rubric>
  <score>0–10 por critério.</score>
  <gate>Se algum < 8: identificar gap, refatorar, reavaliar. Máx 2 iterações.</gate>
</evaluation>
```

---

## 8. Exemplos comparativos

### 8.1 "Toda alteração deve executar testes e apresentar evidências."

| Implementação | Como | Garantia |
|---|---|---|
| **Mensagem de chat** | "Rode os testes e mostre a saída antes de concluir." | Nenhuma — vale só este turno; o modelo pode esquecer. |
| **CLAUDE.md** | Linha em "Critério de conclusão". | Fraca — contexto, não enforcement; pode ser ignorado. |
| **Skill** | `/verify` com passos de teste. | Média — só quando invocada; reutilizável. |
| **Subagent** | `test-runner` que roda e resume falhas. | Média — bom isolamento; depende de delegação. |
| **Hook `command` (`PostToolUse` Edit/Write)** | Script que roda testes após edições. | **Forte e determinística** — executa sempre, independe do modelo. |
| **Hook `prompt`/`agent` (`Stop`)** | LLM/agent verifica evidência antes de finalizar. | Forte — bloqueia conclusão sem evidência; custa tokens. |
| **CI (GitHub/GitLab)** | Pipeline roda testes no PR/MR. | **Mais forte para o merge** — barra integração; mas só no CI, não localmente. |
| **Combinação recomendada** | Hook `command` local (feedback rápido) + CI (barra o merge) + linha no CLAUDE.md (intenção). | Defesa em camadas. |

**Por que diferem:** chat/CLAUDE.md/skill/subagent são *contexto* (o modelo pode não seguir). Hooks e CI são *determinísticos* (executados pelo cliente/pipeline). Para "deve sempre", a garantia real vem de hook + CI, não de instrução textual.

### 8.2 "Sempre produza respostas curtas, estruturadas e com resumo executivo."

| Implementação | Alcance | Quando escolher |
|---|---|---|
| **Prompt de chat** | Um turno | Necessidade pontual. |
| **Project Instructions (Claude.ai)** | Todos os chats do projeto | Trabalho no Claude.ai dentro de um projeto. |
| **Output style** | Toda resposta da sessão (Claude Code) | Quer mudar tom/formato padrão sem mexer em regras de código. |
| **CLAUDE.md** | Toda sessão do repo | É parte das convenções do projeto e do time. |
| **System prompt (`--append-system-prompt`)** | Invocação/script | One-off em CI/script. |
| **Skill** | Quando invocada | É um formato específico de uma tarefa, não default. |
| **Memória/preferências (Claude.ai)** | Você, todos os chats standalone | Preferência pessoal estável sobre como você gosta de receber respostas. |

**Por que diferem:** formato de resposta é estilo → **Output style** (Claude Code) ou **Preferências/Project Instructions** (Claude.ai) são os lares naturais. CLAUDE.md serve se for convenção de time. Skill só se for um formato pontual. System prompt via CLI serve para automação.

---

## 9. Anti-patterns

- **Tudo no `CLAUDE.md`:** infla o contexto e derruba a aderência (>200 linhas). Mova procedimentos → skill; regras por caminho → `.claude/rules`; docs → Knowledge/arquivo de apoio.
- **Transformar toda regra em skill:** skills são procedimentos sob demanda, não fatos sempre-presentes. Fato estável → CLAUDE.md.
- **Skills genéricas demais:** `description` vaga → não dispara ou dispara errado. Coloque o caso de uso no início; ≤1.536 chars contam.
- **Agentes sem responsabilidade clara:** subagent deve fazer **uma** coisa bem. Sem foco, vira general-purpose mascarado.
- **Duplicar a mesma instrução em várias camadas:** CLAUDE.md + rule + skill dizendo o mesmo gera conflito e desperdício. Defina uma vez, referencie.
- **XML profundamente aninhado sem necessidade:** ruído. Use tags simples para tarefas pequenas.
- **Tool descriptions vagas:** a descrição é a instrução de decisão. Diga quando chamar, quando não, efeitos colaterais e como interpretar o retorno.
- **Prompt onde devia haver validação determinística:** "lembre de rodar lint" no CLAUDE.md ≠ hook `PostToolUse`. Para garantia, use hook/CI.
- **Hook LLM/agent onde um script bastaria:** lint, regex e testes são `command` — mais barato e determinístico.
- **Contexto permanente com documentação enorme:** docs grandes → Project Knowledge (RAG) ou arquivo de apoio da skill (carrega sob demanda), não CLAUDE.md.
- **Instruções conflitantes / exemplos contraditórios:** o modelo escolhe arbitrariamente. Revise CLAUDE.md, rules e few-shots.
- **Misturar conhecimento e política:** conhecimento → Knowledge/rules; política dura → settings/hooks.
- **Confiar em auto memory como fonte oficial:** pode estar obsoleta; é aprendizado do Claude, não verdade canônica.
- **Esconder decisões importantes em chats antigos:** chats de Project não compartilham contexto; promova decisões a Instructions/Knowledge ou CLAUDE.md.
- **Usar agente quando uma chamada direta bastaria:** subagent custa latência e contexto de retorno. Pergunta rápida sobre algo já no contexto → `/btw`.
- **Criar plugin para um prompt isolado:** plugin é contêiner de distribuição. Para um prompt, use skill/command.
- **Sobrescrever o system prompt sem entender o que se perde:** `--system-prompt` descarta tool guidance e safety. Prefira `--append-system-prompt` salvo se a identidade muda totalmente.

---

## 10. Recomendações

1. **Comece pelo eixo enforcement.** Se a regra precisa valer *sempre, sem falha*, ela não é prompt — é **hook** ou **permissão**. Texto é para guiar, não garantir.
2. **Construa em camadas, do estável ao efêmero.** Settings/managed (org) → CLAUDE.md (repo) → rules (caminho) → skills (procedimento) → prompt (turno). Cada camada faz o que a de baixo não deve.
3. **Carregue sob demanda por padrão.** Tudo que não precisa estar em todo turno vira skill ou arquivo de apoio. Reserve o contexto sempre-presente para fatos curtos e críticos.
4. **Uma fonte por instrução.** Evite duplicação entre camadas; referencie por nome/tag.
5. **XML-like proporcional à tarefa.** Tags simples para tarefas pequenas; aninhamento só quando há blocos heterogêneos ou input não confiável a isolar.
6. **Groundedness como restrição dura.** Em todo template: "dado ausente → N/A / null; nunca fabricar". Separe fato de inferência.
7. **Artefatos observáveis > raciocínio privado.** Peça plano, evidências, verificações — não a cadeia de pensamento.
8. **Não confunda os produtos.** Project (Claude.ai) ≠ diretório (Claude Code); skill (Claude.ai) ≠ skill (Claude Code) — verifique compatibilidade; MCP prompt ≠ skill ≠ slash command.
9. **Mantenha.** Revise CLAUDE.md/rules/memória periodicamente; remova obsoleto e conflitante. Audite auto memory via `/memory`.
10. **Defesa em camadas para garantias críticas.** Hook local (rápido) + CI (barra merge) + linha de intenção no CLAUDE.md.

---

## 11. Referências oficiais

> Verificadas em **13/06/2026**. Estabilidade: itens marcados na própria doc como *deprecated/removed/research preview* estão anotados.

| Mecanismo | Fonte oficial |
|---|---|
| Mapa de docs (índice) | `https://code.claude.com/docs/en/claude_code_docs_map.md` |
| Memória / CLAUDE.md / rules / auto memory | `https://code.claude.com/docs/en/memory.md` |
| Skills (+ commands legados) | `https://code.claude.com/docs/en/skills.md` |
| Subagents | `https://code.claude.com/docs/en/sub-agents.md` |
| Output styles | `https://code.claude.com/docs/en/output-styles.md` |
| Hooks (eventos + 5 tipos) | `https://code.claude.com/docs/en/hooks.md` · guia: `.../hooks-guide.md` |
| MCP | `https://code.claude.com/docs/en/mcp.md` |
| Plugins | `https://code.claude.com/docs/en/plugins.md` · ref: `.../plugins-reference.md` |
| Settings / permissões | `https://code.claude.com/docs/en/settings.md` · `.../permissions.md` |
| CLI (flags + 4 system prompt) | `https://code.claude.com/docs/en/cli-reference.md` |
| Headless `-p` / bare | `https://code.claude.com/docs/en/headless.md` |
| Agent SDK — system prompts | `https://code.claude.com/docs/en/agent-sdk/modifying-system-prompts.md` |
| Agent SDK — features (settingSources, CLAUDE.md, skills, hooks) | `https://code.claude.com/docs/en/agent-sdk/claude-code-features.md` |
| Agent SDK — subagents / structured outputs | `.../agent-sdk/subagents.md` · `.../agent-sdk/structured-outputs.md` |
| Agent teams / background agents | `.../agent-teams.md` · `.../agent-view.md` |
| GitHub Actions / GitLab CI | `.../github-actions.md` · `.../gitlab-ci-cd.md` |
| Projects (Claude.ai) | `https://support.claude.com/en/articles/9517075-what-are-projects` · `.../9519177-...` |
| Memória / busca em chats (Claude.ai) | `https://support.claude.com/en/articles/11817273-use-claude-s-chat-search-and-memory...` |
| Padrão Agent Skills | `https://agentskills.io` |
| Auto-conhecimento de produto | `https://docs.claude.com/en/docs/claude-code/overview` · `https://support.claude.com` |

**Notas de status:**
- *SSE transport (MCP):* **deprecado** — preferir HTTP.
- *`/output-style` standalone:* removido (use `/config` ou setting `outputStyle`).
- *Agent teams, channels, fast mode, fullscreen:* *research preview*.
- *Cursor:* não documentado oficialmente como superfície do Claude Code — verifique.
- *MCP `sampling`:* não confirmado como recurso exposto na doc do Claude Code.

---

## 12. Checklist de revisão

```text
[ ] Produto correto? (Claude.ai vs Claude Code vs Agent SDK)
[ ] Enforcement: precisa ser garantido? → hook/permissão/CI, não texto.
[ ] Persistência correta? (turno / projeto / repo / org)
[ ] Carregamento: sempre-presente só se for fato curto e crítico.
[ ] Sem duplicação entre camadas (CLAUDE.md vs rules vs skill).
[ ] Skill com description específica (caso de uso primeiro).
[ ] Subagent com responsabilidade única e tools mínimas.
[ ] Tool MCP com description acionável (quando/efeitos/retorno).
[ ] XML-like proporcional (sem aninhamento gratuito).
[ ] Groundedness declarada (ausente → N/A; sem fabricação).
[ ] Sem conhecimento/política misturados.
[ ] Auto memory não tratada como fonte oficial.
[ ] Decisões importantes promovidas (não escondidas em chats antigos).
[ ] System prompt: append vs replace consciente do que se perde.
[ ] Plugin só para distribuir conjunto (não prompt isolado).
[ ] Itens não confirmados marcados; fontes citadas; data registrada.
```

---

# Apêndices

> Fundamentados nos guias do project (`xml-medium.md`, `anthopic-prompt-guide.md`, `promptguide_ai.md`, `effective-context-engineering-for-ai-agents-compacted.md`) e na doc oficial Anthropic.

## Apêndice A — Catálogo de técnicas com forma XML-like e rationale

> Para cada técnica: **definição · quando usar · quando evitar · forma XML-like · por que a estrutura.**

### A.1 Delimitação XML-like (técnica de estrutura)
- **Definição:** marcar fronteiras semânticas com pares `<tag>...</tag>` para o modelo tratar cada segmento conforme seu papel.
- **Quando usar:** múltiplos componentes (instrução + contexto + dados + exemplos + formato); isolar input não confiável; quando você quer que a saída espelhe a estrutura.
- **Quando evitar:** prompt curto de uma frase; conteúdo já estruturado nativamente (frontmatter, JSON, schema).
- **Por que funciona:** dá ao modelo uma "gramática de prompt"; melhora parsing, evita contaminação entre seções, reduz ambiguidade e aumenta consistência do output. Não precisa ser XML válido.
```xml
<task>
  <instructions>Resuma o artigo.</instructions>
  <article>{{TEXTO}}</article>
  <output-format><summary>...</summary></output-format>
</task>
```

### A.2 Few-shot / multishot
- **Definição:** fornecer 2–5 exemplos canônicos do par entrada→saída desejado.
- **Quando usar:** formato/estilo específico difícil de descrever; classificação; padronização de saída.
- **Quando evitar:** tarefas de raciocínio complexo (few-shot sozinho falha — combine com CoT); quando a diversidade de exemplos não cabe no orçamento de contexto.
- **Por que funciona:** o modelo imita o padrão demonstrado. Use exemplos **diversos e canônicos**, não uma lista de edge cases.
```xml
<examples>
  <example><input>Que filme rad!</input><output>Positivo</output></example>
  <example><input>Que show horrível!</input><output>Negativo</output></example>
</examples>
<input>{{NOVO}}</input>
```

### A.3 Chain-of-Thought (CoT)
- **Definição:** induzir passos intermediários de raciocínio antes da resposta.
- **Variante zero-shot:** acrescentar "pense passo a passo".
- **Quando usar:** aritmética, lógica, raciocínio simbólico/commonsense, decisões com trade-offs.
- **Quando evitar:** tarefas triviais (latência/tokens desnecessários); em modelos de *extended thinking*, prefira instrução geral ("pense profundamente, considere várias abordagens") a passos prescritivos.
- **Por que a estrutura:** separar `<thinking>` de `<answer>` isola o rascunho do resultado e facilita pós-processar só a resposta.
```xml
<thinking>Raciocínio passo a passo.</thinking>
<answer>Resposta final.</answer>
```

### A.4 Tree of Thoughts (ToT)
- **Definição:** gerar N caminhos/abordagens, avaliar e selecionar o melhor (busca com lookahead/backtracking).
- **Quando usar:** problemas que exigem exploração estratégica; quando a primeira abordagem costuma falhar.
- **Quando evitar:** tarefas diretas (custo alto); produção sensível a latência.
- **Por que a estrutura:** tags por caminho deixam a avaliação de trade-offs explícita e comparável.
```xml
<explore>
  <approach id="1">...</approach>
  <approach id="2">...</approach>
  <approach id="3">...</approach>
</explore>
<evaluation>Prós/contras de cada uma.</evaluation>
<selected>Ótimo global + justificativa.</selected>
```

### A.5 Self-Consistency
- **Definição:** amostrar múltiplos raciocínios independentes e tomar o voto majoritário.
- **Quando usar:** tarefas críticas de aritmética/commonsense onde uma única amostra erra.
- **Quando evitar:** rotina barata; quando o custo de N amostras não compensa.
- **Por que a estrutura:** registrar amostras e divergências torna o agregado auditável.
```xml
<self-consistency samples="3">
  <vote>Resposta majoritária.</vote>
  <divergences>Reportar desacordos relevantes.</divergences>
</self-consistency>
```

### A.6 Prompt Chaining
- **Definição:** decompor uma tarefa complexa em subtarefas sequenciais, cada uma em seu prompt/etapa.
- **Quando usar:** múltiplas transformações, síntese de pesquisa, análise de documento, citações.
- **Quando evitar:** tarefa atômica que cabe num prompt.
- **Por que funciona:** cada elo recebe atenção total → mais precisão, clareza e rastreabilidade (isola o passo problemático).
```xml
<step n="1"><objective>Extrair citações relevantes para a pergunta.</objective><output><quotes>...</quotes></output></step>
<step n="2"><objective>Responder usando <quotes> + documento.</objective></step>
```
**No Claude Code:** materialize como **subagents encadeados** ou **skills** invocadas em sequência.

### A.7 Meta-Prompting
- **Definição:** focar na **estrutura/sintaxe** do problema (não no conteúdo específico) e atribuir persona de domínio.
- **Quando usar:** raciocínio/matemática/código onde o formato da solução importa; quer eficiência de tokens vs. few-shot.
- **Quando evitar:** tarefas muito novas onde o modelo não tem conhecimento prévio do padrão.
- **Por que a estrutura:** o template é abstrato e reutilizável; menos tokens que listar exemplos.
```xml
<role>Engenheiro de confiabilidade sênior.</role>
<problem-shape>
  <given>...</given><find>...</find><method>...</method>
</problem-shape>
```

### A.8 Prefilling
- **Definição:** forçar o prefixo da resposta do assistant (ex: abrir com `<thinking>` ou `{`).
- **Quando usar:** forçar formato de saída (JSON, XML) ou início do raciocínio. Disponível em Claude/Gemini.
- **Quando evitar:** com *extended thinking* (indisponível); quando o início rígido limita o modelo.
- **Por que funciona:** ancora o formato desde o primeiro token.
```text
{"role":"assistant","content":"<thinking>"}
```

### A.9 Generated Knowledge
- **Definição:** recuperar/gerar fatos-chave antes de executar a tarefa principal.
- **Quando usar:** quando a resposta depende de fatos que o modelo deve explicitar primeiro.
- **Quando evitar:** fatos já fornecidos no contexto.
- **Por que a estrutura:** separar `<knowledge>` de `<answer>` evita misturar premissa e conclusão.
```xml
<knowledge>Fatos/axiomas necessários.</knowledge>
<answer>Resposta apoiada nos fatos acima.</answer>
```

### A.10 ReAct (Reason + Act)
- **Definição:** intercalar raciocínio e chamadas de tool em loop.
- **Quando usar:** agentes com ferramentas (busca, DB, código).
- **Quando evitar:** tarefa sem tools.
- **No ecossistema Claude:** é o **loop agêntico nativo** do Claude Code/Agent SDK — não precisa simular em texto; controle via tools permitidas, `tool_choice`, hooks.
```xml
<loop>
  <reason>O que fazer e por quê.</reason>
  <act tool="search">query</act>
  <observe>Resultado.</observe>
</loop>
```

### A.11 Reflexion / self-refine / evaluator–optimizer
- **Definição:** auto-crítica (critique → revise) antes da entrega; ou um avaliador separado que pede revisão.
- **Quando usar:** qualidade alta exigida; saída tem critérios verificáveis.
- **Quando evitar:** tarefa trivial; quando o critério não é articulável.
- **Por que a estrutura:** torna a verificação um artefato observável (rubrica + score) em vez de raciocínio oculto.
```xml
<draft>...</draft>
<critique against="constraints">Falhas encontradas.</critique>
<revised>Versão corrigida.</revised>
```
**Garantia real:** para forçar isso sem depender do modelo, use **hook `prompt`/`agent` em `Stop`** ou um **subagent verificador**.

### A.12 Orchestrator–Workers / sub-agents
- **Definição:** um orquestrador planeja e delega a workers especializados, cada um com contexto limpo; integra os retornos.
- **Quando usar:** pesquisa/análise complexa com exploração paralela; separação de responsabilidades.
- **Quando evitar:** tarefa simples (uma chamada direta basta) — multi-agente adiciona latência e contexto de retorno.
- **Por que funciona:** separação de preocupações; workers retornam **resumos condensados (1–2k tokens)**, preservando o contexto do orquestrador.
- **No Claude Code:** subagents (`Agent(...)`), agent teams, fan-out/fan-in. Entradas mínimas e focadas; retornos padronizados.

### A.13 Just-in-time retrieval / progressive disclosure
- **Definição:** manter identificadores leves (paths/links) e carregar dados em runtime, em camadas.
- **Quando usar:** bases grandes; agentes de longo horizonte.
- **Quando evitar:** dado pequeno e sempre necessário (carregue de uma vez).
- **No Claude Code:** **híbrido nativo** — `CLAUDE.md` carrega o essencial; `glob`/`grep`/`Read` navegam sob demanda; skills carregam o corpo só ao invocar; arquivos de apoio carregam quando referenciados.

### A.14 Compaction
- **Definição:** resumir a conversa ao se aproximar do limite e reiniciar a partir do resumo.
- **Quando usar:** tarefas longas que exigem fluxo conversacional.
- **Por que funciona:** combate *context rot* (recall cai com mais tokens). Maximize recall primeiro, depois precisão; descarte tool outputs redundantes.
- **No Claude Code:** auto-compaction nativa; `PreCompact`/`PostCompact` hooks; CLAUDE.md de raiz é reinjetado após `/compact`.

### A.15 Structured note-taking (memória agêntica)
- **Definição:** persistir notas fora da janela de contexto (ex: `NOTES.md`, to-do) e recuperar quando preciso.
- **Quando usar:** desenvolvimento iterativo com marcos; estado/dependências a rastrear.
- **No Claude Code:** **auto memory** (`MEMORY.md`), memória de subagent (`memory: user|project|local`), task lists.

### A.16 Delimitação negativa
- **Definição:** lista explícita do que **não** fazer.
- **Quando usar:** quando há armadilhas conhecidas; segurança; evitar comportamento indesejado recorrente.
- **Por que a estrutura:** tag dedicada evita que o modelo trate a proibição como sugestão.
```xml
<constraints>
  <must-not>Não fabricar dados. Dado ausente → "N/A".</must-not>
  <must-not>Não chamar tools de escrita.</must-not>
</constraints>
```

### A.17 Contrato de saída / schema
- **Definição:** definir o formato exato da saída (JSON/XML/Markdown) e exigir conformidade.
- **Quando usar:** integração programática; parsing automatizado.
- **No Claude Code/SDK:** `--json-schema` e structured outputs **garantem** o schema (vs. instrução textual).
```xml
<output-format>Apenas JSON conforme o schema. Sem preâmbulo, sem cercas.</output-format>
```

### A.18 Groundedness / mitigação de alucinação
- **Definição:** autorizar explicitamente "não sei"; restringir a fatos fornecidos; exigir citação quando *grounded* em documentos.
- **Quando usar:** sempre que precisão factual importa (regra dura no perfil deste catálogo).
- **Por que a estrutura:** tag dedicada deixa a política inequívoca.
```xml
<grounding>
  Use só os dados de <input>. Lacuna → "Informação insuficiente". Cite proveniência.
</grounding>
```

### A.19 System prompt no "right altitude"
- **Definição:** específico o bastante para guiar, flexível o bastante para heurísticas — nem lógica hardcoded frágil, nem vago demais.
- **Quando usar:** definição de comportamento de agente.
- **Por que a estrutura:** seções distintas (`<background>`, `<instructions>`, `## Tool guidance`) via XML/Markdown organizam o orçamento de atenção.
- **Princípio-mãe:** o **menor conjunto de tokens de alto sinal** que maximiza o resultado. Comece mínimo; adicione com base em modos de falha observados.

## Apêndice B — Por que cada tag XML-like nos templates

> Toda tag isola um *papel*. Os ganhos genéricos: melhor parsing, fronteira anti-contaminação, redução de ambiguidade, espelhamento do output e camada anti-injeção para dados não confiáveis.

| Tag | Papel que isola | Por que existe |
|---|---|---|
| `<task>` | Envelope da tarefa | Agrupa tudo num bloco; o modelo sabe onde a tarefa começa/termina. |
| `<objective>` | A meta | Concentra a intenção numa frase verificável (evita instrução diluída). |
| `<context>` / `<background>` | Enquadramento | Separa "pano de fundo" de "o que fazer" — não vira instrução por engano. |
| `<input>` / `<user_input>` / `<article>` | Dado a processar | **Camada anti-injeção:** sinaliza "isto é dado, não comando". Sanitizar `<`,`>`,`&`. |
| `<instructions>` | Comandos do sistema | Domínio confiável, distinto do input — defende contra "ignore as instruções acima". |
| `<constraints>` / `<must>` / `<must-not>` | Limites e proibições | Tag dedicada evita que restrição seja lida como sugestão. |
| `<process>` / `<step n>` | Sequência de execução | Ordena passos; habilita CoT/chaining sem misturar com a resposta. |
| `<thinking>` | Rascunho de raciocínio | Isola o raciocínio do resultado; permite descartá-lo no pós-processo. |
| `<answer>` / `<output>` | Resultado final | Alvo de extração limpo; o modelo "mira" nesta tag. |
| `<output-format>` | Contrato de saída | Condiciona o formato; o modelo espelha a estrutura pedida. |
| `<examples>` / `<example>` | Demonstrações | Delimita few-shot; impede que exemplos sejam confundidos com o pedido real. |
| `<role>` | Identidade/persona | Fixa o ponto de vista (meta-prompting) no topo. |
| `<grounding>` | Política anti-alucinação | Torna a regra "não fabricar / citar" inequívoca. |
| `<rule>` + `paths` | Regra escopada | Casa com rules por caminho; ativa só onde relevante. |
| `<agent>` / `<responsibility>` | Escopo do subagent | Responsabilidade única explícita; reduz deriva de função. |
| `<return-format>` | Contrato de retorno do worker | Padroniza o que volta ao orquestrador (resumo condensado). |
| `<handoff>` / `<to>` / `<expected-return>` | Transferência entre agentes | Define entrada mínima e retorno esperado; reduz contexto trafegado. |
| `<audit>` / `<rubric>` / `<gate>` | Verificação | Materializa Reflexion/evaluator como artefato observável e pontuável. |
| `<fan-out>` / `<fan-in>` | Paralelismo | Marca ramos independentes e o ponto de síntese (map-reduce). |
| Atributos (`id=`, `language=`, `doc_ref=`) | Metadado do bloco | Distingue itens irmãos e referencia entre blocos sem ambiguidade. |

**Regras de ouro de naming (dos guias):** nomes semânticos (`<article_to_analyze>` > `<text1>`); **consistência** do esquema na sessão; **evitar aninhamento excessivo**; posicionar instruções primárias em tag dedicada no topo; referenciar a tag pelo nome ao falar do conteúdo ("usando o texto em `<input>`...").

## Apêndice C — Caso de uso → técnicas aplicáveis

| Caso de uso | Técnicas recomendadas | Observação |
|---|---|---|
| **Extração estruturada / parsing** | Contrato de saída + Groundedness + Delimitação XML | Use `--json-schema` p/ garantia; campo ausente → `null`. |
| **Raciocínio complexo (matemática/lógica)** | CoT (geral primeiro) → ToT se 1ª abordagem falha; Self-Consistency se crítico | Em extended thinking, instrução geral > passos prescritivos. |
| **Classificação / rotulagem** | Few-shot canônico + Delimitação negativa | Exemplos diversos, não edge cases. |
| **Pesquisa multi-fonte** | Prompt chaining + Orchestrator–workers + Just-in-time retrieval + Groundedness | Workers retornam resumos condensados; cite proveniência. |
| **Code review** | Meta-prompting (persona) + Delimitação negativa + Contrato de saída | Subagent read-only (`tools: Read,Grep,Glob,Bash`). |
| **Debugging** | CoT + ReAct (tools) + Reflexion | Causa-raiz + fix mínimo + verificação. |
| **Implementação de feature** | Planning (plan-then-execute) + ReAct + verificação observável | Plan mode; testes como evidência; hook/CI p/ garantia. |
| **Geração de documentação** | Generated knowledge + Groundedness + Contrato de saída | Documente só o que o código suporta. |
| **Decisão crítica / trade-offs** | ToT + Self-Consistency + Reflexion | Apresente prós/contras e selecione ótimo global. |
| **Tarefa long-horizon (migração/refator)** | Compaction + Note-taking + Orchestrator–workers | Combate context rot; estado em `NOTES.md`/auto memory. |
| **Input não confiável (e-mail/web)** | Delimitação XML (isolar `<input>`) + sanitização + least privilege | Defesa em camadas; tags não bastam sozinhas. |
| **Conteúdo criativo / subjetivo** | Meta-prompting leve; **evite** XML profundo, CoT rígido, schema duro | Estrutura excessiva sufoca; deixe espaço ao modelo. |
| **Geração de saída visual/relatório** | Note-taking + script bundling (skill) | Skill roda script; HTML/diagrama como artefato. |

## Apêndice D — Matriz: técnica × superfície (onde mora melhor)

> `✓` = encaixe natural · `~` = possível com adaptação · `–` = não é o lar da técnica.
> Superfícies: **Prompt** (chat/turno) · **CLAUDE.md** · **Skill** · **Subagent** · **Hook** · **Output style** · **MCP** · **SDK/CLI**.

| Técnica | Prompt | CLAUDE.md | Skill | Subagent | Hook | Output style | MCP | SDK/CLI |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Delimitação XML | ✓ | ~ | ✓ | ✓ | ~ (prompt/agent) | ✓ | ✓ (desc) | ✓ |
| Few-shot / multishot | ✓ | ~ (curto) | ✓ (arquivo de apoio) | ✓ | – | ~ | – | ✓ |
| CoT | ✓ | – | ✓ | ✓ | ~ (agent) | ~ | – | ✓ |
| ToT | ✓ | – | ✓ | ✓ | ~ (agent) | – | – | ✓ |
| Self-Consistency | ✓ | – | ✓ | ✓ | – | – | – | ✓ |
| Prompt chaining | ~ | – | ✓ (skills em sequência) | ✓ (encadeados) | – | – | – | ✓ |
| Meta-prompting (persona) | ✓ | ~ | ✓ | ✓ (system prompt) | – | ✓ | – | ✓ |
| Prefilling | ✓ | – | – | – | – | – | – | ✓ (API/SDK) |
| Generated knowledge | ✓ | – | ✓ (`!`cmd``) | ✓ | – | – | ✓ (resource) | ✓ |
| ReAct (tools) | ~ | – | ✓ | ✓ | – | – | ✓ (tools) | ✓ |
| Reflexion / evaluator | ~ | – | ✓ | ✓ (verificador) | ✓ (Stop) | – | – | ✓ |
| Orchestrator–workers | – | – | ~ | ✓ | – | – | – | ✓ |
| Just-in-time retrieval | – | ✓ (híbrido) | ✓ (corpo sob demanda) | ✓ | – | – | ✓ (resource) | ✓ |
| Compaction | – | ~ (reinjeção) | – | ✓ | ✓ (Pre/PostCompact) | – | – | ✓ |
| Note-taking (memória) | – | ~ | ✓ | ✓ (`memory:`) | ✓ (escrita) | – | – | ✓ |
| Delimitação negativa | ✓ | ✓ | ✓ | ✓ | ✓ (deny) | ✓ | ✓ (desc) | ✓ |
| Contrato de saída / schema | ✓ | – | ✓ | ✓ | ~ | ~ | ✓ (schema) | ✓ (`--json-schema`) |
| Groundedness | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (desc) | ✓ |
| System prompt "right altitude" | – | ~ | – | ✓ | – | ✓ | – | ✓ |

**Leitura da matriz:** técnicas de **raciocínio** (CoT/ToT/Self-Consistency) vivem no **texto do prompt/skill/subagent** — não em CLAUDE.md (que é fato, não procedimento) nem em settings. Técnicas de **garantia** (Reflexion forçada, contrato de saída, delimitação negativa dura) ganham *enforcement* só em **hook/SDK/schema**. Técnicas de **contexto** (just-in-time, compaction, note-taking) são majoritariamente **nativas** do Claude Code — você as configura, não as escreve em prosa.
