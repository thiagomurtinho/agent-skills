# codex-delegate — maintainer notes

Migrated out of a private `personal-os` vault (2026-06-13) to be a standalone,
self-contained skill. The skill carries only the **dispatch mechanism** (the
passthrough wrapper + model/effort/sandbox routing). The host project's
surrounding **policy** did NOT come along — by design, so the skill stays
portable. What was left behind, in case you want to re-add it as a host-side hook:

- **Quota gating.** The vault ran a `usage-guard` check before heavy/looped
  Codex runs and warned when `codex.pct_weekly_used` was high. This skill has no
  quota awareness — it just dispatches. Re-add via a host PreToolUse hook if you
  need a quota brake.
- **Cooldown on failure.** A host hook parsed Codex stderr and put the model in
  cooldown on `quota|rate-limit|429` (1h), `auth|401|403` (24h), `timeout` (10m).
  Not in the skill — failures just surface.
- **Direct-call blocking.** The vault blocked bare `codex exec` so all calls went
  through the wrapper (for the gating above). The skill doesn't enforce that;
  call the wrapper because it sets sane defaults, not because anything stops you.

## Obsidian MCP note
The original vault wrapper forced `mcp_servers.obsidian.enabled=false` because a
local Obsidian REST MCP (`required=true`) would otherwise fail `codex exec`
startup. That coupling is **gone**: the flag was removed from the wrapper and the
obsidian MCP was deleted from `~/.codex/config.toml`. This wrapper no longer
touches MCP config — it uses whatever the local `codex` install has.

## Requirements
- `codex` CLI on PATH, authenticated.
