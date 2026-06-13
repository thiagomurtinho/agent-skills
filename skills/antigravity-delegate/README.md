# antigravity-delegate — maintainer notes

Migrated out of a private `personal-os` vault (2026-06-13) as a standalone skill.
Same split as `codex-delegate`: the skill carries the **dispatch mechanism**, not
the host project's surrounding **policy**. Left behind (re-add host-side if wanted):

- **Quota gating** (`usage-guard`, `antigravity.pct_*`) — not in the skill.
- **Cooldown on failure** (quota/rate-limit/auth/timeout) — not in the skill.
- **Direct-call blocking** of bare `agy -p` — not enforced here.

## --dangerously-skip-permissions (default ON)
The wrapper runs `agy` with `--dangerously-skip-permissions` **by default**.
Headless `agy` (no TTY) hangs waiting for interactive tool-approval, so the flag
is required for unattended runs. This is intentional for **trusted local use**.

### Evolving to opt-in
If you ever publish this more widely, gate the flag behind an env var so it's
opt-in instead of default. Replace the `exec` line in `scripts/run-antigravity.sh`:

```bash
SKIP=""
[[ "${AGY_SKIP_PERMISSIONS:-0}" == "1" ]] && SKIP="--dangerously-skip-permissions"
exec "$AGY_BIN" -p "$PROMPT" --model "$MODEL" $SKIP </dev/null
```
Then callers must set `AGY_SKIP_PERMISSIONS=1` to allow unattended tool use.

## Requirements
- `agy` (Antigravity) CLI on PATH, authenticated. Override path with `AGY_BIN`.
