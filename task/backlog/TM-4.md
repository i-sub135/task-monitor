# TM-4 — Bikin task: form + upload lampiran

**Type**: feature
**Status**: Ready
**Source**: `brainstorming.md` bagian 1 (`task`, `task_attachment`) + bagian 3 (upload)
**Butuh**: TM-3

## Yang dibikin

- `/task/new`: form `title`, `description`, `type` (bug/feature), lampiran (multi-file). Semua role boleh.
- Action:
  1. Validasi: title + description wajib, type harus enum.
  2. Lampiran: maks **5 file**, tiap file maks **5 MB**, `mime_type` harus `image/*` atau `application/pdf`. Dicek di **server** dari mime + ukuran, bukan ekstensi. Lewat batas → `fail(400)` + nilai form dikembaliin.
  3. Simpan file ke `storage/attachment/<task_id>/<uuid>.<ext>`. DB (`task_attachment.file_path`) nyimpen path **relatif** dari root project.
  4. Insert `task` (status `request`, `ordering` = max ordering di kolom `request` + 1, `created_by` = user login).
  5. Insert `task_history` baris pertama: `status_before = null`, `status_after = request`.
  6. Semua dalam 1 transaksi Prisma. File yang udah ditulis tapi transaksi gagal → dihapus lagi.
  7. Sukses → `redirect(303, '/task/<id>')`.
- `/task/<id>`: halaman detail — judul, deskripsi, type, status, peminta, lampiran (gambar ditampilin, PDF jadi link), riwayat dari `task_history`.
- Endpoint baca lampiran `/attachment/<id>`: cuma buat yang login, kirim file dengan `Content-Type` dari `mime_type`. Nol akses langsung ke folder `storage/`.

## AC

1. Task tanpa lampiran masuk `request`, `task_history` punya 1 baris, `ordering` paling belakang.
2. Task dengan 3 gambar + 1 PDF: 4 file di disk, 4 baris `task_attachment`, semuanya kebuka di detail.
3. File ke-6, file 6 MB, file `.exe` yang di-rename `.png` — tiga-tiganya ditolak di server, form balik dengan nilai yang udah diisi.
4. Transaksi gagal di tengah → nol file sisa di `storage/`.
5. `/attachment/<id>` tanpa login → 401/redirect. Path di luar `storage/attachment/` gak bisa diakses (nol path traversal).
6. Test buat AC 3 dan 5.

## Belum diputusin

- Deskripsi pakai markdown atau teks polos. Sementara teks polos, newline dihormati.

## History

- 2026-09-24 11:38 — ticket dibuka (Kuli Code, perintah Iyan lewat DM).
