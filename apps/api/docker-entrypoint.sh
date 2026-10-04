#!/bin/sh
set -e
echo "Running Prisma migrations..."
# pnpm isolates bins per-package; prisma lives in the database package
PRISMA="./packages/database/node_modules/.bin/prisma"
if [ ! -f "$PRISMA" ]; then
  PRISMA="./node_modules/.bin/prisma"
fi
"$PRISMA" migrate deploy --schema ./packages/database/prisma/schema.prisma
echo "Starting API..."
exec node apps/api/dist/src/main.js
