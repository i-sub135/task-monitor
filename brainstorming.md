# task-monitor — brainstorming

Catatan desain, dibangun bagian per bagian. Tiap bagian dikunci Iyan sebelum lanjut.

## 1. Design table

Dikunci 2026-09-24 11:00. Empat tabel.

### task

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | uuid | |
| `title` | text | |
| `description` | text | |
| `type` | enum `bug` / `feature` | |
| `status` | enum `request` / `queue` / `in-progress` / `done` / `rejected` | default `request` |
| `ordering` | integer | urutan antrean, kecil = duluan. Dipakai di status `queue`, di status lain diabaikan |
| `created_by` | uuid → `users.id` | |
| `created_at` | datetime | |
| `updated_at` | datetime | |

### task_history

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | uuid | |
| `task_id` | uuid → `task.id` | |
| `status_before` | enum, null | null = event pertama (task lahir) |
| `status_after` | enum | |
| `note` | text, null | **wajib** kalau `status_after = rejected`, opsional sisanya. Link hasil pas `done` ditaro di sini juga |
| `created_by` | uuid → `users.id` | |
| `created_at` | datetime | |

### task_attachment

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | uuid | |
| `task_id` | uuid → `task.id` | |
| `file_name` | text | nama asli dari pengunggah |
| `file_path` | text | lokasi simpan (disk / object storage) |
| `mime_type` | text | label jenis file dari browser, mis. `image/png`. Dipakai nyaring upload (cuma `image/*`) dan nampilin |
| `size` | integer | byte |
| `created_by` | uuid → `users.id` | |
| `created_at` | datetime | |

Tabel terpisah, bukan kolom di `task`: satu task bisa bawa lebih dari satu gambar, hapusnya per file.

### users

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | uuid | |
| `name` | text | |
| `email` | text, unique | |
| `role` | enum `marketing` / `developer` / `admin` | |
| `status` | enum `active` / `non-active` | |
| `created_at` | datetime | |
| `updated_at` | datetime | |

### Keputusan yang nempel di tabel

- **Login = cek email doang.** Form email → ada di `users` dan `active` → session bawa `id` + `role`. Nol password, nol tabel tambahan. Konsekuensi yang disadari: siapa pun yang tau email orang lain bisa masuk sebagai dia; `created_by` = "siapa yang ngaku". Diterima buat tool internal kantor.
- **Nol `due_date`.** Marketing gak ngisi "butuh kapan".
- **Nol `assigned_to`** di v1. Ditunda, bukan ditolak.
- **Urutan antrean** pakai `ordering`, bukan FIFO `created_at`, biar satu task bisa didahuluin.
