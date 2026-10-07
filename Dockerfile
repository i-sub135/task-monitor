# syntax=docker/dockerfile:1

# Stage 1: build. Semua deps (termasuk dev) buat prisma generate + vite build.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

# Stage 2: deps produksi. Script install jalan (jangan --ignore-scripts): @prisma/engines
# download schema-engine di sini, dipakai `prisma migrate deploy` pas container nyala.
FROM node:24-alpine AS deps
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev

# Stage 3: runtime. Cuma bawa build/, node_modules produksi, prisma/, dan launcher.
FROM node:24-alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production

# --chown di tiap COPY (bukan `chown -R /app` sesudahnya): di overlay filesystem, chown rekursif
# atas node_modules yang udah di-copy bikin layer baru yang isinya salinan ULANG semua file itu
# (~350 MB kepakai sia-sia cuma buat ganti pemilik, sempet kejadian pas image ini 872 MB). --chown
# nulis file langsung dengan pemilik yang bener pas di-copy, nol layer duplikat.
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/build ./build
COPY --chown=node:node package.json prisma.config.ts ./
COPY --chown=node:node prisma ./prisma
# scripts/start.mjs import upload-limits.js buat nurunin BODY_SIZE_LIMIT dari UPLOAD_SIZE_LIMIT.
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node src/lib/utils/upload-limits.js ./src/lib/utils/upload-limits.js
COPY --chown=node:node docker-entrypoint.sh ./

# Lampiran ditulis ke /app/storage/attachment (di-mount dari host lewat compose, atau volume
# bernama lewat komodo.stack.yml). Folder ini doang yang di-chown, bukan seisi /app.
RUN mkdir -p storage/attachment && chown node:node storage/attachment
USER node

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
