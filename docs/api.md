# Task Monitor API (v1)

Buat kuli (atau user sendiri) yang mau kirim task baru dan update task tanpa buka UI.

## Token

- Bikin di app: klik nama kamu di navbar → **API tokens** → isi nama (mis. "Kuli Coding") → **Generate**.
  Token cuma muncul sekali, langsung simpen. Cuma developer, QA, admin yang punya halaman ini.
- Maks 5 token per user. Penuh → **Revoke** salah satu (revoke + generate baru = refresh).
- Token = kamu. Hak di API persis sama kayak hak kamu di UI (role + aturan geser status). Yang gak bisa kamu
  lakuin di UI, gak bisa juga lewat API.
- Nama token ikut kecatet di history: "Iyan Subdiana via Kuli Coding".
- Kirim di header: `Authorization: Bearer tm_...`. Jangan taruh token di URL, log, atau repo.

## Aturan main

1. **Baca dulu sebelum nulis.** PATCH dan transition wajib bawa `expected_updated_at` = nilai `updated_at`
   dari GET terakhir. Gak bawa → `428`. Task udah berubah sejak dibaca → `409`: GET ulang, cek isinya, baru coba lagi.
2. Body selalu JSON object, semua nilai string. Field yang gak dikenal → `400` (biar typo ketahuan).
3. Error selalu `{ "error": "pesan" }` dengan status HTTP yang sesuai.

## Enum

- `type`: `bug`, `feature`
- `platform`: `api`, `mobile`, `ai-chat`, `web`, `other`
- `status`: `request`, `queue`, `in-progress`, `ready-to-test`, `done`, `done-live`, `rejected`

## Endpoint

Base URL: `https://<host-task-monitor>/api/v1`

### `POST /tasks` — kirim task baru

```json
{ "title": "Tombol checkout gak respon", "description": "<p>Detail...</p>", "type": "bug", "platform": "mobile" }
```

- Semua field wajib. `title` maks 120 karakter.
- `description`: HTML (tag yang lolos cuma `p strong em u ul ol li br blockquote`, sisanya dibuang) atau
  teks biasa (otomatis jadi paragraf, enter jadi baris baru).
- Task masuk kolom **Request** paling bawah. Balikan `201` + task (lihat bentuk di bawah).

### `GET /tasks/:id` — baca task

Balikan:

```json
{
  "id": "…", "title": "…", "description": "<p>…</p>", "type": "bug", "platform": "mobile",
  "status": "request", "created_by": "Iyan Subdiana",
  "created_at": "2026-10-05T03:00:00.000Z",
  "updated_at": "2026-10-05T03:00:00.000Z",
  "editable": true,
  "allowed_transitions": ["queue", "rejected"],
  "history": [{ "from": null, "to": "request", "by": "Iyan Subdiana", "via": "Kuli Coding", "note": null, "at": "…" }]
}
```

- `editable`: boleh edit title/description/type/platform (cuma pas Request/Queue).
- `allowed_transitions`: status tujuan yang boleh buat pemilik token dari status sekarang.

### `PATCH /tasks/:id` — edit isi task

```json
{ "expected_updated_at": "2026-10-05T03:00:00.000Z", "title": "Judul baru", "platform": "web" }
```

- Kirim field yang mau diubah aja (`title`, `description`, `type`, `platform`), minimal satu.
- Cuma bisa pas status Request/Queue (`403` kalau udah lewat). Tiap field yang berubah kecatet di Edit history.
- Balikan `200` + task terbaru (pakai `updated_at` yang baru buat request berikutnya).

### `POST /tasks/:id/transition` — geser status

```json
{ "expected_updated_at": "2026-10-05T03:00:00.000Z", "to": "ready-to-test", "note": "PR #12" }
```

- Aturannya sama kayak drag di board. Ke `rejected` wajib `note` (alasan).
- Balikan `200` + task terbaru.

## Contoh (curl)

```sh
TOKEN=...   # dari halaman API tokens
BASE=https://<host-task-monitor>/api/v1

# baca
curl -s -H "Authorization: Bearer $TOKEN" $BASE/tasks/<id>

# geser ke ready-to-test, pakai updated_at dari GET di atas
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"expected_updated_at":"<updated_at>","to":"ready-to-test","note":"PR #12"}' \
  $BASE/tasks/<id>/transition
```

## Status error

| Status | Arti |
| --- | --- |
| 400 | Body/field salah (JSON rusak, field gak dikenal, enum salah, kosong) |
| 401 | Token gak ada / salah / udah di-revoke / user nonaktif / role marketing |
| 403 | Gak boleh menurut aturan (role, atau edit di luar Request/Queue) |
| 404 | Task gak ketemu |
| 409 | Task udah berubah sejak GET terakhir — GET ulang |
| 428 | `expected_updated_at` gak dikirim — GET dulu |
| 503 | Database lagi gak bisa dihubungi |
