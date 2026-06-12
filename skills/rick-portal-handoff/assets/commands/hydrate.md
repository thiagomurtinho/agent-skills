---
description: Read the handoff file (system temp by default) and brief me on prior-session context — READ-ONLY, no actions
---

Use the rick-portal-handoff skill, operation HYDRATE. This is READ-ONLY: read and learn the handoff, give me a context summary, then stop. Do NOT edit, stage, commit, publish, or run any `## Next` step. Reading allowed, mutating not.

1. Run the skill's `scripts/collect.sh`. Its `## handoff` block prints the resolved path and whether it exists. If `exists: no`, tell me — nothing to hydrate from.
2. Read the handoff file at that path.
3. Diff declared state vs real git state. Note any divergence in the summary.
4. Give me a **≤2-paragraph context summary** of the prior session: what it was doing, key decisions, current state, what `## Next` proposes.
5. STOP. State the proposed first action as a suggestion only. Wait for my explicit go before doing anything.
