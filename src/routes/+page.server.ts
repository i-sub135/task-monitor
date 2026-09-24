import { fail, redirect } from '@sveltejs/kit';
import { startSession } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { logEvent } from '$lib/server/logger';
import { decideLogin } from '$lib/server/password';
import { getLoginPassword } from '$lib/server/secret';
import { findUserByEmail } from '$lib/server/users';
import type { Actions } from './$types';

// Pesan yang sama buat password salah, email gak ada, dan user non-active, biar gak bocorin apa pun.
const LOGIN_FAILED = 'Email atau password salah, atau akun belum aktif.';

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '')
			.trim()
			.toLowerCase();
		const password = String(form.get('password') ?? '');

		if (!email) return fail(400, { error: 'Email wajib diisi', email });

		const user = await findUserByEmail(getDb(), email);
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
