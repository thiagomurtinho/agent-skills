#!/usr/bin/env bash
# rick-portal-handoff path resolver: single source of truth for WHERE the handoff lives.
# Precedence: $HANDOFF_PATH (explicit) > $TMPDIR/<repo-slug>-HANDOFF.md (deterministic temp default).
# Deterministic so /handoff (write) and /hydrate (read) hit the same file across sessions.
set -euo pipefail

if [ -n "${HANDOFF_PATH:-}" ]; then
  echo "$HANDOFF_PATH"
  exit 0
fi

TMP="${TMPDIR:-/tmp}"
TMP="${TMP%/}"                         # strip trailing slash (macOS $TMPDIR has one)
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
SLUG="$(basename "$ROOT")"
echo "$TMP/${SLUG}-HANDOFF.md"
