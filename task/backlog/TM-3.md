# TM-3 — Auth: login email-only, session, guard per role

**Type**: feature
**Status**: Ready
**Source**: `brainstorming.md` bagian 1 (login = cek email) + bagian 3 (hak akses)
**Butuh**: TM-2

## Yang dibikin

- `/login`: form 1 isian (email). Action: cari di `users` by email → harus ada **dan** `active` → set cookie session. Gagal → `fail(400)` dengan pesan yang sama buat "gak ada" dan "non-active" (jangan bocorin mana yang bener).
- `/logout`: hapus cookie, redirect `/login`.
- Session = cookie `HttpOnly`, `SameSite=Lax`, payload `{ userId, role }` ditandatangani HMAC pakai `COOKIE_SIGN_SECRET` (pola `cookieCrypto.ts` di gist konvensi). Nol tabel session.
- `hooks.server.ts`: baca cookie → verifikasi → `event.locals.user = { id, name, role }`. Guard terpusat pakai array: `GUEST_ONLY_ROUTES = ['/login']`, `PUBLIC_ROUTES = ['/logout']`, sisanya wajib login. Nol guard per-route.
- Helper `requireRole(locals, ...roles)` di `src/lib/server/auth.ts` buat dipakai action/endpoint tiket berikutnya.
- Nol password, nol pendaftaran sendiri — sesuai keputusan bagian 1.

## AC

1. Email yang ada + `active` → masuk, redirect `/`.
2. Email gak ada, atau `non-active` → tetap di `/login`, pesan sama, nol perbedaan waktu respons yang kentara.
3. Buka `/` tanpa cookie → redirect `/login`. Buka `/login` dengan cookie sah → redirect `/`.
4. Cookie yang diubah tangan (payload diganti) → ditolak, diperlakukan kayak nol cookie.
5. `locals.user.role` kebaca di `+layout.server.ts` dan dipakai buat nampilin nama + role di AppBar.
6. Test: 4 kasus di atas ada test-nya.

## Belum diputusin

- Umur cookie (7 hari? sampai browser tutup?). Sementara 7 hari.

## History

- 2026-09-24 11:38 — ticket dibuka (Kuli Code, perintah Iyan lewat DM).
