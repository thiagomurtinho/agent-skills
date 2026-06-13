# Technique Arsenal (curated)

Loaded during **SELECT**. Pick techniques by task type. The arsenal is filtered for *skill authoring* — a skill is a static procedure document, so runtime-only reasoning mechanics are deliberately excluded. Inject INCLUDED by need, CONDITIONAL only when its gate is met, never inject EXCLUDED.

## Classify first

| Task type | Typical fit |
|---|---|
| Deterministic transform / extraction (files, data, code) | output template, validation loop, plan-validate-execute, bundled scripts, groundedness, few-shot |
| Multi-step workflow with dependencies | checklist, validation loop, gotchas |
| Multi-tool / agentic skill | ReAct (conditional), default+escape-hatch, gotchas |
| Open-ended design / architecture | Tree-of-Thoughts (conditional), calibrated freedom |
| Subjective / creative (writing, design) | escape hatch (clean Markdown), few-shot exemplars, minimal prescription, usually no test cases |
| Domain expert procedure | meta-prompt persona (conditional), gotchas, references by variant |

## INCLUDED — native to skills

| Technique | Inject when | Form in the skill |
|---|---|---|
| Progressive disclosure | Always (sizing rule) | Lean `SKILL.md`; detail in `references/` with explicit "load when X" triggers. |
| Pushy description | Always | Imperative, intent-framed, lists non-obvious trigger contexts. |
| Imperative + explain-why | Always | Commands, but state the purpose so the model generalizes. |
| Calibrated control | Always (meta) | Prescribe fragile/destructive steps exactly; give freedom elsewhere. |
| Gotchas section | Environment-specific traps that defy reasonable assumptions exist | Concrete corrections, kept in `SKILL.md` so the agent reads them before the trap. |
| Output template | Output format must be consistent | Concrete skeleton the agent pattern-matches against; long/optional ones go in `assets/`. |
| Checklist | Multi-step workflow with skip-risk or validation gates | `- [ ]` progress list. |
| Validation loop | Work is self-checkable | do → validate → fix → repeat until pass. |
| Plan-validate-execute | Batch or destructive operations | emit plan → validate against source of truth → only then execute. |
| Bundled scripts | Same deterministic logic reinvented every run | tested script in `scripts/`, referenced from `SKILL.md`. |
| Few-shot examples | Format/pattern is easier shown than described | 1-5 diverse Input→(reasoning)→Output cases. |
| Default + escape hatch | Multiple valid tools/approaches | one default with brief mention of the alternative; never an equal-options menu. |
| Groundedness | Fabrication risk (factual answers, extraction) | "Missing data → declare 'N/A'/'insufficient'. Never invent." Cite sources when grounded in documents. |
| Domain organization | One skill spans multiple frameworks/variants | `references/<variant>.md`; agent reads only the relevant file. |

## CONDITIONAL — gated, never default

| Technique | Gate (inject only if true) | Note |
|---|---|---|
| Reflexion / self-critique | Output is subjective AND high-stakes, and a plain validation loop can't check it | One critique→revise pass. Don't stack ceremonial self-critique on tasks a validator already covers. |
| Tree-of-Thoughts | Genuinely open design task with real trade-offs between distinct approaches | "Generate N approaches → weigh trade-offs → select." Overkill for procedural skills; do not force into every skill. |
| Meta-prompt persona | A specific expert framing measurably changes output quality | e.g. "Act as a staff-level X." Skip when it's decorative. |
| ReAct | Skill drives tools in a loop where reasoning must interleave with actions | reason→act→observe→repeat. Irrelevant to non-tool skills. |

## EXCLUDED — do not bake into a SKILL.md

These are runtime/agent-harness/API mechanics, not portable skill content. A skill is loaded into an already-configured agent; these belong to that configuration, not the document.

| Technique | Why excluded |
|---|---|
| Self-Consistency (multi-sample majority vote) | Runtime sampling strategy; expensive; controlled by the caller, not the skill text. |
| Reasoning-effort / thinking-budget knobs | Model/API runtime config; not portable across clients; not skill body content. |
| Prefilling assistant turn | API-layer mechanic; unavailable in extended thinking; not expressible in a static skill. |
| "Continue until fully resolved" persistence blocks | Agent-harness/system-prompt concern; a skill shouldn't seize the whole control loop. |

If a user explicitly wants one of these, route it to the runtime layer (system prompt / API params / agent config), not into the emitted `SKILL.md`.

## Anti-patterns to avoid in emitted skills

- Walls of ALWAYS/NEVER where explaining the *why* would steer better.
- Exhaustive edge-case coverage the agent's own judgment handles — bloats context, triggers unproductive paths.
- Option menus with no default.
- Explaining things the model already knows.
- Specific one-off answers instead of a reusable method.
- Ceremonial reasoning scaffolds (ToT/Reflexion) on tasks that don't need them.