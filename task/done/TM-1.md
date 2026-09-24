# TM-1 — Scaffold project

**Type**: chore
**Status**: Done
**Source**: `brainstorming.md` bagian 2

## Yang dibikin

Project SvelteKit kosong yang udah bawa semua fondasi bagian 2, tanpa fitur apa pun.

- `npx sv create --types ts` (template minimal), lalu ikut langkah gist setup: Tailwind v4 (`@tailwindcss/vite` + `@tailwindcss/postcss`), Skeleton v5, `@lucide/svelte`, `adapter-node`, `winston`, `@types/node`.
- **Versi pinned** ke tabel di `brainstorming.md` bagian 2 — bukan `^`, bukan angka di gist.
- `src/lib/server/logger.ts` ikut konvensi gist: event key + metadata, JSON di prod, pretty di dev.
- `hooks.server.ts` minimal: request logging aja (guard nyusul di TM-3).
- `.gitignore`: `node_modules/`, `build/`, `.env*` (kecuali `.env.example`), `storage/`, `logs/`.
- `.env.example` berisi nama semua env yang bakal dipakai (isi kosong): `DATABASE_URL`, `COOKIE_SIGN_SECRET`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME`, `ORIGIN`, `APP_VERSION`.
- `Makefile`: `install`, `dev`, `build`, `check`, `test`.
- `src/app.html` pakai `data-theme`.

## AC

1. `npm run check` 0 error, `npm run build` sukses.
2. `npm run dev` → `/` balik 200, halaman kosong pakai Skeleton AppBar.
3. `package.json` versi persis tabel bagian 2 (dicek satu-satu).
4. Log request muncul di console dev dengan format event key + metadata.
5. `git status` bersih setelah `npm run build` (nol artefak ke-track).
6. `README.md` bagian "Jalanin" diisi.

## Belum diputusin

- **Tema Skeleton** — sementara `cerberus` (default gist), ganti gampang.

## History

- 2026-09-24 11:38 — ticket dibuka (Kuli Code, perintah Iyan lewat DM).
- 2026-09-24 18:45 — kode jadi (scaffold, tema rosepine, favicon, layout mobile). Sisa AC 6: README bagian "Jalanin" masih kosong. Catatan AC 3: TypeScript dipin 6.0.3 (TS 7 bikin svelte-check dan type generation rusak), jadi beda dari tabel `brainstorming.md`.
- 2026-09-24 19:00 — beres, dipindah ke done. README bagian "Jalanin" udah diisi (AC 6). AC 3: TypeScript 6.0.3, bukan 7.0.2 di tabel lama; `brainstorming.md` udah disinkronin. Tema akhirnya `rosepine`, bukan `cerberus`.
