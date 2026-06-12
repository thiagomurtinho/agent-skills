---
description: Create/update the handoff file (caveman-compressed operational state, system temp by default) for clean session restart
---

Use the rick-portal-handoff skill, operation CREATE/UPDATE.

1. Run the skill's `scripts/collect.sh` for live git facts. Its `## handoff` block prints the resolved path (`$HANDOFF_PATH` if set, else `$TMPDIR/<repo-slug>-HANDOFF.md`) — write to THAT path.
2. Delta-update the handoff file at that path (create if absent) per the skill's template and compression rules. State, not narrative. Anchors byte-exact. Decisions and retry-conditions in full sentences.
3. Run `scripts/validate.py` (no arg → same default path; or pass the path explicitly). Fix everything it reports.
4. Spawn a subagent with ONLY the handoff file and this prompt: "You are a fresh session. Read this file. List: ambiguities, vague next steps, commands without success criteria, missing context that blocks action 1." Fix what it finds.
5. Show me the diff. Wait for my approval. Do not commit without it.
