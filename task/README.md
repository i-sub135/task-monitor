# Task Board — task-monitor

Satu tiket = satu file. ID `TM-n`. Status di dalam file. Papan ini cuma daftar.

Urutan backlog = urutan pengerjaan. Tiap tiket bisa dites sendiri sebelum lanjut ke bawahnya.

## Running

Kosong.

## Backlog

- [TM-9](backlog/TM-9.md) — Upload lampiran ke Wasabi/object storage (driver `s3` di samping `local`) — kode jadi, nunggu region + bucket + kunci buat tes ke Wasabi (AC 2, 3, 7, 8)

## Done

- [TM-1](done/TM-1.md) — Scaffold project: SvelteKit + Skeleton + Tailwind, versi pinned, adapter-node, winston, Makefile — Done
- [TM-2](done/TM-2.md) — Prisma: schema 4 tabel + 3 enum, migration awal, seed admin dari env — Done
- [TM-3](done/TM-3.md) — Auth: login email-only, session cookie HMAC, guard + role di hooks — Done
- [TM-4](done/TM-4.md) — Bikin task: form + upload lampiran ke `storage/attachment/` — Done
- [TM-5](done/TM-5.md) — Papan 5 kolom, kartu, detail, ordering per role — Done
- [TM-6](done/TM-6.md) — Transisi status maju + reject, tiap pindah = 1 baris history — Done
- [TM-7](done/TM-7.md) — Kelola users (admin) — Done
- [TM-8](done/TM-8.md) — Docker: image, compose, mount storage, Postgres eksisting — Done (AC 1–5 belum dites di container)
