# task-monitor — brainstorming

Catatan desain, dibangun bagian per bagian. Tiap bagian dikunci Iyan sebelum lanjut.

## 1. Design table

Dikunci 2026-09-24 11:00. Empat tabel.

### task

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | uuid | |
| `title` | text | |
| `description` | text | |
| `type` | enum `bug` / `feature` | |
| `status` | enum `request` / `queue` / `in-progress` / `done` / `rejected` | default `request` |
| `ordering` | integer | urutan antrean, kecil = duluan. Dipakai di status `queue`, di status lain diabaikan |
| `created_by` | uuid → `users.id` | |
| `created_at` | datetime | |
| `updated_at` | datetime | |

### task_history

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | uuid | |
| `task_id` | uuid → `task.id` | |
| `status_before` | enum, null | null = event pertama (task lahir) |
| `status_after` | enum | |
| `note` | text, null | **wajib** kalau `status_after = rejected`, opsional sisanya. Link hasil pas `done` ditaro di sini juga |
| `created_by` | uuid → `users.id` | |
| `created_at` | datetime | |

### task_attachment

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | uuid | |
| `task_id` | uuid → `task.id` | |
| `file_name` | text | nama asli dari pengunggah |
| `file_path` | text | lokasi simpan (disk / object storage) |
| `mime_type` | text | label jenis file dari browser, mis. `image/png`. Dipakai nyaring upload (cuma `image/*`) dan nampilin |
| `size` | integer | byte |
| `created_by` | uuid → `users.id` | |
| `created_at` | datetime | |

Tabel terpisah, bukan kolom di `task`: satu task bisa bawa lebih dari satu gambar, hapusnya per file.

### users

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | uuid | |
| `name` | text | |
| `email` | text, unique | |
| `role` | enum `marketing` / `developer` / `admin` | |
| `status` | enum `active` / `non-active` | |
| `created_at` | datetime | |
| `updated_at` | datetime | |

### Keputusan yang nempel di tabel

- **Login = cek email doang.** Form email → ada di `users` dan `active` → session bawa `id` + `role`. Nol password, nol tabel tambahan. Konsekuensi yang disadari: siapa pun yang tau email orang lain bisa masuk sebagai dia; `created_by` = "siapa yang ngaku". Diterima buat tool internal kantor.
- **Nol `due_date`.** Marketing gak ngisi "butuh kapan".
- **Nol `assigned_to`** di v1. Ditunda, bukan ditolak.
- **Urutan antrean** pakai `ordering`, bukan FIFO `created_at`, biar satu task bisa didahuluin.

## 2. Tech stack & DB

Dikunci 2026-09-24 11:07.

| Lapis | Pilihan | Catatan |
| --- | --- | --- |
| Framework | SvelteKit 2 + Svelte 5 (runes), TypeScript, `adapter-node` | |
| UI | Tailwind v4 + Skeleton v5 + `@lucide/svelte` | tema Skeleton belum dipilih |
| DB | PostgreSQL **eksisting** — nol container baru, cuma bikin database baru di instance yang udah ada | enum + uuid native. Instance yang mana belum disebut |
| ORM | Prisma 7 | `schema.prisma` = sumber tabel bagian 1, migration dari Prisma |
| Session | cookie HMAC (`COOKIE_SIGN_SECRET`), isi `user_id` + `role` | guard terpusat di `hooks.server.ts` lewat array `GUEST_ONLY_ROUTES` / `PUBLIC_ROUTES`, nol guard per-route |
| Upload | file ke folder lokal `[root-project]/storage/attachment/<task_id>/<uuid>.<ext>`, DB nyimpen path relatif | di Docker folder itu di-mount jadi volume; object storage kalau nanti perlu. `storage/` masuk `.gitignore` |
| Logger | winston — event key + metadata, JSON di prod, pretty di dev | |
| Layer | `routes` → `service` (Prisma) → `utils` / `server` / `components` | |
| Deploy | Docker **1 container**: app (`node build/index.js`), volume `./storage/attachment` → `/app/storage/attachment`; `DATABASE_URL` nunjuk ke Postgres eksisting | |

### Versi — semua latest, dicek `npm view` 2026-09-24

| Paket | Versi | Catatan |
| --- | --- | --- |
| `@sveltejs/kit` | 2.70.3 | |
| `svelte` | 5.57.1 | |
| `vite` | 8.3.0 | gist masih 7.x |
| `typescript` | 7.0.2 | gist masih 5.9; TS 7 = latest resmi |
| `tailwindcss` + `@tailwindcss/vite` | 4.3.3 | |
| `@skeletonlabs/skeleton` + `-svelte` | 5.0.1 | gist masih 4.12; langkah install v5 **sama persis** (dicek di skeleton.dev 2026-09-24), cuma stylesheet-nya di `src/routes/layout.css` kalau pakai `sv create` baru |
| `@sveltejs/adapter-node` | 5.5.7 | |
| `winston` | 3.19.0 | |
| `@lucide/svelte` | 1.47.0 | |
| `@prisma/client` | 7.10.0 | tag `latest` |
| `prisma` (CLI) | **7.10.0** | tag `latest` di npm nunjuk `8.0.0-rc.15` — itu RC. **Pin ke 7.10.0** biar sama sama client, jangan ikut RC |

Aturan: install pakai versi di atas, bukan yang di gist. Gist = resep langkahnya, bukan angkanya.

### Referensi

- Setup: https://gist.github.com/i-sub135/c22b8c5052f74a5d63b6b7c1e0d3a0ee — SvelteKit + Skeleton + Tailwind v4, versi paket, `vite.config.ts`, `app.css`, `app.html`, adapter-node.
- Konvensi project: https://gist.github.com/i-sub135/9d720fa076dc51ff8f132ee9ac3494ea — layer, session, hooks, logger, naming, form action (`fail()` / `redirect(303)`), nol `any`, `$env/dynamic/private`.

### Penyesuaian dari gist konvensi

- Gist itu **BFF ke upstream REST API** (`src/lib/service/api.ts` manggil HTTP keluar). task-monitor **nol upstream**, DB langsung. Struktur layer sama, isi `service` = query Prisma, bukan HTTP.
- Gist nyebut enkripsi ID route (AES). Di sini ID udah uuid, nol enkripsi tambahan.

### Belum diputusin

- Tema Skeleton (cerberus / pine / dst).
- API terpisah buat frontend lain — sekarang nggak; kalau berubah, bentuknya ikut berubah.

## 3. Aturan main

Dikunci 2026-09-24 11:34.

### Transisi status — maju doang

```
request → queue → in-progress → done
request → rejected        (developer / admin, note wajib)
```

- Nol panah balik. `done` dan `rejected` = terminal.
- `rejected` cuma dari `request`. Yang udah masuk `queue` gak bisa ditolak lagi — harus diselesaiin.
- Tiap transisi = 1 baris `task_history`.

### Hak akses

| Aksi | marketing | developer | admin |
| --- | --- | --- | --- |
| bikin task | ✓ | ✓ | ✓ |
| liat papan + detail | ✓ | ✓ | ✓ |
| ordering di kolom `request` | ✓ **semua task** di kolom itu, bukan cuma punya sendiri | ✓ | ✓ |
| ordering di kolom `queue` | ✗ | ✓ | ✓ |
| majuin status | ✗ | ✓ | ✓ |
| reject (dari `request`) | ✗ | ✓ | ✓ |
| kelola users | ✗ | ✗ | ✓ |

`ordering` hidup di dua kolom: `request` (diurutin marketing) dan `queue` (diurutin developer/admin). Di `in-progress` / `done` / `rejected` diabaikan.

### Upload

- Maks **5 MB** per file.
- Maks **5 lampiran** per task.
- Tipe: `image/*` + `application/pdf`.
- Dicek di server dari `mime_type` + ukuran, bukan dari ekstensi nama file.

### User pertama

- Admin di-seed dari env (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME`) pas app nyala, cuma kalau tabel `users` kosong.
- Setelah itu admin nambah user lewat halaman kelola users. Nol pendaftaran sendiri.
