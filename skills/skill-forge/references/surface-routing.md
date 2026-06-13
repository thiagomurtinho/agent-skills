# Surface-Fit Routing

Loaded during **GAP-FILL**, before SELECT. Answers the question the prompting-surface catalog puts *first*, and that skill-forge must not skip: **is this even a skill?** A skill is context the agent reads and *tries* to follow — it is never a hard guarantee. Forging a skill for something that belongs elsewhere is the catalog's most common anti-pattern ("turning every rule into a skill"). Route the request to its real home before drafting.

This check is cheap and saves the user from a skill that under-triggers, duplicates a fact, or silently fails to enforce. Run it once, state the verdict in one line, then proceed (or redirect).

## 1. Enforcement first

If the rule must hold **every time, regardless of what the model decides**, it is not a skill. Skills — like CLAUDE.md, rules, output styles, and memory — are *advisory context*. Determinism comes only from the client/pipeline layer.

| The request really needs… | Its home | Why not a skill |
|---|---|---|
| A guarantee that always fires (lint, test gate, block a path/command) | **Hook** (`command`/`prompt`/`agent`) or **permissions** in `settings.json` | A skill is read and may be ignored; hooks/permissions are executed by the client. |
| A guarantee at merge time | **CI** (GitHub Actions / GitLab) | Runs in the pipeline, not the model's discretion. |

When the user wants "always run X," a skill can *describe* X, but say plainly that the guarantee lives in a hook/CI, not the skill. Offer the layered defense (hook local + CI + a line of intent), don't pretend the skill enforces it.

## 2. Is it a skill, or a neighbor surface?

Once enforcement is settled, a skill is the right home only for a **reusable procedure that runs in the main context and loads on demand**. Everything else has a better address:

| If the instruction is… | Route to | Tell-tale |
|---|---|---|
| A **stable fact** about the repo (architecture, build/test commands, conventions, constraints) | **CLAUDE.md** (`./CLAUDE.md` or `~/.claude/CLAUDE.md`) | "It's always true," not "here's how to do a task." A fact, not a procedure. |
| A fact scoped to **one path/glob** | **`.claude/rules/`** with frontmatter `paths:` | Only relevant when editing `src/api/**`, etc. Loads on path match. |
| A change to **tone / format / role of every reply** | **Output style** | "Always answer like X" — modifies the system prompt session-wide, not a task. |
| Work needing an **isolated context or restricted tool set**, returning a summary | **Subagent** (`.claude/agents/`) | Verbose work whose output you won't reuse; single responsibility; read-only or tool-limited. |
| Access to an **external system** (API/DB/SaaS) | **MCP** (tool/resource/prompt) | Needs a server, not a document. The tool *description* is the prompt. |
| A **bundle to distribute** (skills + agents + hooks + MCP together) | **Plugin** | A container, not a prompt. Never a plugin for one isolated procedure. |
| A **permission/model/sandbox** setting | **`settings.json`** | Deterministic config, not natural-language behavior. |
| A one-off for a **script/CI** run | **CLI** `--append-system-prompt` / `claude -p` | Not reusable enough to package. |

A request can split: the *procedure* becomes a skill, while a *fact* it relies on goes to CLAUDE.md and a *guarantee* goes to a hook. Forge the skill, and name the companions.

## 3. Confirmed skill

Proceed to SELECT when all hold:

- It is a **procedure/workflow**, not a standalone fact.
- It is **reusable** (worth packaging vs. a one-turn prompt).
- It runs in the **main context** (else → subagent) and you want it **loaded on demand** (else → CLAUDE.md).
- Any "must-always" guarantee inside it is acknowledged as advisory, or paired with a hook/CI.

## 4. On mismatch

Don't silently forge anyway. State the better home in one line and offer the choice:

> "This is a stable repo fact, not a procedure — it belongs in CLAUDE.md, where it loads every session instead of only when invoked. Want that instead, or a skill anyway?"

If the user insists on a skill, forge it — but record the limitation (e.g. "this can't *guarantee* the check; a `PostToolUse` hook would"). The catalog's rule: one instruction, one home; don't duplicate the same rule across CLAUDE.md + rule + skill.
