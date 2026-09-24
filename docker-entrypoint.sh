#!/bin/sh
# Migrasi dulu, baru app nyala. Migrate gagal -> set -e bikin container mati, jangan nyala setengah.
set -e

echo "prisma migrate deploy..."
node_modules/.bin/prisma migrate deploy

echo "start app..."
exec node scripts/start.mjs
