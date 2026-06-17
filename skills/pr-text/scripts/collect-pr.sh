#!/usr/bin/env bash
# Live PR facts for the pr-text skill. Derive, don't store.
# Usage: scripts/collect-pr.sh [base]   (default base: main)
set -euo pipefail
base="${1:-main}"
branch="$(git rev-parse --abbrev-ref HEAD)"

echo "## pr facts"
echo "branch: $branch"
echo "base:   $base"
echo

echo "### commits ($base..$branch)"
git log --no-merges --format='- %s' "$base..$branch" 2>/dev/null || echo "(sem commits / base inexistente)"
echo

echo "### diffstat"
git diff --stat "$base...$branch" 2>/dev/null | tail -40 || echo "(sem diff)"
echo

echo "### touched files"
git diff --name-only "$base...$branch" 2>/dev/null || true
echo

echo "### linked issues (refs em commits/branch)"
{ git log --format='%s %b' "$base..$branch" 2>/dev/null; echo "$branch"; } \
  | grep -oiE '#[0-9]+' | sort -u | tr '\n' ' '
echo
