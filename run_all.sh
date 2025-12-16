#!/usr/bin/env bash
# run_all.sh - start backend and static servers, open browser (macOS/Linux)
set -euo pipefail

# Detect if an editor is running a temporary runner file (like tempCodeRunnerFile.sh)
# and instruct the user to run the real script to avoid executing stray content.
SCRIPT_NAME="$(basename "$0")"
if [[ "$SCRIPT_NAME" == temp* || "$SCRIPT_NAME" == *CodeRunnerFile* ]]; then
  echo "It looks like your editor is executing a temporary runner ('$SCRIPT_NAME')." >&2
  echo "Run the real script from project root instead: bash run_all.sh" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# Kill process on a port if running
kill_port() {
  local port=$1
  if command -v lsof >/dev/null 2>&1; then
    local pids
    pids=$(lsof -ti tcp:"$port" || true)
    if [[ -n "$pids" ]]; then
      echo "Killing PIDs on port $port: $pids"
      echo "$pids" | xargs -r kill -9
    fi
  else
    echo "lsof not found; skipping kill for port $port"
  fi
}

kill_port 3001
kill_port 8080

# Start servers
mkdir -p server/logs
nohup node server/server.js > server/logs/server.log 2>&1 &
PID_API=$!
sleep 1
nohup node server/static_server.js > server/logs/static_server.log 2>&1 &
PID_STATIC=$!

echo "Started API (pid=$PID_API) and static server (pid=$PID_STATIC)"

# Wait for API to be ready (tries nc, /dev/tcp, curl fallbacks)
wait_for_port() {
  local port=$1
  local retries=15
  local i=0

  if command -v nc >/dev/null 2>&1; then
    while ! nc -z localhost "$port"; do
      i=$((i+1))
      if [[ $i -ge $retries ]]; then
        echo "Port $port did not open after $retries attempts (nc)" >&2
        return 1
      fi
      sleep 1
    done
    return 0
  fi

  # Try bash /dev/tcp
  if (echo > /dev/tcp/localhost/"$port") >/dev/null 2>&1; then
    return 0
  fi

  i=0
  while :; do
    if command -v curl >/dev/null 2>&1; then
      if curl --silent --max-time 1 "http://localhost:$port/" >/dev/null 2>&1; then
        return 0
      fi
    fi
    i=$((i+1))
    if [[ $i -ge $retries ]]; then
      echo "Port $port did not open after $retries attempts (fallbacks)" >&2
      return 1
    fi
    sleep 1
  done
}

if wait_for_port 3001; then
  echo "API ready on :3001"
else
  echo "API failed to start" >&2
fi

# Open browser to index.html
if command -v open >/dev/null 2>&1; then
  open "http://localhost:8080/index.html"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "http://localhost:8080/index.html"
else
  echo "Open your browser at http://localhost:8080/index.html"
fi

exit 0
