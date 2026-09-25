# task-monitor

Papan antrean request buat tim non-teknis. Marketing ngajuin request lewat form, developer nge-triase, semua orang liat sendiri request-nya ada di kolom mana dan nomor berapa di antrean — tanpa nanya.

Enam kolom, maju doang: `request → queue → in-progress → ready-to-test → done`, plus `rejected` dari `request`.

## Stack

SvelteKit 2 + Svelte 5 · Tailwind 4 + Skeleton 5 · PostgreSQL (eksisting) + Prisma 7 · adapter-node · Docker 1 container.

Versi paket, tabel, dan aturan main dikunci di [`brainstorming.md`](brainstorming.md). Itu sumber kebenaran desain — kalau kode dan dokumen itu beda, dokumen yang menang sampai diubah lewat diskusi.

## Kerjaan

Papan tiket di [`task/README.md`](task/README.md). Tiket per file di `task/backlog/` dan `task/done/`.

## Jalanin

Butuh Node (image Docker pakai 24) dan satu database PostgreSQL kosong.

```sh
npm install
cp .env.example .env        # isi, lihat tabel di bawah
npm run db:generate         # bikin Prisma client (gitignored, wajib setelah install)
npm run db:deploy           # jalanin migration ke DATABASE_URL
npm run dev                 # http://localhost:5173
```

Pertama kali nyala, user admin dibikin otomatis dari `SEED_ADMIN_EMAIL` + `SEED_ADMIN_NAME` (cuma kalau tabel `users` kosong). Login admin minta password `AUTH_ADMIN`.

Production tanpa Docker: `npm run build && npm start`. Pakai `npm start`, jangan `node build` langsung, karena launcher-nya yang nerjemahin `UPLOAD_SIZE_LIMIT` ke batas request adapter-node.

Docker (1 container, Postgres tetap yang eksisting lewat `DATABASE_URL`): isi `.env`, lalu `make docker-build` dan `make docker-up`. Di dalam container, Postgres di mesin host dijangkau lewat `host.docker.internal`, bukan `localhost`. Lampiran ke-mount di `./storage/attachment`; container jalan sebagai uid/gid user yang manggil `make docker-up` (kalau pakai `docker compose up` langsung, set `APP_UID` dan `APP_GID` sendiri, defaultnya 1000, biar bisa nulis ke folder itu). Perintah lain: `make docker-logs`, `make docker-down`.

| Env | Wajib | Isi |
| --- | --- | --- |
| `DATABASE_URL` | ya | koneksi Postgres |
| `COOKIE_SIGN_SECRET` | ya | rahasia penanda tangan cookie session |
| `AUTH_ADMIN` | ya | password login role admin |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME` | ya | admin pertama, dipakai cuma kalau `users` kosong |
| `ORIGIN` | production | URL yang dibuka di browser, mis. `https://tasks.example.com`. Tanpa ini POST form ditolak 403 |
| `UPLOAD_SIZE_LIMIT` | tidak | ukuran maksimal per file lampiran, default `5M` |
| `STORAGE_DRIVER` | tidak | tempat lampiran: `local` (default, folder `storage/attachment`) atau `s3` |
| `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` | kalau `s3` | bucket Wasabi/S3. Pakai sub-user khusus bucket itu, bukan root key |
| `S3_ENDPOINT` | tidak | default `https://s3.<S3_REGION>.wasabisys.com` |
| `S3_FORCE_PATH_STYLE` | tidak | `true` cuma buat MinIO |
| `S3_CHECKSUM` | tidak | `default` atau `when_required`; pakai `when_required` kalau provider nolak checksum bawaan SDK |
| `APP_VERSION` | tidak | tag image Docker, default `dev` |
| `APP_PORT` | tidak | port di host untuk Docker, default `3000` |

## Referensi

- Setup SvelteKit + Skeleton: https://gist.github.com/i-sub135/c22b8c5052f74a5d63b6b7c1e0d3a0ee
- Konvensi project: https://gist.github.com/i-sub135/9d720fa076dc51ff8f132ee9ac3494ea
