import { createHmac, timingSafeEqual } from 'node:crypto';

export type SessionPayload = { uid: string; exp: number };

const sign = (body: string, secret: string) => createHmac('sha256', secret).update(body).digest();

/** Token = base64url(payload) + "." + base64url(HMAC-SHA256). Nol state di server, nol tabel session. */
export function signSession(payload: SessionPayload, secret: string): string {
	const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
	return `${body}.${sign(body, secret).toString('base64url')}`;
}

/** Balikin payload kalau tanda tangan cocok dan belum kedaluwarsa, selain itu null. */
export function verifySession(
	token: string | undefined,
	secret: string,
	now: number = Date.now()
): SessionPayload | null {
	if (!token) return null;
	const parts = token.split('.');
	if (parts.length !== 2) return null;
	const [body, mac] = parts;

	const expected = sign(body, secret);
	const given = Buffer.from(mac, 'base64url');
	if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

	try {
		const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
		if (typeof payload?.uid !== 'string' || typeof payload?.exp !== 'number') return null;
		if (payload.exp <= now) return null;
		return { uid: payload.uid, exp: payload.exp };
	} catch {
		return null;
	}
}

/**
 * Cookie sesi dikasih Secure cuma kalau app diakses lewat HTTPS. Bawaan SvelteKit ngasih Secure di semua URL
 * selain http://localhost, dan browser membuang cookie Secure yang datang lewat HTTP (mis. http://192.168.x.x
 * di jaringan lokal): login kelihatan sukses di server, tapi cookie gak pernah nempel. Production di belakang
 * HTTPS (ORIGIN https://...) tetap dapat Secure.
 */
export const sessionCookieSecure = (url: URL): boolean => url.protocol === 'https:';

