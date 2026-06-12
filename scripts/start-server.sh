#!/usr/bin/env bash

set -euo pipefail

export HOSTNAME="${APP_HOSTNAME:-0.0.0.0}"
export AUTH_TRUST_HOST="${AUTH_TRUST_HOST:-true}"

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
