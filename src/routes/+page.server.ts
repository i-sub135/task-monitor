import { fail, redirect } from '@sveltejs/kit';
import { findUserByEmail } from '$lib/mock/users';
import { startSession } from '$lib/server/auth';
import { logEvent } from '$lib/server/logger';
import type { Actions } from './$types';

// Pesan yang sama buat "email gak ada" dan "user non-active", biar gak bocorin siapa yang terdaftar.
const LOGIN_FAILED = 'Email ini tidak bisa dipakai masuk. Cek lagi ejaannya, atau minta admin mendaftarkan.';

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '')
			.trim()
			.toLowerCase();

		if (!email) return fail(400, { error: 'Email wajib diisi', email });

		const user = findUserByEmail(email);
		if (!user || user.status !== 'active') {
			logEvent('auth.login.failed', { reason: 'not_found_or_inactive' });
			return fail(400, { error: LOGIN_FAILED, email });
		}

		startSession(cookies, user.id);
		logEvent('auth.login.success', { userId: user.id, role: user.role });
		redirect(303, '/board');
	}
};
