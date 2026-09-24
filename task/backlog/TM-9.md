# TM-9 — Upload lampiran ke object storage

**Type**: feature
**Status**: Ready
**Source**: `brainstorming.md` bagian 2 (Upload: "object storage kalau nanti perlu")
**Butuh**: TM-4 (lampiran), TM-8 (Docker)

## Yang dibikin

Lampiran sekarang ditulis ke folder lokal `storage/attachment/`. Tiket ini nambah pilihan simpan ke object storage yang kompatibel S3 (mis. MinIO), tanpa ngubah alur upload dan validasinya.

- **Antarmuka storage** di `src/lib/server/storage/`: `put(key, bytes)`, `get(key)`, `remove(keys)`. Semua tempat yang sekarang nyentuh disk lewat tiga fungsi di `src/lib/server/attachments.ts` (`storeFiles`, `removeStored`, `readAttachment`), jadi cuma itu yang dialihkan.
- **Dua driver**: `local` (perilaku sekarang, tetap default) dan `s3`. Dipilih lewat env `STORAGE_DRIVER` (`local` atau `s3`).
- **Env buat driver `s3`**: `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_FORCE_PATH_STYLE`. Masuk `.env.example` dengan isi kosong dan ikut ke `compose.yml`. Nol nilai rahasia di repo.
- **Key objek** = path relatif yang sama kayak sekarang: `attachment/<task_id>/<uuid>.<ext>`. `task_attachment.file_path` tetap nyimpen key itu, jadi nol perubahan schema dan nol migration.
- **Validasi tetap di server sebelum `put`**: jumlah, ukuran (`UPLOAD_SIZE_LIMIT`), magic number, SVG ditolak. Objek yang udah ke-upload tapi transaksi DB gagal → dihapus lagi (perilaku sekarang).
- **`/attachment/<id>`** tetap login-only, isi dialirkan lewat app (bukan link publik), `nosniff` + CSP sandbox tetap. Nol bucket publik.
- Startup: `STORAGE_DRIVER=s3` tapi env S3 kurang → app gagal nyala dengan pesan yang nyebut env mana yang kosong (pola sama kayak `UPLOAD_SIZE_LIMIT`).
- Library S3: `@aws-sdk/client-s3`, **versi dipin** (cek `npm view` pas ngerjain, bukan `^`).

## AC

1. `STORAGE_DRIVER` kosong atau `local`: upload, baca, dan hapus-kalau-gagal jalan persis kayak sebelum tiket ini (nol regresi).
2. `STORAGE_DRIVER=s3` ke MinIO: task dengan 3 gambar + 1 PDF → 4 objek di bucket, 4 baris `task_attachment`, semuanya kebuka di detail.
3. Transaksi gagal di tengah → nol objek sisa di bucket.
4. `/attachment/<id>` tanpa login → redirect. Key di luar prefix `attachment/` gak bisa dibaca.
5. `STORAGE_DRIVER=s3` dengan env S3 kurang → app gagal start dengan pesan jelas.
6. Container dengan driver `s3` jalan tanpa mount `storage/attachment`.

Verifikasi manual (keputusan v1: nol test otomatis). Dites di Docker host, bukan di i5.

## Belum diputusin

- **Provider**: MinIO mana? Di i5 ada container `minio-storage` (kelihatan di `docker ps`), tapi belum ada keputusan itu yang dipakai. Bisa juga S3 beneran atau MinIO di `maal-app-s01`.
- **File lama di disk**: dimigrasi ke bucket (butuh skrip sekali jalan) atau dibiarin dan driver baca dua tempat? Sementara: **nol migrasi**, `s3` dipakai buat instalasi baru. Kalau dibutuhin, jadi tiket sendiri.
- **Baca lampiran**: dialirkan lewat app (sementara, paling sederhana dan tetap login-only) vs presigned URL berumur pendek (ringan buat app, tapi link bisa dibagi selama berlaku).
- **Bucket**: satu bucket dengan prefix per environment atau bucket per environment. Sementara satu bucket, prefix `attachment/`.
- **`file_path` untuk driver `s3`**: sementara sama dengan key. Kalau nanti butuh nyimpen nama bucket per baris, itu perubahan schema dan perlu diskusi.

## History

- 2026-09-24 19:05 — ticket dibuka (Kuli Oriental, perintah Iyan lewat DM: "buat fungsi upload ke objek storage"). Isi di atas draft dari kondisi kode sekarang; bagian "Belum diputusin" butuh keputusan Iyan sebelum dikerjain.
