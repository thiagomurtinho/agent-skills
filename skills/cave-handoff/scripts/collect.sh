#!/usr/bin/env bash
# cave-handoff collect: live git facts → stdout. Never stored in handoff.
set -euo pipefail

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "FATAL: not a git repo" >&2
  exit 2
fi

echo "## git facts ($(date -u +%Y-%m-%dT%H:%MZ))"
echo "branch: $(git branch --show-current 2>/dev/null || echo DETACHED)"
echo "head: $(git rev-parse --short HEAD)"
echo
echo "## status"
git status --short || true
echo
echo "## diff stat (unstaged+staged vs HEAD)"
git diff --stat HEAD 2>/dev/null || true
echo
echo "## last 5 commits"
git log --oneline -5
echo
echo "## changed files vs HEAD"
git diff --name-only HEAD 2>/dev/null || true

# untracked
UNTRACKED=$(git ls-files --others --exclude-standard)
if [ -n "$UNTRACKED" ]; then
  echo
  echo "## untracked"
  echo "$UNTRACKED"
fi
