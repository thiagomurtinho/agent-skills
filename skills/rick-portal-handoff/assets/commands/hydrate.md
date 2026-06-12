---
description: Open fresh session from the handoff file (system temp by default) — no broad repo exploration
---

Use the rick-portal-handoff skill, operation HYDRATE.

1. Run the skill's `scripts/collect.sh`. Its `## handoff` block prints the resolved path and whether it exists. If `exists: no`, tell me — nothing to hydrate from.
2. Read the handoff file at that path.
3. Diff declared state vs real git state. List any divergence FIRST.
4. Restate mission in ≤5 bullets + first action.
5. Read only the files in `## Files` read-first. Handoff is the map — no exploration outside it.
6. Wait for my go before editing.
