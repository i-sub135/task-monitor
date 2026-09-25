# TM-9 — Upload lampiran ke object storage

**Type**: feature
**Status**: In progress — kode jadi dan lolos tes lawan S3 palsu; nunggu region, bucket, dan kunci Wasabi buat AC 2, 3, 7, 8
**Source**: `brainstorming.md` bagian 2 (Upload: "object storage kalau nanti perlu") + dokumen Wasabi S3 API (https://docs.wasabi.com/apidocs/api-guides)
**Butuh**: TM-4 (lampiran), TM-8 (Docker)

## Yang dibikin

Lampiran sekarang ditulis ke folder lokal `storage/attachment/`. Tiket ini nambah pilihan simpan ke **Wasabi** (akun berbayar, keputusan Iyan 2026-09-25), lewat AWS SDK S3, tanpa ngubah alur upload dan validasinya. Driver dibikin S3-generik, jadi endpoint lain (mis. MinIO) tetap bisa dipakai lewat env.

- **Antarmuka storage** di `src/lib/server/storage/`: `put(key, bytes)`, `get(key)`, `remove(keys)`. Semua tempat yang sekarang nyentuh disk lewat tiga fungsi di `src/lib/server/attachments.ts` (`storeFiles`, `removeStored`, `readAttachment`), jadi cuma itu yang dialihkan.
- **Dua driver**: `local` (perilaku sekarang, tetap default) dan `s3`. Dipilih lewat env `STORAGE_DRIVER` (`local` atau `s3`).
- **Env buat driver `s3`**: wajib `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`. Opsional `S3_ENDPOINT` (default `https://s3.<S3_REGION>.wasabisys.com`), `S3_FORCE_PATH_STYLE` (`true` cuma buat MinIO), dan `S3_CHECKSUM` (`default` atau `when_required`, jalan keluar kalau Wasabi nolak checksum bawaan SDK, tanpa deploy ulang kode). Masuk `.env.example` dengan isi kosong dan ikut ke `compose.yml`. Nol nilai rahasia di repo. Endpoint harus cocok sama region bucket.
- **Key objek** = nilai `task_attachment.file_path` apa adanya: `storage/attachment/<task_id>/<uuid>.<ext>` (awalan `storage/` ikut, sama kayak yang udah ada di DB). Sama buat semua driver, jadi nol perubahan schema, nol migration, dan baris lama tetap valid. Kalau nanti file lama mau dipindah ke bucket: `storage/attachment/` di disk disalin ke prefix `storage/attachment/` di bucket.
- **Validasi tetap di server sebelum `put`**: jumlah, ukuran (`UPLOAD_SIZE_LIMIT`), magic number, SVG ditolak. Objek yang udah ke-upload tapi transaksi DB gagal → dihapus lagi (perilaku sekarang).
- **`/attachment/<id>`** tetap login-only, isi dialirkan lewat app (bukan link publik), `nosniff` + CSP sandbox tetap. Nol bucket publik.
- Startup: `STORAGE_DRIVER=s3` tapi env S3 kurang → app gagal nyala dengan pesan yang nyebut env mana yang kosong (pola sama kayak `UPLOAD_SIZE_LIMIT`).
- Library S3: `@aws-sdk/client-s3`, **versi dipin** (bukan `^`). Terbaru pas tiket ini ditulis: `3.1140.0` (dicek `npm view` 2026-09-25, Node ≥20, image Docker pakai Node 24), cek ulang pas ngerjain. Operasi yang dipakai: `PutObjectCommand`, `GetObjectCommand`, `DeleteObjectCommand`. `@aws-sdk/lib-storage` (multipart) gak perlu: file maks `UPLOAD_SIZE_LIMIT`, default 5 MB.
- **Kredensial**: sub-user Wasabi khusus dengan policy cuma buat bucket itu (Get/Put/DeleteObject di `attachment/*`), bukan root key. Nilainya diisi lewat env di host, nggak pernah lewat chat atau repo.

## AC

1. `STORAGE_DRIVER` kosong atau `local`: upload, baca, dan hapus-kalau-gagal jalan persis kayak sebelum tiket ini (nol regresi).
2. `STORAGE_DRIVER=s3` ke Wasabi: task dengan 3 gambar + 1 PDF → 4 objek di bucket, 4 baris `task_attachment`, semuanya kebuka di detail.
3. Transaksi gagal di tengah → nol objek sisa di bucket.
4. `/attachment/<id>` tanpa login → redirect. Key di luar prefix `storage/attachment/` (termasuk `..`) gak bisa dibaca dan gak pernah sampai ke disk atau jaringan.
5. `STORAGE_DRIVER=s3` dengan env S3 kurang → app gagal start dengan pesan jelas.
6. Container dengan driver `s3` gak nulis apa pun ke `storage/attachment` (mount di compose tetap ada, boleh kosong).
7. Upload ke Wasabi **jalan dengan `S3_CHECKSUM=default`**. Kalau ditolak (403/400 soal checksum), set `S3_CHECKSUM=when_required` (SDK berhenti ngirim header `x-amz-checksum-crc32`) dan catat di History yang mana yang dipakai.
8. Kredensial salah / bucket salah → upload gagal dengan pesan error di log dan form (`fail(500)`), bukan app mati; nol objek atau baris DB setengah jadi.

Verifikasi manual (keputusan v1: nol test otomatis). Dites di Docker host (`maal-app-s01`), bukan di i5, dengan bucket uji sendiri. Kunci diminta lewat entri tersembunyi, dan objek uji dihapus setelahnya.

## Catatan Wasabi (dari dokumen, dibaca 2026-09-25)

- S3-compatible penuh, auth AWS Signature V4. AWS SDK for JavaScript v3 "certified" dan dipakai konsol Wasabi sendiri.
- Wasabi otomatis ngasih checksum MD5 ke tiap objek baru; CRC/SHA tambahan didukung, CRC64NVME cuma lewat CLI/API. Belum ketahuan apakah checksum bawaan SDK terbaru (CRC32) diterima, makanya AC 7.
- **Minimum storage duration**: objek yang dihapus sebelum 90 hari (atau 30, tergantung paket) tetap ditagih sisa harinya. App gak punya fitur hapus lampiran; yang menghapus cuma cleanup transaksi gagal (jarang) dan objek uji. Cek paket akun buat angka pastinya.
- Error umum: 403 = key/secret/signature salah, 404 = bucket/objek gak ada, 409 = nama bucket sudah dipakai.
- **Belum terbukti di Wasabi**: di S3 asli, `GetObject` buat key yang gak ada dijawab 403 (bukan 404) kalau policy user gak punya `s3:ListBucket`. Kalau Wasabi begitu juga, lampiran yang hilang muncul sebagai error 500 di log, bukan 404. Tambahin `s3:ListBucket` (buat bucket itu) ke policy kalau mau 404 yang rapi.

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
- 2026-09-25 08:08 — kode jadi, belum ke Wasabi. Dibikin: `src/lib/server/storage/` (`types`, `keys`, `local`, `s3`, `config`, `index`), `attachments.ts`, `/attachment/[id]`, `task/new`, dan `hooks.server.ts` dialihkan ke driver; `@aws-sdk/client-s3` `3.1140.0` dipin (di `dependencies`, external di build). Koreksi dari draft: key objek = `storage/attachment/...` (sama kayak `file_path` di DB), bukan `attachment/...`. Env baru `S3_CHECKSUM`. Dites (skrip sementara, sudah dihapus): parsing env, penjaga key (traversal), driver `local` di folder sementara, driver `s3` lawan server S3 palsu di dalam proses, 28 pengecekan lulus. Yang keliatan dari server palsu: mode `default` ngirim `x-amz-checksum-crc32` + `x-amz-sdk-checksum-algorithm: CRC32`, mode `when_required` nggak ngirim header checksum sama sekali. `npm run check` 0 error, `npm run build` sukses. Belum: AC 2, 3, 7, 8 lawan Wasabi asli (butuh region, bucket, kunci).
- 2026-09-25 08:15 — dites di Docker host `maal-app-s01` dari commit `c332832` (image, Postgres, dan S3 palsu sekali pakai; semua dibuang, kondisi host identik sama sebelumnya). Image 861 MB (+17 MB dari SDK, `@aws-sdk/client-s3` 3.1140.0 ada di `node_modules` produksi). Lulus: (A) `local` sebagai uid 1001, upload/baca/restart/413/400 sama kayak sebelum TM-9 (AC 1). (B) env S3 kurang, driver salah, endpoint bukan URL, `S3_CHECKSUM` salah → container keluar kode 1 dengan pesan yang nyebut env yang salah, tanpa rahasia di log (AC 5). (C) `s3` lewat app lawan S3 palsu tanpa mount storage: file masuk bucket dengan key = `file_path` di DB, kebaca lewat `/attachment/<id>` (juga setelah restart), tanpa login diarahin ke `/`, nol file ditulis ke disk container; PUT ke-2 ditolak → 500 "Gagal menyimpan task" dan bucket balik cuma berisi task sebelumnya, nol task/lampiran nyangkut di DB (AC 3 versi S3 palsu); bucket ditolak 403 → 500 dengan `task.create.failed` `storage=s3`, app tetap hidup, DB gak berubah (AC 8 versi S3 palsu). Header dari SDK di mode `default`: PUT `x-amz-checksum-crc32` + `x-amz-sdk-checksum-algorithm`, GET `x-amz-checksum-mode`; di mode `when_required` keduanya hilang. **Semua ini lawan S3 palsu. AC 2, 3, 7, 8 lawan Wasabi asli belum, nunggu region, bucket, dan kunci.**
