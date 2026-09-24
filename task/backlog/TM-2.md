# TM-2 — Prisma: schema, migration awal, seed admin

**Type**: feature
**Status**: Ready
**Source**: `brainstorming.md` bagian 1 + bagian 3 (user pertama)
**Butuh**: TM-1

## Yang dibikin

- `prisma/schema.prisma` = terjemahan persis 4 tabel bagian 1: `task`, `task_history`, `task_attachment`, `users`. Enum `TaskType`, `TaskStatus`, `UserRole`, `UserStatus`. Semua `id` uuid (`@default(uuid())`), `email` unique, relasi FK ke `users` / `task`.
- Migration awal lewat `prisma migrate dev`, nama `init`.
- `src/lib/server/db.ts`: satu `PrismaClient` singleton.
- **Seed admin**: pas app nyala, kalau `users` kosong → insert 1 admin dari `SEED_ADMIN_EMAIL` + `SEED_ADMIN_NAME`, role `admin`, status `active`. Kalau env kosong dan tabel kosong → log error jelas, jangan diem.
- `prisma` CLI + `@prisma/client` dua-duanya **7.10.0**. Jangan ikut tag `latest` (8.0.0-rc).

## AC

1. `prisma migrate deploy` jalan bersih di database baru di Postgres eksisting.
2. Struktur tabel di DB cocok sama bagian 1 kolom per kolom (cek `\d task` dkk).
3. App nyala pertama kali → tabel `users` isi 1 baris admin dari env.
4. App nyala kedua kali → nol baris tambahan (seed idempotent).
5. `npm run check` + `build` ijo.

## Belum diputusin

- **Postgres eksisting yang mana** buat dev di i5 dan buat kantor. Tiket ini gak ngeblok: `DATABASE_URL` diisi pas mau jalan.

## History

- 2026-09-24 11:38 — ticket dibuka (Kuli Code, perintah Iyan lewat DM).
