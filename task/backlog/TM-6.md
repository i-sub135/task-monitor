# TM-6 — Transisi status: maju + reject, tiap pindah = 1 baris history

**Type**: feature
**Status**: In progress — kode jadi, sisa AC test
**Source**: `brainstorming.md` bagian 3 (transisi status)
**Butuh**: TM-5

## Yang dibikin

- Satu action `transition` di `/task/<id>`: input `to` (status tujuan) + `note` (opsional, **wajib** kalau `to = rejected`).
- Aturan di **server**, satu tempat (`src/lib/server/transition.ts`), bukan tersebar di UI:

  ```
  request     → queue | rejected
  queue       → in-progress
  in-progress → done
  done        → (terminal)
  rejected    → (terminal)
  ```

- Role: cuma `developer` dan `admin`. Marketing nol tombol dan nol akses action.
- Tiap transisi sah: update `task.status` + `updated_at`, insert `task_history` (`status_before`, `status_after`, `note`, `created_by`), 1 transaksi.
- Pindah ke `queue`: `ordering` diset paling belakang di kolom `queue`. Pindah keluar dari `request`/`queue`: `ordering` dibiarin, gak dipakai.
- Detail `/task/<id>` nampilin tombol cuma buat transisi yang sah dari status sekarang, dan riwayat lengkap dari lahir.
- Link hasil pas `done`: ditulis di `note` transisi itu (keputusan bagian 1).

## AC

1. `request → queue → in-progress → done` jalan berurutan, `task_history` jadi 5 baris (lahir + 4).
2. `done → in-progress`, `queue → request`, `in-progress → rejected` — semua ditolak server (400), nol baris history baru.
3. `request → rejected` tanpa `note` ditolak; dengan `note` masuk, kartu pindah ke kolom `rejected`.
4. Marketing kirim action transition langsung (tanpa UI) → 403.
5. Test buat AC 1–4.

## Belum diputusin

- Nol.

## History

- 2026-09-24 11:38 — ticket dibuka (Kuli Code, perintah Iyan lewat DM).
- 2026-09-24 18:45 — kode jadi. Sisa AC 5: test AC 1–4 belum ada (repo belum punya test framework). Spek berubah: 6 status (`in-progress → ready-to-test → done`), aturan transisi ada di `src/lib/tasks.ts` dan `src/lib/server/tasks.ts`, bukan `transition.ts`.
