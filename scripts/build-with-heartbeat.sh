#!/usr/bin/env bash

set -euo pipefail

HEARTBEAT_INTERVAL="${BUILD_HEARTBEAT_INTERVAL:-20}"
HEARTBEAT_PID=""

start_heartbeat() {
  while true; do
    sleep "${HEARTBEAT_INTERVAL}"
    printf '[build-heartbeat] next build is still running at %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  done
}

stop_heartbeat() {
  if [ -n "${HEARTBEAT_PID}" ] && kill -0 "${HEARTBEAT_PID}" >/dev/null 2>&1; then
    kill "${HEARTBEAT_PID}" >/dev/null 2>&1 || true
    wait "${HEARTBEAT_PID}" 2>/dev/null || true
  fi
}

trap stop_heartbeat EXIT INT TERM

echo "[build] Generating Prisma client..."
npx prisma generate

echo "[build] Starting Next.js production build..."
start_heartbeat &
HEARTBEAT_PID="$!"

npx next build
echo "[build] Next.js production build completed."
