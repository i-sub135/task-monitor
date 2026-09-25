# TM-9 — Upload lampiran ke object storage

**Type**: feature
**Status**: Ready
**Source**: `brainstorming.md` bagian 2 (Upload: "object storage kalau nanti perlu") + dokumen Wasabi S3 API (https://docs.wasabi.com/apidocs/api-guides)
**Butuh**: TM-4 (lampiran), TM-8 (Docker)

## Yang dibikin

Lampiran sekarang ditulis ke folder lokal `storage/attachment/`. Tiket ini nambah pilihan simpan ke **Wasabi** (akun berbayar, keputusan Iyan 2026-09-25), lewat AWS SDK S3, tanpa ngubah alur upload dan validasinya. Driver dibikin S3-generik, jadi endpoint lain (mis. MinIO) tetap bisa dipakai lewat env.

- **Antarmuka storage** di `src/lib/server/storage/`: `put(key, bytes)`, `get(key)`, `remove(keys)`. Semua tempat yang sekarang nyentuh disk lewat tiga fungsi di `src/lib/server/attachments.ts` (`storeFiles`, `removeStored`, `readAttachment`), jadi cuma itu yang dialihkan.
- **Dua driver**: `local` (perilaku sekarang, tetap default) dan `s3`. Dipilih lewat env `STORAGE_DRIVER` (`local` atau `s3`).
- **Env buat driver `s3`**: wajib `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`. Opsional `S3_ENDPOINT` (default `https://s3.<S3_REGION>.wasabisys.com`; region `us-east-1` juga punya alias `s3.wasabisys.com`) dan `S3_FORCE_PATH_STYLE` (cuma buat MinIO). Masuk `.env.example` dengan isi kosong dan ikut ke `compose.yml`. Nol nilai rahasia di repo. Endpoint harus cocok sama region bucket.
- **Key objek** = path relatif yang sama kayak sekarang: `attachment/<task_id>/<uuid>.<ext>`. `task_attachment.file_path` tetap nyimpen key itu, jadi nol perubahan schema dan nol migration.
- **Validasi tetap di server sebelum `put`**: jumlah, ukuran (`UPLOAD_SIZE_LIMIT`), magic number, SVG ditolak. Objek yang udah ke-upload tapi transaksi DB gagal → dihapus lagi (perilaku sekarang).
- **`/attachment/<id>`** tetap login-only, isi dialirkan lewat app (bukan link publik), `nosniff` + CSP sandbox tetap. Nol bucket publik.
- Startup: `STORAGE_DRIVER=s3` tapi env S3 kurang → app gagal nyala dengan pesan yang nyebut env mana yang kosong (pola sama kayak `UPLOAD_SIZE_LIMIT`).
- Library S3: `@aws-sdk/client-s3`, **versi dipin** (bukan `^`). Terbaru pas tiket ini ditulis: `3.1140.0` (dicek `npm view` 2026-09-25, Node ≥20, image Docker pakai Node 24), cek ulang pas ngerjain. Operasi yang dipakai: `PutObjectCommand`, `GetObjectCommand`, `DeleteObjectCommand`. `@aws-sdk/lib-storage` (multipart) gak perlu: file maks `UPLOAD_SIZE_LIMIT`, default 5 MB.
- **Kredensial**: sub-user Wasabi khusus dengan policy cuma buat bucket itu (Get/Put/DeleteObject di `attachment/*`), bukan root key. Nilainya diisi lewat env di host, nggak pernah lewat chat atau repo.

## AC

1. `STORAGE_DRIVER` kosong atau `local`: upload, baca, dan hapus-kalau-gagal jalan persis kayak sebelum tiket ini (nol regresi).
2. `STORAGE_DRIVER=s3` ke Wasabi: task dengan 3 gambar + 1 PDF → 4 objek di bucket, 4 baris `task_attachment`, semuanya kebuka di detail.
3. Transaksi gagal di tengah → nol objek sisa di bucket.
4. `/attachment/<id>` tanpa login → redirect. Key di luar prefix `attachment/` gak bisa dibaca.
5. `STORAGE_DRIVER=s3` dengan env S3 kurang → app gagal start dengan pesan jelas.
6. Container dengan driver `s3` jalan tanpa mount `storage/attachment`.
7. Upload ke Wasabi **jalan dengan konfigurasi checksum bawaan SDK**. Kalau ditolak (403/400 soal checksum), pasang `requestChecksumCalculation: "WHEN_REQUIRED"` di `S3Client` (nama opsinya ada di `@aws-sdk/client-s3` 3.1140.0; nilai `WHEN_REQUIRED` dicek lagi di dokumen SDK pas ngerjain) dan catat di History yang mana yang dipakai.
8. Kredensial salah / bucket salah → upload gagal dengan pesan error di log dan form (`fail(500)`), bukan app mati; nol objek atau baris DB setengah jadi.

Verifikasi manual (keputusan v1: nol test otomatis). Dites di Docker host (`maal-app-s01`), bukan di i5, dengan bucket uji sendiri. Kunci diminta lewat entri tersembunyi, dan objek uji dihapus setelahnya.

## Catatan Wasabi (dari dokumen, dibaca 2026-09-25)

- S3-compatible penuh, auth AWS Signature V4. AWS SDK for JavaScript v3 "certified" dan dipakai konsol Wasabi sendiri.
- Wasabi otomatis ngasih checksum MD5 ke tiap objek baru; CRC/SHA tambahan didukung, CRC64NVME cuma lewat CLI/API. Belum ketahuan apakah checksum bawaan SDK terbaru (CRC32) diterima, makanya AC 7.
- **Minimum storage duration**: objek yang dihapus sebelum 90 hari (atau 30, tergantung paket) tetap ditagih sisa harinya. App gak punya fitur hapus lampiran; yang menghapus cuma cleanup transaksi gagal (jarang) dan objek uji. Cek paket akun buat angka pastinya.
- Error umum: 403 = key/secret/signature salah, 404 = bucket/objek gak ada, 409 = nama bucket sudah dipakai.

## Belum diputusin

- **Region bucket** (mis. `ap-southeast-1` Singapore, paling dekat ke Indonesia, tapi pilihan Iyan) dan **nama bucket**.
- **File lama di disk**: dimigrasi ke bucket (butuh skrip sekali jalan) atau dibiarin? Sementara: **nol migrasi**, `s3` dipakai buat instalasi baru. Kalau dibutuhin, jadi tiket sendiri.
- **Baca lampiran**: dialirkan lewat app (sementara, paling sederhana dan tetap login-only) vs presigned URL berumur pendek (ringan buat app, tapi link bisa dibagi selama berlaku, dan butuh `@aws-sdk/s3-request-presigner`).
- **Bucket**: satu bucket dengan prefix per environment atau bucket per environment. Sementara satu bucket, prefix `attachment/`.
- **`file_path` untuk driver `s3`**: sementara sama dengan key. Kalau nanti butuh nyimpen nama bucket per baris, itu perubahan schema dan perlu diskusi.

Sudah diputusin: provider = Wasabi, akun berbayar (Iyan, 2026-09-25).

## History

- 2026-09-24 19:05 — ticket dibuka (Kuli Oriental, perintah Iyan lewat DM: "buat fungsi upload ke objek storage"). Isi di atas draft dari kondisi kode sekarang; bagian "Belum diputusin" butuh keputusan Iyan sebelum dikerjain.
- 2026-09-25 08:02 — diupdate setelah baca dokumen Wasabi dan cek SDK: provider diputusin Wasabi (berbayar), env disederhanain, AC 7–8 ditambah (checksum bawaan SDK, kredensial salah), catatan minimum storage duration. Sisa keputusan: region + nama bucket, nasib file lama, cara baca, bucket per env.
