#!/usr/bin/env bash
# Health check for an agent team's shared task list (~/.claude/tasks/<team>/).
# Flags the documented "task status lag" failure and related stuck states:
#   - tasks stuck in_progress
#   - pending tasks whose blockers are all completed (should be unblocked / claimable)
#   - unowned tasks that are ready to run
#
# Auto-detects the team when exactly one exists; pass a team name to disambiguate.
# Reads state live (derive, don't store). Needs python3 (stdlib only) for JSON parsing.
#
# Usage: bash task-audit.sh [team-name]
# Exit: 0 = clean, 1 = issues flagged, 2 = no tasks dir / bad input.

set -u
TASKS_ROOT="${HOME}/.claude/tasks"
TEAM="${1:-}"

if [ ! -d "$TASKS_ROOT" ]; then
  echo "No tasks directory at $TASKS_ROOT — no active team."
  exit 2
fi

if [ -z "$TEAM" ]; then
  # bash 3.2 safe (macOS default): no mapfile/readarray, no array under set -u.
  teams="$(find "$TASKS_ROOT" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort)"
  count="$(printf '%s\n' "$teams" | grep -c . || true)"
  if [ "$count" -eq 0 ]; then
    echo "No team task directories under $TASKS_ROOT."
    exit 2
  elif [ "$count" -gt 1 ]; then
    echo "Multiple teams found — pass one explicitly:"
    printf '%s\n' "$teams" | sed 's/^/  /'
    exit 2
  fi
  TEAM="$teams"
fi

TASK_DIR="$TASKS_ROOT/$TEAM"
if [ ! -d "$TASK_DIR" ]; then
  echo "No task directory for team '$TEAM' at $TASK_DIR."
  exit 2
fi

echo "Auditing team: $TEAM  ($TASK_DIR)"

python3 - "$TASK_DIR" <<'PY'
import sys, json, glob, os

task_dir = sys.argv[1]
tasks = {}
for path in glob.glob(os.path.join(task_dir, "*.json")):
    try:
        with open(path) as f:
            t = json.load(f)
    except Exception as e:
        print(f"  WARN unreadable {os.path.basename(path)}: {e}")
        continue
    tid = str(t.get("id", os.path.splitext(os.path.basename(path))[0]))
    tasks[tid] = t

if not tasks:
    print("  No tasks yet.")
    sys.exit(0)

def status(t): return (t.get("status") or "").lower()
def label(t): return t.get("subject") or t.get("description") or "(no subject)"

counts = {}
for t in tasks.values():
    counts[status(t)] = counts.get(status(t), 0) + 1
print("  Status:", ", ".join(f"{k or '?'}={v}" for k, v in sorted(counts.items())) or "none")

issues = 0

# 1. Stuck in_progress
stuck = [(i, t) for i, t in tasks.items() if status(t) == "in_progress"]
if stuck:
    print(f"\n  [{len(stuck)}] in_progress (verify still actively worked; mark completed if done):")
    for i, t in stuck:
        owner = t.get("owner") or "unassigned"
        print(f"    #{i} [{owner}] {label(t)}")
    issues += len(stuck)

# 2. Pending tasks whose blockers are all completed -> should be unblocked
def done(i):
    t = tasks.get(str(i)); return t is not None and status(t) == "completed"

ready_blocked = []
for i, t in tasks.items():
    if status(t) != "pending":
        continue
    blockers = t.get("blockedBy") or []
    if blockers and all(done(b) for b in blockers):
        ready_blocked.append((i, t))
if ready_blocked:
    print(f"\n  [{len(ready_blocked)}] pending but all blockers completed (status-lag — should be claimable):")
    for i, t in ready_blocked:
        print(f"    #{i} {label(t)}  (blockedBy {t.get('blockedBy')})")
    issues += len(ready_blocked)

# 3. Unowned ready work (pending, no unmet blockers, no owner)
unowned = []
for i, t in tasks.items():
    if status(t) != "pending":
        continue
    blockers = t.get("blockedBy") or []
    if blockers and not all(done(b) for b in blockers):
        continue
    if not t.get("owner"):
        unowned.append((i, t))
if unowned:
    print(f"\n  [{len(unowned)}] ready & unowned (assign or let a teammate claim):")
    for i, t in unowned:
        print(f"    #{i} {label(t)}")
    issues += len(unowned)

print()
if issues == 0:
    print("  Clean — no stuck, lagging, or orphaned tasks.")
    sys.exit(0)
else:
    print(f"  {issues} item(s) flagged. Likely fix: TaskUpdate stale tasks to completed, or assign/nudge owners.")
    sys.exit(1)
PY
exit $?
