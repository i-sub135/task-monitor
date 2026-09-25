import { randomBytes } from 'node:crypto';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { logger } from './logger';

const MIN_LENGTH = 32;
let devSecret: string | undefined;

/** Password login. Wajib ada: kalau kosong, gak ada yang bisa masuk, jadi lebih baik server gak nyala. */
export function getLoginPassword(): string {
	const password = env.AUTH_ADMIN;
	if (!password) throw new Error('AUTH_ADMIN is not set. Put the login password in .env');
	return password;
}

/** Kunci tanda tangan cookie. Wajib ada di production; di dev dibikin acak per proses kalau env kosong. */
export function getSessionSecret(): string {
	const configured = env.COOKIE_SIGN_SECRET;
	if (configured) {
		if (configured.length < MIN_LENGTH) {
			throw new Error(`COOKIE_SIGN_SECRET must be at least ${MIN_LENGTH} characters`);
		}
		return configured;
	}
	if (!dev) throw new Error('COOKIE_SIGN_SECRET is required in production');

	if (!devSecret) {
		devSecret = randomBytes(32).toString('hex');
		logger.warn('auth.secret.ephemeral', {
			note: 'COOKIE_SIGN_SECRET is empty, using a random key. Sessions are lost on every dev server restart.'
		});
	}
	return devSecret;
}
