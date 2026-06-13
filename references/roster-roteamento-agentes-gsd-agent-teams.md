# Roster e roteamento de agentes — método GSD-adaptado sobre Agent Teams (definições)

> Documento de definições. Companheiro do doc teórico `metodo-gsd-adaptado-para-agent-teams.md`: enquanto aquele explica *por que* a disciplina se aplica ao substrato Teams, este define *quem são os agentes e qual modelo cada um usa*. Lê-se junto.

---

## 1. Princípio de roteamento

Uma única regra organiza todo o roster:

**Coloque o modelo forte onde o erro é caro; quanto menor o esforço do executor, maior a especificação que ele recebe.**

Disso decorrem duas leituras:

- O raciocínio caro (decompor, decidir arquitetura, recuperar de falha) fica no topo (lead Opus; Opus de fallback). O volume bem-especificado fica no Sonnet. O determinístico-com-leitura fica no Haiku.
- O default é **Sonnet em esforço `medium`** justamente porque ele recebe o máximo de detalhe: como o orçamento de raciocínio é baixo, a task chega tão especificada que sobra pouco a decidir. Esforço baixo e spec alta são duas faces da mesma escolha.

Opus que não seja o lead é **exceção** — nunca o caminho padrão.

---

## 2. O roster

| Papel | Modelo | Esforço | Quando | Escopo de tools |
|---|---|---|---|---|
| **team-lead** | Opus | `high` (`xhigh` em planejamento difícil) | sempre o lead; decompõe, atribui, aprova planos de teammate, escala | coordenação do time, Read, Bash leve, sem Write de produção |
| **sonnet-executor** (default) | Sonnet | `medium` | implementação bem-especificada, mudança localizada, testes, doc técnica | Read, Write, Edit, Bash, Grep, Glob |
| **sonnet-executor-high** | Sonnet | `high` | tratável por Sonnet, mas mais delicado (integração entre módulos, refator localizado) | Read, Write, Edit, Bash, Grep, Glob |
| **haiku-runner** | Haiku | — (Haiku não tem `effort`) | rodar comandos e reportar a saída: builds, testes, lint, migração, coleta de logs | Bash, Read, Grep — **sem Write/Edit** |
| **opus-fallback** (último recurso) | Opus | `high`/`xhigh` | alto risco, alta complexidade, ou recuperação de task em que o Sonnet falhou | Read, Write, Edit, Bash, Grep, Glob |

Notas de modelo: a base de chat é indiferente — o que importa é o lead rodar em Opus. Nenhum teammate recebe a tool de spawn (Teams não aninha sub-times). O `haiku-runner` lê e reporta, mas não edita.

---

## 3. Definição de cada papel

### team-lead (Opus, sempre)
O cérebro. Decompõe o trabalho em tasks de arquivos disjuntos, atribui cada uma ao teammate certo pela escada da §4, aprova os planos dos teammates (em "require plan approval") e é quem escala uma task para o `opus-fallback` quando o Sonnet falha. Não escreve código de produção — coordena. É fixo pela vida do time (Teams não troca de lead), então o time precisa nascer com a sessão em Opus.

### sonnet-executor (Sonnet `medium`) — o cavalo de batalha
O executor padrão. Recebe uma task com o **máximo de detalhe** (contrato da §5) e a implementa sem precisar tomar decisões de arquitetura. Esforço `medium` mantém o custo baixo; a especificação compensa o orçamento de raciocínio reduzido. A maioria das tasks deveria cair aqui.

### sonnet-executor-high (Sonnet `high`)
Mesmo perfil de tools, mas para tasks que ainda são de Sonnet e exigem mais raciocínio: integração entre módulos, refator que toca contratos, lógica com mais ramos. Sobe o esforço, não o modelo.

### haiku-runner (Haiku)
Roda comandos e devolve a leitura do resultado: "rode os testes e diga o que falhou", "aplique a migração e reporte", "colete o log e resuma o erro". É a interpretação de baixo risco — não decide, não implementa, não corrige. Fronteira importante: se o comando é totalmente predeterminado e **ninguém precisa ler a saída**, isso rende mais como hook/script do que como um teammate Haiku (um teammate tem custo fixo de contexto). O `haiku-runner` ganha o lugar quando há "rode **e** me diga o que aconteceu".

### opus-fallback (Opus, último recurso)
Só entra em três situações: a task é de alto risco intrínseco (segurança, dado irreversível, mudança ampla), é de alta complexidade que o Sonnet não dá conta, ou um teammate Sonnet **já tentou e falhou** em implementá-la. Nunca é a primeira escolha para uma task nova. Quando entra por falha, recebe o histórico do que o Sonnet tentou e por que falhou.

---

## 4. Escada de complexidade → roteamento

O lead classifica cada task e a coloca no degrau mais baixo que a resolve:

1. **Rodar e reportar** (build, teste, lint, migração, log) → `haiku-runner`.
2. **Implementação bem-especificada** (a maioria) → `sonnet-executor` (medium).
3. **Tratável mas delicada** (integração, refator de contrato) → `sonnet-executor-high`.
4. **Alto risco / alta complexidade** → `opus-fallback` direto (pula o Sonnet, por decisão consciente do lead).

A direção padrão é começar baixo. Subir de degrau é decisão explícita do lead, registrada na task.

---

## 5. Contrato de "máximo de detalhe" (o que toda task de Sonnet carrega)

Como o `sonnet-executor` roda em esforço `medium`, a task precisa chegar quase sem ambiguidade. O lead garante que cada uma traga:

- **Objetivo** em uma frase: o que existe ao final.
- **Arquivos** exatos a tocar — e o conjunto tem que ser **disjunto** dos das outras tasks da mesma rodada (sem worktree, isto é o que evita sobrescrita).
- **Entradas e saídas**: contratos, tipos, formatos.
- **Critérios de aceite** verificáveis (o que o `haiku-runner` ou o verifier vão checar).
- **Restrições e o que NÃO tocar**.
- **Exemplos** ou referência a um padrão já existente no codebase, quando houver.

Regra: se o lead não consegue escrever isso, a task ainda não está pronta para um Sonnet `medium` — ou ela sobe para `sonnet-executor-high`, ou volta para decomposição.

---

## 6. Regra de escalonamento (Sonnet → Opus)

O `opus-fallback` por falha segue um gatilho explícito, não "feeling":

1. Um `sonnet-executor`/`-high` entrega a task.
2. O verifier (ou o `haiku-runner` rodando os critérios de aceite) reprova.
3. O lead devolve uma vez, com o motivo da reprovação, para o mesmo Sonnet tentar de novo.
4. Reprovou a segunda vez → o lead **escala a task** para o `opus-fallback`, passando o histórico das duas tentativas e os erros.

O escalonamento é **por task**, último recurso, e fica registrado (qual task, quantas tentativas, por que subiu). Isto preserva a auditabilidade da disciplina GSD e impede que "subir pra Opus" vire o caminho fácil que detona o orçamento.

---

## 7. Como isto assenta em Agent Teams

- **Lead = Opus na criação.** O lead é a sessão que cria o time e é fixo pela vida dele. Esteja em Opus ao criar o time; o modelo do chat anterior é irrelevante.
- **Teammates via definição de subagente.** Teams honra `model` e `tools` da definição de cada teammate, e `effort` no frontmatter. É assim que `sonnet-executor`, `-high`, `haiku-runner` e `opus-fallback` ganham seus modelos e esforços.
- **Não setar `CLAUDE_CODE_SUBAGENT_MODEL`.** Essa env var sobrescreve o modelo de **todos** os subagentes e teammates, ignorando o frontmatter — ou seja, ela mata o roteamento deste roster. Deixe-a fora (ou em `inherit`).
- **Sem worktree → particionamento é obrigação do lead.** Como Teams não isola em worktree, a disjunção de arquivos da §5 deixa de ser garantida por infraestrutura e passa a depender do lead atribuir conjuntos diferentes e respeitar o file locking da task list.
- **Concorrência baixa.** Custo de tokens cresce com o número de teammates; fique em 3–5 ativos. O `haiku-runner` é barato, mas continua sendo uma sessão.
- **Esforço por modelo.** `medium`/`high` valem para Sonnet; `high`/`xhigh` para Opus; Haiku ignora esforço. Não especifique níveis que o modelo não suporta — eles caem para o mais alto suportado.

---

## 8. Restrições herdadas

Valem aqui todas as tensões do substrato listadas no doc teórico (§6 de lá): aprovação mediada pelo lead em vez de gate humano nativo, estado efêmero do time, um time por vez e sem aninhamento, e a ausência de worktree como a fragilidade central. Este roster não as resolve — ele opera dentro delas, e por isso concentra tanto esforço no contrato de detalhe (§5) e no particionamento pelo lead (§7): são eles que substituem, na disciplina, o que o worktree daria de graça em outro substrato.
