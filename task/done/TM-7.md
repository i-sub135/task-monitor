# TM-7 — Kelola users (admin)

**Type**: feature
**Status**: Done
**Source**: `brainstorming.md` bagian 1 (`users`) + bagian 3 (hak akses, user pertama)
**Butuh**: TM-3

## Yang dibikin

- `/users`: daftar semua user (nama, email, role, status). **Admin doang** — role lain 403, dan link-nya gak muncul di AppBar.
- Tambah user: form `name`, `email`, `role`. Status awal `active`. Email duplikat → `fail(400)`.
- Ubah role dan ubah status (`active` ↔ `non-active`) per user.
- Nol hapus user — `task.created_by` dan `task_history.created_by` nunjuk ke sini, riwayat harus tetep kebaca. Non-aktifin = cara "ngeluarin".
- Admin gak bisa non-aktifin **dirinya sendiri** (biar gak kekunci semua).
- Nol pendaftaran sendiri, nol password — konsisten sama TM-3.

## AC

1. Admin buka `/users` → daftar lengkap. Marketing/developer → 403.
2. Tambah user → langsung bisa login lewat `/login`. Email duplikat ditolak.
3. User di-non-aktifin → login berikutnya ditolak; session yang masih hidup jadi gak sah di request berikutnya (hooks ngecek status, bukan cuma tanda tangan cookie).
4. Admin coba non-aktifin dirinya → ditolak.

## Belum diputusin

- Nol.

## History

- 2026-09-24 11:38 — ticket dibuka (Kuli Code, perintah Iyan lewat DM).
- 2026-09-24 18:45 — beres, dipindah ke done. AC 1–4 terpenuhi dan udah dipakai di browser Iyan. Beda dari tiket: login sekarang di `/` (bukan `/login`), admin wajib password `AUTH_ADMIN`; `/users` tampil kartu di HP dan tabel di desktop. Belum dijaga: admin bisa nurunin role dirinya sendiri.
