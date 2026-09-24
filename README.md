# task-monitor

Papan antrean request buat tim non-teknis. Marketing ngajuin request lewat form, developer nge-triase, semua orang liat sendiri request-nya ada di kolom mana dan nomor berapa di antrean — tanpa nanya.

Lima kolom, maju doang: `request → queue → in-progress → done`, plus `rejected` dari `request`.

## Stack

SvelteKit 2 + Svelte 5 · Tailwind 4 + Skeleton 5 · PostgreSQL (eksisting) + Prisma 7 · adapter-node · Docker 1 container.

Versi paket, tabel, dan aturan main dikunci di [`brainstorming.md`](brainstorming.md). Itu sumber kebenaran desain — kalau kode dan dokumen itu beda, dokumen yang menang sampai diubah lewat diskusi.

## Kerjaan

Papan tiket di [`task/README.md`](task/README.md). Tiket per file di `task/backlog/` dan `task/done/`.

## Jalanin

Belum ada kode. Isi bagian ini pas `TM-1` kelar.

## Referensi

- Setup SvelteKit + Skeleton: https://gist.github.com/i-sub135/c22b8c5052f74a5d63b6b7c1e0d3a0ee
- Konvensi project: https://gist.github.com/i-sub135/9d720fa076dc51ff8f132ee9ac3494ea
