---
name: skill-forge
description: Create new local skills from scratch and improve existing ones, grounded in the Agent Skills spec and creator best practices. Use whenever the user wants to build, author, write, scaffold, draft, package, or refactor a SKILL.md or skill folder, turn a repeated workflow or task into a reusable skill, or asks how to structure a skill — even when the word "skill" is absent (e.g. "make this process reusable for Claude", "package these instructions", "turn our runbook into something the agent can follow"). Asks targeted questions to fill gaps before drafting, selects only the techniques that fit the skill's task type, and emits skills in a calibrated XML+Markdown structure with curated technique injection.
license: Proprietary
metadata:
  author: thiago
  version: "1.0.0"
---

<skill-forge version="1.0.0">

# Skill Forge

Forge production-ready local skills. Output: a valid skill folder (`SKILL.md` + optional `references/`, `scripts/`, `assets/`) that another Claude can load and execute. Every emitted skill inherits the spec, the best practices, and a technique set chosen for *its* task — not a fixed maximalist template.

Core stance: a skill is a static document that teaches a procedure. Add what the agent lacks; omit what it already knows. Explain *why*, not just *what* — modern models reason well from purpose and degrade under rigid MUST-spam.

<operating_loop>
Run this loop. Adapt order to where the user already is.

1. **CAPTURE** — Extract intent from the conversation before asking anything.
2. **GAP-FILL** — Ask only the OPEN QUESTIONS still unresolved. See `<open_questions>`.
3. **SELECT** — Map task type → technique set. Load `references/technique-arsenal.md`. Inject only what fits.
4. **DRAFT** — Write the skill against `assets/skill-template.md`.
5. **VERIFY** — Self-audit against `<delivery_gate>`. Refine until pass.
6. **TEST** (optional) — Run realistic prompts, review with user, iterate. See `<evaluation>`.
7. **PACKAGE** — Present the folder. Optionally optimize the description.
</operating_loop>

<capture>
The conversation often already contains the skill. If the user says "turn this into a skill" or has just done a task, mine the history first:
- tools/libraries used and the winning sequence of steps
- corrections the user made ("use X not Y", "watch for edge case Z") → these are gotchas
- input/output formats actually observed
- project-specific facts the agent didn't know on its own

Source material beats general knowledge. A skill grounded in the user's real runbooks, schemas, API quirks, and past fixes outperforms one synthesized from generic best-practice articles. If the user has such artifacts, request them before drafting.
</capture>

<open_questions>
Do not interrogate. Ask only what you genuinely cannot infer from context. Default to 3-5 questions max, batched in one turn. Use the elicitation UI if available.

Always resolve, by inference or by asking:
1. **Purpose** — What should this skill let Claude *do*? (one coherent unit of work)
2. **Trigger** — What user phrases/contexts should activate it? Feeds the `description`.
3. **Output shape** — Free text / strict JSON / XML / Markdown / a file artifact (.docx, .xlsx, etc.)?
4. **Verifiability** — Are outputs objectively checkable (transforms, extraction, code) or subjective (style, design)? Decides whether test cases and validation loops apply. Suggest the default; let the user choose.
5. **Domain gotchas** — Any environment-specific traps, conventions, or source artifacts to ground in?

Ask a sixth, domain-specific question only when a critical lacuna remains. Confirm understanding before drafting if ambiguity is high; otherwise proceed.
</open_questions>

<technique_selection>
This is the heart of skill-forge and your explicit mandate: choose techniques, do not dump them.

Before drafting, classify the skill, then read `references/technique-arsenal.md` and inject only the matching set. The arsenal is curated into three tiers:

- **INCLUDED** — patterns native to skills (progressive disclosure, pushy description, gotchas, output template, checklist, validation loop, plan-validate-execute, bundled scripts, few-shot, default+escape-hatch, groundedness, calibrated control, domain organization). Apply by need.
- **CONDITIONAL** — gated patterns (Reflexion/self-critique, Tree-of-Thoughts, meta-prompt persona, ReAct). Inject only when the gate in the arsenal is met. Never as a default.
- **EXCLUDED** — runtime-only mechanics that do not belong in a static SKILL.md (Self-Consistency majority vote, reasoning-effort/thinking-budget knobs, prefilling, "continue until resolved" persistence harnesses). Do not bake these into emitted skills; they are agent/API runtime config, not portable skill content.

Selection rule of thumb: **match specificity to fragility.** Prescribe exact sequences only where operations are fragile, destructive, or consistency-critical. Give freedom (with explained purpose) where multiple approaches are valid. Most skills mix both — calibrate each section independently.

State your technique choices briefly to the user before or alongside the draft, so the curation is auditable.
</technique_selection>

<output_standards>
Emitted skills inherit six rules. Full skeleton in `assets/skill-template.md`.

1. **Spec-valid frontmatter** — `name` (1-64 chars, `[a-z0-9-]`, no leading/trailing/double hyphen, matches folder); `description` (≤1024 chars, imperative, says what + when, pushy to fight under-triggering); `metadata.version` (quoted semver string, e.g. `"1.0.0"`). Optional `license`, `compatibility` (only if real env requirement), other `metadata` keys.
2. **Single root tag** — Wrap the *entire* body (title included) in one root tag named exactly after the skill, carrying the version: `<skill-name version="1.0.0">…</skill-name>`. No loose top-level tags — every semantic tag nests inside the root. The `version` attribute MUST equal frontmatter `metadata.version`; they are one value in two places, so a context that loads the skill twice can prefer the newer copy. The Agent Skills spec doesn't mandate this root (the harness wraps activated skills in its own `<skill_content name=…>`, so expect a benign double-wrap at runtime) — it's a house convention for in-file delimiting and version arbitration. Bump *both* values together on every change.
3. **Semantic tags + Markdown density** — Inside the root, use semantic XML tags as structural containers (`<workflow>`, `<gotchas>`, `<output_format>` …) only where structure earns >~10% clarity; Markdown *inside* tags for textual density. For short, linear, or subjective skills, take the escape hatch: no inner semantic tags, just clean Markdown — but the root tag still wraps it.
4. **Code always fenced** — Any code, inside or outside XML tags, uses language-tagged Markdown fences. Never raw code in a tag.
5. **Markdown for tables and lists** — `| a | b |` and `-` bullets. Never `<table>` or `<li>` inside the skill body.
6. **Technique injection by need** — Only the selected set (above). No filler structure, no ceremonial reasoning blocks the task doesn't require.

Sizing: keep `SKILL.md` under ~500 lines / ~5000 tokens. Push detailed reference material to `references/` and tell the agent *when* to load each file ("read `references/x.md` if …") — that is how progressive disclosure is meant to work.
</output_standards>

<delivery_gate>
Self-audit the draft before handing it over. Refine until all pass (max 2-3 internal passes; if it won't converge, report the structural blocker instead of shipping a flawed skill):

- `name` valid and matches folder; `description` ≤1024 chars, imperative, covers what + when, pushy.
- Body wrapped in a single `<skill-name version="…">` root (no loose top-level tags); the root `version` equals frontmatter `metadata.version`.
- Body teaches a *procedure* that generalizes, not a one-off answer for a single instance.
- Adds only what the agent lacks; no explanations of things the model already knows (what a PDF is, how HTTP works).
- Defaults chosen over option-menus; alternatives mentioned briefly with an escape hatch.
- All code fenced with a language tag; no HTML tables/lists in the body.
- Only selected techniques present; no EXCLUDED runtime mechanics baked in.
- Gotchas (if any) live in `SKILL.md`, where the agent reads them *before* hitting the trap.
- Reference files referenced with explicit load-triggers, not a vague "see references/".
- No heavy-handed ALWAYS/NEVER walls where explaining the *why* would serve better.
</delivery_gate>

<evaluation>
Offer testing for verifiable skills; skip the heavy machinery for subjective ones.

For a quick sanity check, write 2-3 realistic test prompts, confirm them with the user, then run each yourself — read the new skill's `SKILL.md` and follow it to do the task. Present each prompt + output inline (save file outputs so the user can download and inspect). Gather feedback, improve, repeat until the user is satisfied or feedback is empty.

For the rigorous loop (parallel with-skill vs baseline runs, graded assertions, benchmark aggregation, browser review), **load `references/evaluation.md`** — it documents the full workspace layout, the subagent spawn pattern, grading, the `aggregate_benchmark` step, and the `eval-viewer`. Use that existing tooling rather than reinventing it.
</evaluation>

<description_optimization>
The `description` is the sole trigger mechanism — it carries the entire burden of activation. After the skill works, tighten it:
- Imperative ("Use this skill when…"), framed by user intent, explicitly pushy about non-obvious contexts ("even if they don't say 'CSV'").
- Generate ~20 realistic eval queries: 8-10 should-trigger (varied phrasing, explicitness, detail, complexity; include cases where the connection isn't obvious) and 8-10 should-not-trigger near-misses (share keywords but need something else). Avoid trivially-irrelevant negatives.
- Sanity-check a handful manually, or run the automated train/validation optimization loop: `python -m scripts.run_loop --eval-set <path> --skill-path <skill> --model <session-model-id> --max-iterations 5`. Select the result by validation pass rate, not the last iteration. The `assets/eval_review.html` template lets the user review/edit the eval set before the run.
- Keep under 1024 chars; descriptions tend to grow during optimization.
</description_optimization>

<safety>
Never produce skills containing malware, exploit code, data-exfiltration logic, or anything whose real intent would surprise the user if stated plainly. Decline misleading or unauthorized-access skills. Benign roleplay/persona skills are fine.
</safety>

## Reference files

- `references/technique-arsenal.md` — Curated technique catalog with INCLUDED / CONDITIONAL / EXCLUDED tiers and per-technique selection gates. **Load during step 3 (SELECT)** before choosing what to inject.
- `assets/skill-template.md` — The XML+Markdown skill skeleton plus a worked example. **Load during step 4 (DRAFT)** when writing the skill body.
- `references/evaluation.md` — Full test/benchmark/review loop: workspace layout, subagent runs, grading, aggregation, the eval-viewer. **Load during step 6 (TEST)** when running the rigorous evaluation. Points to `references/schemas.md` for the JSON structures and to `agents/` for grader/comparator/analyzer subagent instructions.

</skill-forge>
