# TM-8 — Docker: image, compose, mount storage, Postgres eksisting

**Type**: chore
**Status**: Done
**Source**: `brainstorming.md` bagian 2 (deploy, upload)
**Butuh**: TM-1 (bisa dikerjain paralel sama TM-2..7; final dites setelah TM-7)

## Yang dibikin

- `Dockerfile` multi-stage: stage build (`npm ci`, `prisma generate`, `npm run build`), stage runtime node alpine cuma bawa `build/`, `node_modules` produksi, `prisma/` (buat `migrate deploy`). Jalan `node build/index.js`.
- `.dockerignore`: `node_modules`, `build`, `.env*`, `storage`, `logs`, `.git`.
- `compose.yml`, **1 service** `app`:
  - env: `DATABASE_URL`, `COOKIE_SIGN_SECRET`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME`, `ORIGIN` (`:?` wajib, tanpa itu POST dari browser ditolak — pelajaran ternakagentic 21 Sep), `NODE_ENV=production`.
  - volume: `./storage/attachment:/app/storage/attachment`.
  - port: `127.0.0.1:<port>:3000` — bind localhost, reverse proxy di depan urusan mesin.
  - **Nol service postgres.** DB = instance eksisting lewat `DATABASE_URL`.
- Entrypoint: `prisma migrate deploy` dulu, baru app nyala. Migrate gagal → container mati dengan log jelas, jangan nyala setengah.
- `Makefile`: `docker-build`, `docker-up`, `docker-down`, `docker-logs`.

## AC

1. `make docker-build` sukses, image nol `.env` di dalamnya (`docker run --rm <img> ls -la /app`).
2. `docker compose up` dengan `DATABASE_URL` ke Postgres eksisting → migrate jalan, seed admin masuk, `/login` 200.
3. Upload lampiran dari container → file muncul di `./storage/attachment/` host. Container di-restart → file masih ada dan masih kebuka.
4. `ORIGIN` kosong → compose nolak start (bukan app nyala terus POST 403).
5. `docker compose down` + `up` lagi → nol migrate ulang, nol seed ulang.

## Belum diputusin

- Port di host, dan reverse proxy apa di mesin kantor. Di luar tiket ini.

## History

- 2026-09-24 11:38 — ticket dibuka (Kuli Code, perintah Iyan lewat DM).
- 2026-09-24 18:36 — kode kelar (commit 418a33c), dipindah ke done atas perintah Iyan. AC 1–5 belum dites: image belum pernah di-build/dijalanin, tes ada di Mac Iyan. Catatan: login sekarang di `/`, bukan `/login` (AC 2), dan `UPLOAD_SIZE_LIMIT` ikut compose (default 5M).
