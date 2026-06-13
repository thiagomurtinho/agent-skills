# Failure modes → recovery

Load when a running team misbehaves. Each row is a documented limitation/failure of agent teams
(experimental feature) and the concrete recovery the leader should take.

| Symptom | What's happening | Recovery |
|---|---|---|
| Dependent task won't start though its blocker looks done | **Task status lag** — teammate finished but didn't mark its task `completed`, so dependents stay blocked. | Run `scripts/task-audit.sh`. If the blocker's work is genuinely done, `TaskUpdate` it to `completed` to release dependents. Or `SendMessage` the owner to mark it. |
| Leader stops / declares "done" with tasks still open | **Leader premature shutdown** — leader decided the team finished early. | Tell the leader to continue and wait for teammates: "Wait for your teammates to complete their tasks before proceeding." |
| Leader starts editing files itself | Leader is substituting for delegation. | "Wait for your teammates to finish before doing any implementation yourself." Re-assign the work as a task. |
| A teammate went quiet after an error | **Teammates stop on errors** instead of recovering. | Inspect its output (Shift+Down in-process / click pane in split). Then either `SendMessage` it new instructions, or spawn a replacement teammate to continue the work. |
| Teammates never appeared after creating the team | In-process teammates run but aren't visible; or the task wasn't team-worthy; or split-pane deps missing. | In-process: Shift+Down to cycle teammates. Split-pane: check `which tmux` / iTerm2 `it2` CLI + Python API. Confirm the task actually warranted a team. |
| After `/resume` or `/rewind`, leader messages a teammate that errors | **No session resume for in-process teammates** — they aren't restored. | Tell the leader to spawn fresh teammates; the old ones are gone. |
| Flood of permission prompts to the leader | Teammate permission requests all surface to the leader; modes are fixed at spawn. | Pre-approve common operations in permission settings **before** spawning. You can change an individual teammate's mode after spawn, but not per-teammate at spawn time. |
| Team won't clean up / "active teammates" error | Cleanup checks for live teammates and refuses while any run. | Shut teammates down first via `SendMessage(to: "<name>", message: {type: "shutdown_request"})` — slow, they finish the in-flight tool call; confirm none active, then clean up **from the lead**. |
| Orphaned tmux session after the team ended | Split-pane session not fully cleaned. | `tmux ls`, then `tmux kill-session -t <session-name>`. |
| Tried to create a second team | **One team per leader** — hard limit; leader is fixed for its lifetime, no nesting. | Clean up the current team first, then create the new one. To restructure, restart from a session that becomes the new leader. |
| Tried to set up a foreman / intermediate "team-lead" teammate / 3-level hierarchy | The structure is **exactly 2 levels**: the Main Agent (Team Lead) is the one lead (the only spawner); teammates are flat and **can't spawn**. A teammate-as-foreman can't actually create workers. | Flatten to 2 levels: the Main Agent (Team Lead) spawns and coordinates all subordinates directly. Don't designate a teammate as a sub-lead — it has no one to lead. |
| Two teammates overwrote each other's work on the same file | **No worktree** — Teams doesn't isolate; disjointness was only a plan promise and the wave wasn't actually disjoint. | Re-partition so each teammate owns a disjoint file set; **sequence** same-file tasks instead of running them concurrently. Reconstruct the lost change from the PLAN doc / git. |
| All teammates running the same model despite the roster | `CLAUDE_CODE_SUBAGENT_MODEL` is set — it overrides every teammate's frontmatter model, flattening the roster. | Unset it (or set `inherit`) and re-spawn. Routing only works when each teammate's own definition decides its model. |
| Teammates' findings/diagnoses diverge and the team stalls or silently picks one | No native conflict resolution; teammates may overrule each other. | The **lead** resolves: gather both positions (the charter tells teammates to escalate divergence, not pick a side), decide, and update the task. Bake the resolution into the PLAN doc. |
| Lost the run's history after cleanup | **Ephemeral team state** — no durable STATE.md; it dies with the team. | Prevention only: keep a versioned PLAN doc (owners, models, waves, deps, escalations) *during* the run. After cleanup the team state is unrecoverable. |

## Notes

- Teammates **cannot** spawn their own teammates or teams (no nesting). Only the leader manages
  the team.
- You **cannot** promote a teammate to leader or transfer leadership. The creating session is the
  leader for the team's whole life.
- Team state lives at `~/.claude/teams/<team>/config.json` (runtime: session/pane IDs — never edit
  or pre-create, it's overwritten on the next state update) and `~/.claude/tasks/<team>/`.
