import { fail } from '@sveltejs/kit';
import { hasRole, requireRole } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { createUser, listUsers, setUserRole, setUserStatus } from '$lib/server/users';
import type { Actions, PageServerLoad } from './$types';

// Kelola users cuma buat admin (brainstorming.md bagian 3). Dicek ulang di tiap action.
const FORBIDDEN = 'Only admins can manage users';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'admin');
	return { users: await listUsers(getDb()) };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!hasRole(locals.user, 'admin')) return fail(403, { rowError: FORBIDDEN });

		const form = await request.formData();
		const input = {
			name: String(form.get('name') ?? '').trim(),
			email: String(form.get('email') ?? '')
				.trim()
				.toLowerCase(),
			role: String(form.get('role') ?? '')
		};

		const result = await createUser(getDb(), input);
		if (!result.ok) return fail(400, { errors: result.errors, values: input });
		return { created: result.user.name };
	},

	setStatus: async ({ request, locals }) => {
		if (!hasRole(locals.user, 'admin')) return fail(403, { rowError: FORBIDDEN });
		const form = await request.formData();
		const result = await setUserStatus(
			getDb(),
			String(form.get('id') ?? ''),
			String(form.get('status') ?? ''),
			locals.user!.id
		);
		if (!result.ok) return fail(result.status, { rowError: result.error });
		return { updated: true };
	},

	setRole: async ({ request, locals }) => {
		if (!hasRole(locals.user, 'admin')) return fail(403, { rowError: FORBIDDEN });
		const form = await request.formData();
		const result = await setUserRole(getDb(), String(form.get('id') ?? ''), String(form.get('role') ?? ''));
		if (!result.ok) return fail(result.status, { rowError: result.error });
		return { updated: true };
	}
};
