#!/usr/bin/env bash
# Netlify build for Mentora: install deps, generate Prisma (with Linux engines),
# build the React app, and stage the food photos into the publish directory.
set -euo pipefail

echo "→ Installing server dependencies (skip local-only embedded Postgres)..."
npm --prefix server install --omit=optional --no-audit --no-fund

echo "→ Generating Prisma client (native + Linux/Lambda engines)..."
npm --prefix server run prisma:generate

echo "→ Installing client dependencies..."
npm --prefix client install --no-audit --no-fund

echo "→ Building the React app..."
npm --prefix client run build

echo "→ Staging food photos into the publish directory..."
mkdir -p client/dist/media/food
cp -r server/prisma/data/food/. client/dist/media/food/ 2>/dev/null || true

echo "✔ Build complete."
