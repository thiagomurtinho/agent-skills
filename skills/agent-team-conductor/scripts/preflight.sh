#!/usr/bin/env bash
# Preflight for creating a Claude Code agent team.
# Verifies the feature is enabled, the CLI is new enough, and no team already exists
# (one team per leader). Exit 0 = clear to TeamCreate. Non-zero = fix the reported issue first.
#
# Zero external deps. Usage: bash preflight.sh

set -u

MIN_VERSION="2.1.32"
TEAMS_DIR="${HOME}/.claude/teams"
fail=0

note() { printf '  %s\n' "$1"; }
ok()   { printf 'OK   %s\n' "$1"; }
bad()  { printf 'FAIL %s\n' "$1"; fail=1; }

# 1. Experimental flag --------------------------------------------------------
if [ "${CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS:-}" = "1" ]; then
  ok "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1"
else
  bad "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS is not 1 (agent teams disabled)."
  note "Set it in settings.json env or your shell, then restart the session."
fi

# 2. CLI version >= MIN_VERSION ----------------------------------------------
# Compare dotted versions without sort -V (portability). Returns 0 if $1 >= $2.
ver_ge() {
  local a b IFS=.
  read -ra a <<< "$1"; read -ra b <<< "$2"
  for i in 0 1 2; do
    local ai=${a[i]:-0} bi=${b[i]:-0}
    if   ((10#$ai > 10#$bi)); then return 0
    elif ((10#$ai < 10#$bi)); then return 1
    fi
  done
  return 0
}

if command -v claude >/dev/null 2>&1; then
  raw="$(claude --version 2>/dev/null)"
  ver="$(printf '%s' "$raw" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)"
  if [ -n "$ver" ] && ver_ge "$ver" "$MIN_VERSION"; then
    ok "claude $ver (>= $MIN_VERSION)"
  elif [ -n "$ver" ]; then
    bad "claude $ver is older than required $MIN_VERSION. Upgrade Claude Code."
  else
    bad "Could not parse a version from 'claude --version' ($raw)."
  fi
else
  note "WARN 'claude' not on PATH — cannot verify version (need >= $MIN_VERSION)."
fi

# 3. One team per leader ------------------------------------------------------
existing=""
if [ -d "$TEAMS_DIR" ]; then
  for d in "$TEAMS_DIR"/*/; do
    [ -e "$d/config.json" ] || continue
    existing="$existing ${d%/}"
  done
fi
if [ -n "$existing" ]; then
  bad "A team already exists (one team per leader). Clean it up before creating a new one:"
  for t in $existing; do note "$(basename "$t")  ($t)"; done
else
  ok "No existing team under $TEAMS_DIR"
fi

# Result ----------------------------------------------------------------------
echo
if [ "$fail" -eq 0 ]; then
  echo "Preflight passed — clear to TeamCreate."
  exit 0
else
  echo "Preflight FAILED — resolve the items above before creating a team."
  exit 1
fi
