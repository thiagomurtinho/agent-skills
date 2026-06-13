#!/usr/bin/env bash
# Launch the agent-team dashboard: pick a free port, start the server detached,
# open the browser, print URL + PID. Zero deps beyond Node.
#
# Usage: bash launch.sh [TEAM] [REPO]
#   TEAM  team name under ~/.claude/teams/  (default: auto-detect)
#   REPO  repo path for the commit timeline (default: current dir)
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEAM="${1:-${TEAM:-}}"
REPO="${2:-${REPO:-$PWD}}"

command -v node >/dev/null 2>&1 || { echo "✗ Node não encontrado. Instale Node 18+ e tente de novo."; exit 1; }

# find a free port starting at 4317
PORT="${PORT:-4317}"
for _ in $(seq 0 20); do
  if ! lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then break; fi
  PORT=$((PORT+1))
done

LOG="${TMPDIR:-/tmp}/agent-team-dashboard-$PORT.log"
TEAM="$TEAM" REPO="$REPO" PORT="$PORT" node "$HERE/server.js" >"$LOG" 2>&1 &
PID=$!
sleep 0.6

if ! kill -0 "$PID" 2>/dev/null; then
  echo "✗ Server falhou ao subir. Log:"; cat "$LOG"; exit 1
fi

URL="http://localhost:$PORT"
case "$(uname -s)" in
  Darwin) open "$URL" >/dev/null 2>&1 || true ;;
  Linux)  xdg-open "$URL" >/dev/null 2>&1 || true ;;
esac

# LAN IP — acessar do iPhone/iPad na mesma Wi-Fi (server escuta em 0.0.0.0)
LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')"

echo "✓ Dashboard live → $URL"
[ -n "$LAN_IP" ] && echo "  LAN (mesmo Wi-Fi) → http://$LAN_IP:$PORT"
echo "  team=${TEAM:-<auto>}  repo=$REPO  pid=$PID"
echo "  parar: kill $PID    log: $LOG"
echo "  obs: se LAN não abrir → libere o firewall do macOS / desative VPN / evite rede de convidados"
