/** Halaman yang cuma boleh dibuka tamu (belum login). Yang sudah login dilempar ke /board. */
export const GUEST_ONLY_ROUTES = ['/'];
/** Boleh dibuka siapa aja. Selain dua daftar ini, wajib login. */
export const PUBLIC_ROUTES = ['/logout'];

/** Balikin tujuan redirect, atau null kalau request boleh lanjut. */
export function guardRedirect(pathname: string, loggedIn: boolean): string | null {
	const guestOnly = GUEST_ONLY_ROUTES.includes(pathname);
	if (!loggedIn) return guestOnly || PUBLIC_ROUTES.includes(pathname) ? null : '/';
	return guestOnly ? '/board' : null;
}
