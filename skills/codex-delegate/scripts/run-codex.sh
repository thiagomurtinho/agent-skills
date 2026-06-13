#!/usr/bin/env bash
# Standalone passthrough wrapper for Codex (OpenAI) CLI. Calls, returns. No magic.
# Self-contained: no dependency on any host project's hooks, quota gating, or config.
set -euo pipefail
MODEL="gpt-5.4-mini"
SANDBOX="read-only"
EFFORT="medium"
PROMPT=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -m|--model) MODEL="$2"; shift 2 ;;
    -s|--sandbox) SANDBOX="$2"; shift 2 ;;
    -e|--effort) EFFORT="$2"; shift 2 ;;
    --) shift; PROMPT="$*"; break ;;
    *) PROMPT="$*"; break ;;
  esac
done
[[ -n "$PROMPT" ]] || { echo "empty prompt" >&2; exit 64; }
exec codex exec "$PROMPT" </dev/null -m "$MODEL" -s "$SANDBOX" \
  -c model_reasoning_effort="$EFFORT" \
  --skip-git-repo-check
