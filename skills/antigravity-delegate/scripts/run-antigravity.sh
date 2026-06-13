#!/usr/bin/env bash
# Standalone passthrough wrapper for Antigravity (agy / Gemini) CLI. Calls, returns.
# Self-contained: no dependency on any host project's hooks, quota gating, or config.
#
# SECURITY NOTE: runs with --dangerously-skip-permissions by default. Headless agy
# without it hangs waiting for interactive tool-approval (no TTY). This is the
# intended default for trusted local use. To make it opt-in (e.g. before publishing
# more widely), gate the flag behind an env var — see README.md "Evolving to opt-in".
set -euo pipefail
AGY_BIN="${AGY_BIN:-agy}"
MODEL="Gemini 3.5 Flash (Low)"
PROMPT=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -m|--model) MODEL="$2"; shift 2 ;;
    --) shift; PROMPT="$*"; break ;;
    *) PROMPT="$*"; break ;;
  esac
done
[[ -n "$PROMPT" ]] || { echo "empty prompt" >&2; exit 64; }
exec "$AGY_BIN" -p "$PROMPT" --model "$MODEL" --dangerously-skip-permissions </dev/null
