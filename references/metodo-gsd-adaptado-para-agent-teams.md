# Método GSD-adaptado aplicado a Agent Teams — fundamentação teórica

> Documento conceitual. Não traz configuração, arquivos `.claude/` nem settings — só os princípios, os mapeamentos e os trade-offs. "GSD-adaptado" é o método que derivamos da recomendação do GPT sobre o Open GSD Core (Discuss → Plan → Execute → Verify → Ship; Milestone → Phase → Plan → Task; gates humanos; roteamento de modelo; PLAN.md auditável; waves de arquivos disjuntos; mecânico em hook).

---

## 1. A distinção que organiza tudo: disciplina vs. substrato

O erro de enquadramento mais comum é tratar "método GSD" e "Agent Teams" como alternativas concorrentes. Eles operam em planos diferentes:

- **O método GSD-adaptado é uma disciplina.** Ele responde *como* o trabalho é decomposto, *onde* ficam os pontos de decisão humana, *qual* modelo faz cada coisa e *como* tudo fica auditável. É agnóstico de substrato — pode rodar sobre uma sessão única, sobre subagentes, ou sobre um time.
- **Agent Teams é um substrato de execução.** Ele responde *com o quê* o trabalho paralelo roda: um lead, teammates independentes, uma task list compartilhada e um mailbox para comunicação direta entre eles.

Disso decorre a tese deste documento: a comparação útil não é "GSD ou Teams", e sim **"Teams cru" vs. "Teams + disciplina GSD"**. A disciplina é uma camada que se aplica sobre o substrato. A pergunta de eficiência é se essa camada paga o próprio custo.

---

## 2. Os dois objetos, em síntese

### 2.1 O método GSD-adaptado (princípios)

1. Loop fixo Discuss → Plan → Approve → Execute → Verify → Ship, com hierarquia Milestone → Phase → Plan → Task.
2. **Gates humanos** em cada nível (roadmap, breakdown, plano, transição). É o ponto onde a pessoa segura a decisão.
3. **Waves de arquivos disjuntos**: só paralelizam planos cujos conjuntos de arquivos não se cruzam; tasks que tocam o mesmo arquivo são sequenciadas.
4. **Roteamento de modelo explícito**: o modelo forte raciocina (planejamento), o modelo eficiente executa, e o trabalho determinístico não usa modelo nenhum (vira hook/script).
5. **Auditabilidade**: cada task declara responsável, modelo, esforço, wave, dependências e arquivos; o estado vive em markdown versionado.
6. **Triagem**: a maquinaria completa só é acionada quando o trabalho é longo, multi-arquivo e decomponível.

### 2.2 Agent Teams (modelo)

1. Um **lead** coordena; **teammates** trabalham em contexto próprio e independente.
2. Coordenação por **task list compartilhada** (auto-reivindicação da próxima task livre; dependências desbloqueiam sozinhas; file locking na reivindicação) e por **mailbox** (mensagens diretas entre agentes e da pessoa para qualquer um).
3. **Aprovação mediada pelo lead**: com "require plan approval", o teammate fica em plan mode até o lead aprovar — e quem aprova é o lead, autonomamente; a pessoa influencia por critérios no prompt.
4. **Gates por hook**: eventos como TeammateIdle, TaskCreated e TaskCompleted podem bloquear e devolver feedback.
5. **Sem isolamento por worktree**: o particionamento de arquivos é responsabilidade de quem desenha o trabalho.
6. **Modelo por teammate**: a definição de subagente honra modelo e ferramentas.
7. Experimental: um time por vez, lead fixo pela vida do time, sem sub-times, custo de tokens crescente com o número de teammates.

---

## 3. Mapeamento: cada princípio GSD sobre o substrato Teams

A tabela é o coração do documento. Para cada princípio do método, qual mecanismo de Teams o realiza — e onde há atrito.

| Princípio GSD | Mecanismo correspondente em Agent Teams | Atrito / perda |
|---|---|---|
| Hierarquia Phase → Plan → Task | Lead decompõe em tasks na task list compartilhada | Teams é plano de tasks, não de fases aninhadas; a estrutura de fases vive na cabeça do lead ou num doc que ele mantém |
| Gates humanos por nível | "Require plan approval" + a pessoa observando e steerando o lead | A aprovação é do lead, não da pessoa; o gate humano deixa de ser nativo e vira "a pessoa instrui o lead com critérios" |
| Waves de arquivos disjuntos | Lead atribui conjuntos de arquivos diferentes por teammate; file locking na task list | **Sem worktree**: a disjunção deixa de ser garantida por isolamento e passa a depender da disciplina de particionamento |
| Roteamento de modelo | Modelo definido por teammate (forte no que raciocina, eficiente no que executa) | Funciona bem; o lead tende a ser o "forte" e os executores, eficientes |
| Mecânico = sem modelo | Hooks TaskCreated/TaskCompleted disparando scripts determinísticos | Funciona, mas o trabalho mecânico ainda costuma passar por um teammate que custa tokens, a menos que você force o hook |
| Auditabilidade (PLAN.md + STATE.md) | Task list compartilhada + um doc de planejamento que o lead mantém | Menos estruturado; o "estado" do time é mais efêmero e some ao limpar o time |
| Triagem (só orquestrar quando vale) | Decisão de criar ou não um time | Idêntico em espírito; cabe à pessoa não ligar um time para trabalho sequencial |

A leitura geral: **quatro dos sete princípios mapeiam bem** (hierarquia parcial, roteamento, mecânico, triagem), e **três sofrem perda** ao migrar para o substrato Teams — gates humanos (viram mediados), waves disjuntas (perdem o worktree) e auditabilidade (fica efêmera). São justamente esses três que a disciplina precisa compensar manualmente.

---

## 4. Onde a disciplina torna o time mais eficiente

A camada GSD paga o próprio custo quando o trabalho é interdependente e arriscado, por quatro mecanismos:

1. **Reduz retrabalho de colisão.** O pior modo de falha de um time sem worktree é dois agentes editarem o mesmo arquivo e se sobrescreverem, ou implementarem o mesmo pedaço duas vezes. A regra de arquivos disjuntos por wave ataca isso na origem. Em termos de eficiência, é o ganho de não pagar tokens de execução duas vezes nem gastar uma rodada de merge resolvendo conflito evitável.

2. **Falha barato no gate.** Um plano ruim aprovado pelo lead custa o ciclo inteiro de execução do time antes de você perceber. Um gate humano antes da execução custa apenas tokens de planejamento. A disciplina move o ponto de falha para a fase mais barata.

3. **Corta tokens por unidade de trabalho.** No time cru, o custo cresce linearmente com o número de teammates, e tudo passa por um modelo. O roteamento concentra o modelo caro no raciocínio e o eficiente no volume; o mecânico-em-hook tira trabalho determinístico do orçamento de modelo por completo.

4. **Evita overhead em trabalho que não pede time.** A triagem impede o cenário em que você paga coordenação e tokens de um time para uma tarefa que uma sessão única faria mais rápido e mais barato.

Em uma frase: a disciplina troca um pouco de cerimônia (gates, contrato de plano, particionamento) por uma grande redução de retrabalho e de tokens desperdiçados — um bom negócio quando o custo do erro é alto.

---

## 5. Onde o time puro ganha, e onde a disciplina vira peso morto

A camada GSD **não** é gratuita, e há regimes em que ela atrapalha:

1. **Exploração de decomposição emergente.** Quando o próprio recorte do problema só fica claro durante a investigação (hipóteses concorrentes de debug, negociação entre camadas, pesquisa), a auto-organização do time — teammates reivindicando tasks e conversando pelo mailbox — é mais eficiente que um plano de waves pré-calculado. Aqui o GSD tenta fixar cedo demais algo que deveria emergir.

2. **Tarefas pequenas e médias.** O custo fixo da disciplina (rodada de planejamento, gates, contrato de task) pode superar o que ela economiza. Ligar um time é leve; impor a disciplina inteira por cima, não.

3. **Trabalho genuinamente colaborativo.** O diferencial do Teams é a comunicação entre agentes. Um método que reduz cada agente a um executor isolado de um plano fixo joga fora exatamente o que torna o time um time.

A regra prática: quanto mais o problema é *executar uma decomposição conhecida*, mais a disciplina ajuda; quanto mais é *descobrir a decomposição*, mais o time cru ajuda.

---

## 6. Tensões herdadas do substrato

Ao escolher Teams como base, alguns limites do substrato passam a valer independentemente da disciplina, e a teoria precisa reconhecê-los:

- **Ausência de worktree.** É a tensão central. A disciplina GSD foi pensada com isolamento por worktree convertendo corrupção silenciosa em conflito visível. Sobre Teams, esse mecanismo não existe; a disjunção de arquivos vira uma promessa do plano, não uma garantia da infraestrutura. A disciplina fica mais frágil aqui do que sobre subagentes.
- **Aprovação mediada.** O gate humano por nível, que é o pedaço mais valioso da disciplina, não tem equivalente nativo: o lead aprova. Você o aproxima dando critérios fortes ao lead e observando, mas perde a garantia de "nada avança sem o meu OK explícito".
- **Estado efêmero.** A auditabilidade depende de o lead manter um documento de planejamento e de você não perder o estado ao limpar o time. Não há um STATE.md durável por construção.
- **Restrições experimentais.** Um time por vez, lead fixo, sem sub-times. Isso limita a hierarquia Milestone → Phase → Plan a uma profundidade rasa: você não aninha times para representar fases.

---

## 7. Síntese: quando cada um vence

A disciplina GSD aplicada a Agent Teams é mais eficiente que o time cru **quando todas estas condições valem**: o trabalho é de código interdependente, o custo de um erro de plano é alto, a decomposição é conhecível de antemão, e os conjuntos de arquivos podem ser particionados de forma limpa. Nesse regime, gates baratos + waves disjuntas + roteamento + mecânico-em-hook reduzem retrabalho e tokens o suficiente para pagar a cerimônia.

O time cru é mais eficiente **quando**: a decomposição é exploratória e emerge no caminho, a tarefa é pequena o bastante para o overhead da disciplina não compensar, ou o valor está na conversa entre agentes mais do que na execução de um plano fixo.

E há um corolário importante: como a maior fragilidade de aplicar GSD sobre Teams é a perda do worktree, em muitos casos o substrato mais coerente com a disciplina não é Teams, e sim **subagentes com isolamento por worktree** — que preservam a disjunção por infraestrutura. Teams entra quando você precisa, além da disciplina, da comunicação direta entre agentes; caso contrário, a disciplina rende mais sobre um substrato que já isola.
