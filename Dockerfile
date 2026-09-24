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

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY package.json prisma.config.ts ./
COPY prisma ./prisma
# scripts/start.mjs import upload-limits.js buat nurunin BODY_SIZE_LIMIT dari UPLOAD_SIZE_LIMIT.
COPY scripts ./scripts
COPY src/lib/upload-limits.js ./src/lib/upload-limits.js
COPY docker-entrypoint.sh ./

# Lampiran ditulis ke /app/storage/attachment (di-mount dari host lewat compose).
RUN mkdir -p storage/attachment && chown -R node:node /app
USER node

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
