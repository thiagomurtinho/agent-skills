Add to project CLAUDE.md:

```md
At session start, resolve the rick-portal-handoff path (run its scripts/handoff-path.sh, or $HANDOFF_PATH else $TMPDIR/<repo-slug>-HANDOFF.md). If that file exists with status != done: follow rick-portal-handoff HYDRATE — READ it, give me a ≤2-paragraph context summary of the prior session, then STOP and wait. Do NOT execute its Next steps, edit, stage, commit, or publish without my go.
Update the handoff ## State and ## Next at every real milestone (not only at session end).
```
