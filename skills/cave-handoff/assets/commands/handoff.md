---
description: Create/update docs/ai/HANDOFF.md (caveman-compressed operational state) for clean session restart
---

Use the cave-handoff skill, operation CREATE/UPDATE.

1. Run the skill's `scripts/collect.sh` for live git facts.
2. Delta-update `docs/ai/HANDOFF.md` (create if absent) per the skill's template and compression rules. State, not narrative. Anchors byte-exact. Decisions and retry-conditions in full sentences.
3. Run `scripts/validate.py docs/ai/HANDOFF.md`. Fix everything it reports.
4. Spawn a subagent with ONLY the handoff file and this prompt: "You are a fresh session. Read this file. List: ambiguities, vague next steps, commands without success criteria, missing context that blocks action 1." Fix what it finds.
5. Show me the diff. Wait for my approval. Do not commit without it.
