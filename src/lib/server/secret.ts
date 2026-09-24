import { randomBytes } from 'node:crypto';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { logger } from './logger';

const MIN_LENGTH = 32;
let devSecret: string | undefined;

/** Password login. Wajib ada: kalau kosong, gak ada yang bisa masuk, jadi lebih baik server gak nyala. */
export function getLoginPassword(): string {
	const password = env.AUTH_ADMIN;
	if (!password) throw new Error('AUTH_ADMIN belum diisi. Isi password login di .env');
	return password;
}

/** Kunci tanda tangan cookie. Wajib ada di production; di dev dibikin acak per proses kalau env kosong. */
export function getSessionSecret(): string {
	const configured = env.COOKIE_SIGN_SECRET;
	if (configured) {
		if (configured.length < MIN_LENGTH) {
			throw new Error(`COOKIE_SIGN_SECRET minimal ${MIN_LENGTH} karakter`);
		}
		return configured;
	}
	if (!dev) throw new Error('COOKIE_SIGN_SECRET wajib diisi di production');

	if (!devSecret) {
		devSecret = randomBytes(32).toString('hex');
		logger.warn('auth.secret.ephemeral', {
			note: 'COOKIE_SIGN_SECRET kosong, pakai kunci acak. Sesi hilang tiap dev server restart.'
		});
	}
	return devSecret;
}
