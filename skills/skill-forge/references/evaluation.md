# Evaluation Loop

Loaded during **TEST** (step 6) when running the rigorous evaluation of a skill. This is the full quantitative loop: parallel with-skill vs. baseline runs, graded assertions, benchmark aggregation, and a browser review. It assumes a local environment with subagents, a browser/display (or `--static` fallback), and the `claude` CLI.

For a light qualitative check instead, skip all of this — just run 2-3 test prompts yourself and show the user the outputs inline. Use this file only when objective measurement is worth the machinery.

The JSON shapes referenced below (`evals.json`, `eval_metadata.json`, `grading.json`, `benchmark.json`) are defined in `references/schemas.md` — read it when writing any of these files.

## Test cases

After the skill draft exists, write 2-3 realistic test prompts — the kind of thing a real user would actually say. Share them with the user ("Here are a few test cases I'd like to try. Do these look right?") and run them once confirmed.

Save the prompts to `evals/evals.json`. Don't write assertions yet — just the prompts. You'll draft assertions while the runs are in progress.

```json
{
  "skill_name": "example-skill",
  "evals": [
    { "id": 1, "prompt": "User's task prompt", "expected_output": "Description of expected result", "files": [] }
  ]
}
```

## Workspace layout

Put results in `<skill-name>-workspace/` as a sibling to the skill directory. Organize by iteration (`iteration-1/`, `iteration-2/`, …) and within each, one directory per test case (`eval-0/`, `eval-1/`, …). Don't create everything upfront — make directories as you go.

```
<skill-name>-workspace/
└── iteration-1/
    ├── eval-0-descriptive-name/
    │   ├── with_skill/outputs/
    │   ├── without_skill/outputs/   # (new skill)  OR  old_skill/outputs/ (improving)
    │   ├── eval_metadata.json
    │   ├── timing.json              # per run
    │   └── grading.json             # per run
    └── benchmark.json / benchmark.md
```

## Step 1 — Spawn all runs in the same turn

For each test case, spawn two subagents in the same turn — one with the skill, one without. Don't spawn the with-skill runs first and come back for baselines later; launch everything at once so it finishes around the same time.

**With-skill run:**

```
Execute this task:
- Skill path: <path-to-skill>
- Task: <eval prompt>
- Input files: <eval files if any, or "none">
- Save outputs to: <workspace>/iteration-<N>/eval-<ID>/with_skill/outputs/
- Outputs to save: <what the user cares about — e.g., "the .docx file", "the final CSV">
```

**Baseline run** (same prompt; baseline depends on context):
- **Creating a new skill**: no skill at all. Same prompt, no skill path, save to `without_skill/outputs/`.
- **Improving an existing skill**: the old version. Before editing, snapshot the skill (`cp -r <skill-path> <workspace>/skill-snapshot/`), point the baseline subagent at the snapshot, save to `old_skill/outputs/`.

Write an `eval_metadata.json` per test case (assertions can be empty for now). Give each eval a descriptive name based on what it tests, and use that name for the directory. If this iteration uses new/modified prompts, create these files fresh per directory — don't assume they carry over.

```json
{ "eval_id": 0, "eval_name": "descriptive-name-here", "prompt": "The user's task prompt", "assertions": [] }
```

## Step 2 — While runs are in progress, draft assertions

Don't just wait. Draft quantitative assertions for each test case and explain them to the user. If assertions already exist in `evals/evals.json`, review and explain what they check.

Good assertions are objectively verifiable and have descriptive names — they should read clearly in the viewer so someone glancing at results understands each check. Subjective skills (writing style, design quality) are better evaluated qualitatively — don't force assertions onto things that need human judgment. Update `eval_metadata.json` and `evals/evals.json` once drafted.

## Step 3 — As runs complete, capture timing

When each subagent task completes you receive `total_tokens` and `duration_ms`. Save immediately to `timing.json` in the run directory — this is the only opportunity; it isn't persisted elsewhere. Process each notification as it arrives.

```json
{ "total_tokens": 84852, "duration_ms": 23332, "total_duration_seconds": 23.3 }
```

## Step 4 — Grade, aggregate, review

1. **Grade each run** — spawn a grader subagent (or grade inline) that reads `agents/grader.md` and evaluates each assertion against the outputs. Save to `grading.json` in each run directory. The `expectations` array must use the fields `text`, `passed`, and `evidence` (not `name`/`met`/`details`) — the viewer depends on these exact names. For programmatically-checkable assertions, write and run a script rather than eyeballing — faster, reliable, reusable across iterations.

2. **Aggregate into benchmark** — from the skill directory:
   ```bash
   python -m scripts.aggregate_benchmark <workspace>/iteration-N --skill-name <name>
   ```
   Produces `benchmark.json` and `benchmark.md` with pass_rate, time, and tokens per configuration (mean ± stddev and the delta). Put each with_skill version before its baseline counterpart. If generating `benchmark.json` manually, follow `references/schemas.md`.

3. **Analyst pass** — read the benchmark and surface patterns the aggregate hides (per `agents/analyzer.md`, "Analyzing Benchmark Results"): assertions that always pass regardless of skill (non-discriminating), high-variance evals (possibly flaky), time/token tradeoffs.

4. **Launch the viewer:**
   ```bash
   nohup python eval-viewer/generate_review.py \
     <workspace>/iteration-N \
     --skill-name "my-skill" \
     --benchmark <workspace>/iteration-N/benchmark.json \
     > /dev/null 2>&1 &
   VIEWER_PID=$!
   ```
   For iteration 2+, also pass `--previous-workspace <workspace>/iteration-<N-1>`.

   **Headless fallback** (no display, e.g. over SSH): use `--static <output_path>` to write a standalone HTML file instead of starting a server. Feedback downloads as `feedback.json` when the user clicks "Submit All Reviews"; copy it into the workspace for the next iteration to pick up.

   Use `generate_review.py` to create the viewer — don't write custom HTML.

5. **Tell the user**: two tabs — "Outputs" to click through each test case and leave feedback, "Benchmark" for the quantitative comparison. Ask them to come back when done.

## Step 5 — Read the feedback

When the user says they're done, read `feedback.json`. Empty feedback means it was fine — focus improvements on test cases with specific complaints.

```json
{
  "reviews": [
    { "run_id": "eval-0-with_skill", "feedback": "the chart is missing axis labels", "timestamp": "..." },
    { "run_id": "eval-2-with_skill", "feedback": "perfect, love this", "timestamp": "..." }
  ],
  "status": "complete"
}
```

Kill the viewer when done: `kill $VIEWER_PID 2>/dev/null`.

## Improving the skill

This is the heart of the loop. You've run the test cases, the user reviewed the results, now make the skill better.

1. **Generalize from feedback.** The skill will be used across many prompts, not just these examples. Avoid fiddly overfit changes and oppressive MUSTs; if an issue is stubborn, try a different metaphor or working pattern. It's cheap to try.
2. **Keep the prompt lean.** Remove what isn't pulling its weight. Read the transcripts, not just final outputs — if the skill makes the model waste time, cut the part causing it and re-test.
3. **Explain the why.** Today's models have good theory of mind. If you find yourself writing ALWAYS/NEVER in caps or rigid structures, that's a yellow flag — reframe and explain the reasoning instead.
4. **Look for repeated work across test cases.** If all runs independently wrote a similar helper script (e.g. `create_docx.py`), that's a strong signal to bundle it in `scripts/` and tell the skill to use it — saving every future invocation from reinventing it.

### Iteration loop

1. Apply improvements.
2. Rerun all test cases into `iteration-<N+1>/`, including baselines. New skill → baseline stays `without_skill`. Improving → use judgment: the original version the user came in with, or the previous iteration.
3. Launch the viewer with `--previous-workspace` pointing at the previous iteration.
4. Wait for the user to review.
5. Read feedback, improve, repeat.

Stop when: the user is happy, feedback is all empty, or you're not making meaningful progress.

## Advanced — Blind comparison (optional)

For a more rigorous comparison between two versions (e.g. "is the new version actually better?"): read `agents/comparator.md` and `agents/analyzer.md`. Give two outputs to an independent agent without telling it which is which, let it judge quality, then analyze why the winner won. Optional; the human review loop is usually sufficient.
