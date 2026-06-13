# Emitted-Skill Template

Loaded during **DRAFT**. Use this skeleton for the generated `SKILL.md`. XML tags = structural containers; Markdown lives inside them. Include only the tags the skill needs — delete the rest. For short, linear, or subjective skills, take the escape hatch and write plain Markdown instead.

## Frontmatter (always)

```yaml
---
name: <folder-name>            # 1-64 chars, [a-z0-9-], no leading/trailing/double hyphen, matches the folder
description: <imperative; what it does + when to trigger; pushy about non-obvious contexts; ≤1024 chars>
metadata:
  version: "1.0.0"             # quoted semver; MUST equal the root tag's version= attribute
  # author: <x>
# optional:
# license: <name or LICENSE file>
# compatibility: <only if a real env requirement — tools, packages, network, target product>
# --- palette below: add ONLY the fields the skill actually needs, never ceremonially ---
# allowed-tools: Bash(git *)   # pre-approve tools; REQUIRED when the body uses !`cmd` dynamic context
# disallowed-tools: <tool>     # remove tools from the pool
# argument-hint: <hint>        # / arguments: — when the skill takes args
# disable-model-invocation: true   # user-only (no auto-trigger)   |   user-invocable: false  # model-only
# context: fork                # run the skill in an isolated subagent…
# agent: Explore               # …with this agent
# model: haiku                 # / effort: — override the runtime for this skill
---
```

## Body skeleton (XML + Markdown hybrid)

Wrap the entire body in one root tag named after the skill, carrying the version (`version=` MUST match frontmatter `metadata.version`). Open with a one-line statement of what the skill does and the output it produces, then the stance/why. Then inject only the relevant blocks below — all nested inside the root, never as loose top-level tags.

````markdown
<skill-name version="1.0.0">

# <Skill Title>

<one line: what this enables + the concrete output>. <One line of stance: the why behind the approach.>

<workflow>
Numbered, imperative steps. Prescribe exactly where fragile/destructive; leave freedom (with stated purpose) where multiple approaches are valid.

1. ...
2. ...
</workflow>

<gotchas>
Only environment-specific traps that defy reasonable assumptions. Concrete corrections, not general advice.

- ...
</gotchas>

<output_format>
Provide a concrete template the agent pattern-matches against:

```markdown
# [Title]
## Section
...
```
</output_format>

<examples>
**Example 1**
Input: ...
Output: ...
</examples>

</skill-name>
````

## Conditional blocks (inject only by gate)

- **Validation loop** — for self-checkable work:

```markdown
<validation>
1. Do the work
2. Run the check: `scripts/validate.py output/`
3. If it fails: read the error, fix, re-run
4. Proceed only when it passes
</validation>
```

- **Plan-validate-execute** — for batch/destructive ops: emit a plan file → validate against a source of truth → execute. The validation step (plan vs. source) is the load-bearing one.

- **Bundled script reference** — when logic repeats every run:

```markdown
Run the extraction: `scripts/extract.py <input>` → writes `result.json`.
```

- **References pointer** — push detail out, with an explicit load-trigger:

```markdown
## Reference files
- `references/api-errors.md` — read this **if the API returns a non-200 status**.
```

- **Dynamic context** — inject live repo/git facts the agent must see before acting (needs `allowed-tools` for the command):

```markdown
## Context
- Diff: !`git diff --stat`
```

- **Negative constraints** — only for a known trap the model keeps treating as a suggestion; don't list the obvious:

```markdown
<constraints>
- Do **not** overwrite the source file — write to a new path.
</constraints>
```

## Rules the template enforces

- One root tag named after the skill wraps the whole body (title included). No loose top-level tags — semantic tags nest inside the root.
- The root's `version=` attribute equals frontmatter `metadata.version`. Bump both together on every change; a context loading the skill twice prefers the higher version.
- Only the root tag carries an attribute (`version`). Inner semantic tags are clean structural containers — no attributes.
- Code is always inside language-tagged fences, even within an XML tag — never raw code in a tag.
- Tables and lists use Markdown (`| a | b |`, `-`), never `<table>`/`<li>` in the body.
- Keep `SKILL.md` under ~500 lines / ~5000 tokens; overflow goes to `references/`.

## Worked micro-example (verifiable skill)

````markdown
---
name: csv-profit-margin
description: Add a profit-margin column to revenue/cost spreadsheets and flag thin margins. Use when the user has a CSV/XLSX with revenue and cost columns and wants margin analysis, even if they don't say "margin" — e.g. "which of these products are barely profitable?".
metadata:
  version: "1.0.0"
---

<csv-profit-margin version="1.0.0">

# CSV Profit Margin

Add a `profit_margin_pct` column and highlight rows below a threshold. Output: the same file plus the new column and flags.

<workflow>
1. Load the sheet; confirm the revenue and cost columns (ask only if ambiguous).
2. Compute margin: `(revenue - cost) / revenue * 100`, rounded to 1 decimal.
3. Flag rows where margin < threshold (default 10%).
4. Validate before saving (below). Save to a new file; never overwrite the source.
</workflow>

<gotchas>
- Zero or blank revenue → margin is undefined; write "N/A", don't divide.
- Costs may include currency symbols/thousands separators; strip before arithmetic.
</gotchas>

<validation>
1. Re-read the written file.
2. Check: no row has both a numeric revenue and a blank margin; flagged rows are exactly those under threshold.
3. Fix and re-save if either check fails.
</validation>

</csv-profit-margin>
````

Note what this example does *not* contain: no ToT, no self-consistency, no reasoning-effort knobs, no persistence harness. It injects only template + gotchas + validation + groundedness — the set its task type calls for.