# TM-5 — Papan: 5 kolom, kartu, ordering per role

**Type**: feature
**Status**: Ready
**Source**: `brainstorming.md` bagian 3 (hak akses, ordering)
**Butuh**: TM-4

## Yang dibikin

- `/` = papan. Lima kolom: `request`, `queue`, `in-progress`, `done`, `rejected`. Desktop sejajar; HP jadi tab per kolom.
- Kartu nampilin: nomor urut di kolom (buat `request` dan `queue`), judul, type, peminta, umur (hari sejak `created_at`). Klik → `/task/<id>`.
- Angka ringkas di atas papan: total task, berapa di `queue`, berapa `done` 7 hari terakhir.
- Ordering:
  - Kolom `request`: **marketing, developer, admin** boleh geser **semua** kartu di kolom itu (keputusan Iyan: bukan cuma punya sendiri).
  - Kolom `queue`: **developer, admin** doang.
  - Kolom lain: nol ordering.
  - Server yang ngecek role + kolom, bukan cuma UI nyembunyiin tombol.
- Action reorder nerima `taskId` + `newOrdering`; server geser yang lain biar nol duplikat, dalam 1 transaksi.

## AC

1. Semua role liat 5 kolom + isi yang sama.
2. Marketing geser kartu orang lain di `request` → berhasil. Marketing geser di `queue` → ditolak server (403), UI gak nampilin kontrolnya.
3. Developer geser di `queue` → berhasil; urutan baru kebaca sama user lain setelah refresh.
4. Nomor urut di kartu selalu 1..n tanpa lompat, setelah geser apa pun.
5. Di HP (lebar 390px) tiap kolom bisa dibuka lewat tab, kartu kebaca tanpa scroll horizontal.
6. Test buat AC 2 dan 4.

## Belum diputusin

- **Cara reorder**: tombol naik/turun vs drag-and-drop. Sementara **tombol naik/turun** — jalan tanpa JS ekstra, enak di HP. Drag nyusul kalau kepake.

## History

- 2026-09-24 11:38 — ticket dibuka (Kuli Code, perintah Iyan lewat DM).
