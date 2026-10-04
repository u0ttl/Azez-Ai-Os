#!/bin/sh
set -e
echo "Running Prisma migrations..."
# Prisma 7 loads prisma.config.ts from the current directory
cd ./packages/database
if [ -f "./node_modules/.bin/prisma" ]; then
  ./node_modules/.bin/prisma migrate deploy
else
  ../node_modules/.bin/prisma migrate deploy
fi
cd /app
echo "Starting API..."
exec node apps/api/dist/src/main.js
