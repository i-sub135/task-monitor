import { error, type Cookies } from '@sveltejs/kit';
import type { Role, SessionUser } from '$lib/roles';
import { findUserById } from './users';
import { getDb } from './db';
import { getSessionSecret } from './secret';
import { sessionCookieSecure, signSession, verifySession } from './session';

export const SESSION_COOKIE = 'tm_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function startSession(cookies: Cookies, userId: string, url: URL): void {
	const token = signSession(
		{ uid: userId, exp: Date.now() + MAX_AGE_SECONDS * 1000 },
		getSessionSecret()
	);
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: sessionCookieSecure(url),
		maxAge: MAX_AGE_SECONDS
	});
}

export function endSession(cookies: Cookies, url: URL): void {
	// Atribut secure harus sama kayak pas diset, kalau nggak browser (HTTP) menolak cookie penghapusnya.
	cookies.delete(SESSION_COOKIE, { path: '/', secure: sessionCookieSecure(url) });
}

/**
 * Baca cookie, verifikasi tanda tangan, lalu ambil user terbaru dari store. Role dan status selalu
 * diambil ulang, bukan dipercaya dari cookie, jadi user yang dinonaktifin langsung gak sah.
 */
export async function readSession(cookies: Cookies): Promise<SessionUser | null> {
	const payload = verifySession(cookies.get(SESSION_COOKIE), getSessionSecret());
	if (!payload) return null;
	const user = await findUserById(getDb(), payload.uid);
	if (!user || user.status !== 'active') return null;
	return { id: user.id, name: user.name, role: user.role };
}

export const hasRole = (user: SessionUser | null, ...allowed: Role[]): boolean =>
	user !== null && allowed.includes(user.role);

/** Buat load dan endpoint: lempar 403 kalau role gak cocok. */
export function requireRole(locals: App.Locals, ...allowed: Role[]): SessionUser {
	const { user } = locals;
	if (!user || !allowed.includes(user.role)) error(403, 'Kamu tidak punya akses ke halaman ini');
	return user;
}
