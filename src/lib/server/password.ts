import { createHash, timingSafeEqual } from 'node:crypto';

/** Bandingin password tanpa bocorin panjang atau posisi beda: dua-duanya di-hash dulu ke panjang tetap. */
export function passwordMatches(given: string, expected: string): boolean {
	const a = createHash('sha256').update(given).digest();
	const b = createHash('sha256').update(expected).digest();
	return timingSafeEqual(a, b);
}

export type LoginDecision =
	/** Boleh masuk. */
	| 'ok'
	/** Minta password (dialog). */
	| 'need_password'
	/** Ditolak. */
	| 'denied';

/**
 * Cuma akun admin yang dijaga password. User aktif non-admin masuk pakai email doang.
 *
 * Email admin, email yang gak terdaftar, dan user non-active semuanya diperlakukan sama di langkah
 * pertama (minta password), jadi dari luar gak bisa dibedain mana yang akun admin. Ketiganya baru
 * kelihatan beda kalau password-nya benar: cuma admin aktif yang lolos.
 */
export function decideLogin(
	user: { status: string; role: string } | null,
	givenPassword: string,
	expectedPassword: string
): LoginDecision {
	const active = user !== null && user.status === 'active';
	if (active && user.role !== 'admin') return 'ok';

	if (!givenPassword) return 'need_password';
	const passwordOk = passwordMatches(givenPassword, expectedPassword);
	return active && user.role === 'admin' && passwordOk ? 'ok' : 'denied';
}
