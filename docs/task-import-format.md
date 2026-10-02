# Format JSON import task — task-monitor

Dokumen ini buat siapa pun yang nyiapin data task untuk dimasukin langsung ke database task-monitor.
Hasil akhirnya **satu file JSON** berisi array task. JSON ini nanti dibaca script import; script yang
ngurus id, tanggal, urutan, history, dan bikin user yang belum ada.

## Bentuk file

Satu array JSON, satu object per task. Gak ada wrapper, gak ada komentar.

```json
[
  {
    "title": "Tombol checkout gak respon di Android 12",
    "description": "<p>Tombol <strong>Bayar</strong> gak bisa diklik setelah pilih metode pembayaran.</p><ul><li>Device: Samsung A52</li><li>Versi app: 2.4.1</li></ul>",
    "type": "bug",
    "platform": "mobile",
    "status": "request",
    "created_by": "budi.santoso@maal.id"
  },
  {
    "title": "Export laporan penjualan ke Excel",
    "description": "<p>Admin toko butuh export laporan harian ke .xlsx.</p>",
    "type": "feature",
    "platform": "web"
  }
]
```

## Field

| Field | Wajib | Isi |
| --- | --- | --- |
| `title` | ya | Teks biasa, satu baris, gak kosong. |
| `description` | ya | HTML terbatas (lihat bawah). Gak boleh kosong. |
| `type` | ya | Salah satu nilai enum `type`. |
| `platform` | ya | Salah satu nilai enum `platform`. |
| `status` | tidak | Salah satu nilai enum `status`. Kalau gak diisi = `request`. |
| `created_by` | tidak | Email pembuat task. Kalau gak diisi = akun admin yang jalanin import. |
| `reject_reason` | kalau `status` = `rejected` | Alasan reject, teks biasa. Field ini cuma dipakai kalau status `rejected`. |

Selain field di atas, jangan tambah field lain. Field yang gak dikenal bikin import ditolak.

## Enum (harus persis, huruf kecil semua)

### `type`

| Nilai | Arti |
| --- | --- |
| `bug` | Ada yang rusak / gak sesuai |
| `feature` | Fitur baru atau perubahan |

### `platform`

| Nilai | Arti |
| --- | --- |
| `api` | Backend / API |
| `mobile` | Aplikasi mobile |
| `ai-chat` | AI chat (pakai **strip**, bukan `ai_chat` / `aichat` / `AI Chat`) |
| `web` | Web / dashboard |
| `other` | Gak masuk kategori di atas |

### `status`

| Nilai | Label di board |
| --- | --- |
| `request` | Request |
| `queue` | Queue |
| `in-progress` | In progress (pakai **strip**) |
| `ready-to-test` | Ready to test (pakai **strip**) |
| `done` | Done |
| `done-live` | Live (tampil di kolom Done, badge LIVE) |
| `rejected` | Rejected (wajib ada `reject_reason`) |

Nilai di luar tabel-tabel ini (mis. `Bug`, `API`, `in_progress`, `done_live`, `Web`) = salah.

## `description`: HTML yang boleh

Tag yang lolos cuma: `p`, `strong`, `em`, `u`, `ul`, `ol`, `li`, `br`, `blockquote`.
Atribut apa pun (class, style, href, dll) dibuang. Tag lain (`h1`, `a`, `img`, `table`, `code`, `div`, …)
dibuang beserta tag-nya.

- Tiap paragraf dibungkus `<p>…</p>`.
- List: `<ul><li>…</li></ul>` atau `<ol><li>…</li></ol>`.
- Link ditulis sebagai teks biasa (URL polos), jangan pakai `<a>`.
- Teks biasa tanpa tag juga diterima, nanti dibungkus `<p>` sama script.
- Karakter `"` di dalam string JSON harus di-escape jadi `\"`.

## `created_by`

- Isi email aja. Kalau email belum terdaftar, script bikin user baru otomatis:
  - nama diambil dari bagian depan email (`budi.santoso@maal.id` → "Budi Santoso"),
  - role `marketing`, status `active`.
- Kalau email udah terdaftar, user itu yang dipakai (nama/role gak diubah).
- Satu orang = satu email yang sama persis di semua task-nya. Jangan campur `Budi@maal.id` dan
  `budi@maal.id` — tulis huruf kecil semua.

## Yang diisi script (jangan ditulis di JSON)

- `id`, `created_at`, `updated_at`.
- Urutan di kolom: ngikutin urutan di array, ditaruh di bawah task yang udah ada di kolom yang sama.
- History status: dibikin per langkah dari `request` sampai status tujuan, sama kayak task digeser
  manual di board. Contoh `done` → Request, Request → Queue, Queue → In progress,
  In progress → Ready to test, Ready to test → Done. `rejected` → Request, Request → Rejected
  (pakai `reject_reason` sebagai catatan).

## Checklist sebelum kirim

- [ ] File valid JSON (bisa dicek pakai `jq . file.json`).
- [ ] Tiap task punya `title`, `description`, `type`, `platform`.
- [ ] Semua `type`, `platform`, `status` persis ada di tabel enum di atas.
- [ ] Task `rejected` punya `reject_reason`.
- [ ] `description` cuma pakai tag yang diizinin.
- [ ] Email `created_by` huruf kecil semua.
