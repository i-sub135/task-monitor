import { createHash, timingSafeEqual } from 'node:crypto';

/** Bandingin password tanpa bocorin panjang atau posisi beda: dua-duanya di-hash dulu ke panjang tetap. */
export function passwordMatches(given: string, expected: string): boolean {
	const a = createHash('sha256').update(given).digest();
	const b = createHash('sha256').update(expected).digest();
	return timingSafeEqual(a, b);
}

/**
 * Login sah kalau user ada, aktif, dan password cocok. Password selalu dibandingin, meski user gak
 * ada, biar waktu respons gak ngebedain "email gak terdaftar" dari "password salah".
 */
export function credentialsValid(
	user: { status: string } | null,
	givenPassword: string,
	expectedPassword: string
): boolean {
	const passwordOk = passwordMatches(givenPassword, expectedPassword);
	return user !== null && user.status === 'active' && passwordOk;
}
