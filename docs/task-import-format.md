# Format JSON import task — task-monitor

Dokumen ini buat siapa pun yang nyiapin data task untuk dimasukin langsung ke database task-monitor.
Hasil akhirnya **satu file JSON** berisi array task. JSON ini nanti dibaca script import; script yang
ngurus id, tanggal, status, urutan, history, dan bikin user yang belum ada.

## Bentuk file

Satu array JSON, satu object per task. Gak ada wrapper, gak ada komentar.

```json
[
  {
    "title": "Tombol checkout gak respon di Android 12",
    "description": "<p>Tombol <strong>Bayar</strong> gak bisa diklik setelah pilih metode pembayaran.</p><ul><li>Device: Samsung A52</li><li>Versi app: 2.4.1</li></ul>",
    "type": "bug",
    "platform": "mobile",
    "created_by": "budi.santoso@maal.id"
  },
  {
    "title": "Export laporan penjualan ke Excel",
    "description": "<p>Admin toko butuh export laporan harian ke .xlsx.</p>",
    "type": "feature",
    "platform": "web",
    "created_by": "siti.rahma@maal.id"
  }
]
```

## Field

Semua field wajib. Cuma 5 ini, gak ada yang lain.

| Field | Isi |
| --- | --- |
| `title` | Teks biasa, satu baris, gak kosong. |
| `description` | HTML terbatas (lihat bawah). Gak boleh kosong. |
| `type` | Salah satu nilai enum `type`. |
| `platform` | Salah satu nilai enum `platform`. |
| `created_by` | Email pembuat task (lihat bawah). |

Jangan tambah field lain (termasuk `status`, `id`, tanggal). Field yang gak dikenal bikin import ditolak.

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

Nilai di luar tabel-tabel ini (mis. `Bug`, `Feature`, `API`, `Web`, `ai_chat`) = salah.

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
- Status: semua task masuk sebagai **Request**.
- Urutan di kolom Request: ngikutin urutan di array, ditaruh di bawah task Request yang udah ada.
- History status: satu baris "Request" atas nama `created_by`, sama kayak bikin task dari form.

## Checklist sebelum kirim

- [ ] File valid JSON (bisa dicek pakai `jq . file.json`).
- [ ] Tiap task punya persis 5 field: `title`, `description`, `type`, `platform`, `created_by`.
- [ ] Semua `type` dan `platform` persis ada di tabel enum di atas.
- [ ] `description` cuma pakai tag yang diizinin.
- [ ] Email `created_by` huruf kecil semua.
