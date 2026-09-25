import { fail, redirect } from '@sveltejs/kit';
import { startSession } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { guardDb, pingDb } from '$lib/server/db-health';
import { logEvent, logger } from '$lib/server/logger';
import { decideLogin } from '$lib/server/password';
import { getLoginPassword } from '$lib/server/secret';
import { findUserByEmail } from '$lib/server/users';
import type { Actions, PageServerLoad } from './$types';

// Pesan yang sama buat password salah, email gak ada, dan user non-active, biar gak bocorin apa pun.
const LOGIN_FAILED = 'Email atau password salah, atau akun belum aktif.';

// Ping DB tiap halaman masuk dibuka. DB mati = halaman nampilin modal "layanan tidak tersedia".
export const load: PageServerLoad = async ({ locals }) => {
	// Hook udah nemu DB mati di request ini: gak perlu nunggu timeout sekali lagi.
	if (locals.dbDown) return { dbUnavailable: true };
	const ping = await pingDb(getDb());
	if (!ping.ok) logger.error('db.ping.failed', { reason: ping.reason });
	return { dbUnavailable: !ping.ok };
};

export const actions: Actions = {
	default: async ({ request, cookies, locals }) => {
		if (locals.dbDown) return fail(503, { dbUnavailable: true });
		const form = await request.formData();
		const email = String(form.get('email') ?? '')
			.trim()
			.toLowerCase();
		const password = String(form.get('password') ?? '');

		if (!email) return fail(400, { error: 'Email wajib diisi', email });

		const lookup = await guardDb(getDb(), () => findUserByEmail(getDb(), email));
		if (!lookup.ok) {
			logger.error('db.unavailable', { path: '/', reason: lookup.reason });
			return fail(503, { dbUnavailable: true, email });
		}
		const user = lookup.value;
		const decision = decideLogin(user, password, getLoginPassword());

		// Langkah 1 buat admin (dan email yang gak dikenal, biar gak bocor): minta password lewat dialog.
		if (decision === 'need_password') return { needsPassword: true, email };
		if (decision === 'denied' || !user) {
			logEvent('auth.login.failed', { reason: 'invalid_credentials' });
			return fail(400, { needsPassword: true, error: LOGIN_FAILED, email });
		}

		startSession(cookies, user.id);
		logEvent('auth.login.success', { userId: user.id, role: user.role });
		redirect(303, '/board');
	}
};
