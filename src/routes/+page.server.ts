import { fail, redirect } from '@sveltejs/kit';
import { startSession } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { logEvent } from '$lib/server/logger';
import { credentialsValid } from '$lib/server/password';
import { getLoginPassword } from '$lib/server/secret';
import { findUserByEmail } from '$lib/server/users';
import type { Actions } from './$types';

// Pesan yang sama buat email gak ada, user non-active, dan password salah, biar gak bocorin apa pun.
const LOGIN_FAILED = 'Email atau password salah, atau akun belum aktif.';

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '')
			.trim()
			.toLowerCase();
		const password = String(form.get('password') ?? '');

		if (!email) return fail(400, { error: 'Email wajib diisi', email });
		if (!password) return fail(400, { error: 'Password wajib diisi', email });

		const user = await findUserByEmail(getDb(), email);
		if (!credentialsValid(user, password, getLoginPassword()) || !user) {
			logEvent('auth.login.failed', { reason: 'invalid_credentials' });
			return fail(400, { error: LOGIN_FAILED, email });
		}

		startSession(cookies, user.id);
		logEvent('auth.login.success', { userId: user.id, role: user.role });
		redirect(303, '/board');
	}
};
