#!/usr/bin/env bash

set -euo pipefail

export HOSTNAME="${APP_HOSTNAME:-0.0.0.0}"
export AUTH_TRUST_HOST="${AUTH_TRUST_HOST:-true}"

# Slim Docker image layout: the standalone bundle is copied to the app root
# (server.js next to .next/static and public), so it can be started directly.
if [ -f "server.js" ]; then
    exec node server.js
fi

if [ -f ".next/standalone/server.js" ]; then
    mkdir -p .next/standalone/.next

    if [ -d ".next/static" ]; then
        rm -rf .next/standalone/.next/static
        cp -R .next/static .next/standalone/.next/static
    fi

    if [ -d "public" ]; then
        rm -rf .next/standalone/public
        cp -R public .next/standalone/public
    fi

    exec node .next/standalone/server.js
fi

exec ./node_modules/.bin/next start -H "${HOSTNAME}" -p "${PORT:-3000}"
