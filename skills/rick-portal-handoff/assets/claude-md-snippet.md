Add to project CLAUDE.md:

```md
At session start, resolve the rick-portal-handoff path (run its scripts/handoff-path.sh, or $HANDOFF_PATH else $TMPDIR/<repo-slug>-HANDOFF.md). If that file exists with status != done: read it and follow rick-portal-handoff HYDRATE protocol before any repo exploration.
Update the handoff ## State and ## Next at every real milestone (not only at session end).
```
