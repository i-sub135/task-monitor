import { fail } from '@sveltejs/kit';
import { addUser, setUserRole, setUserStatus, users, validateNewUser } from '$lib/mock/users';
import { hasRole, requireRole } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

// Kelola users cuma buat admin (brainstorming.md bagian 3). Dicek ulang di tiap action.

export const load: PageServerLoad = ({ locals }) => {
	requireRole(locals, 'admin');
	return { users };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!hasRole(locals.user, 'admin')) return fail(403, { rowError: 'Cuma admin yang bisa kelola users' });

		const form = await request.formData();
		const input = {
			name: String(form.get('name') ?? '').trim(),
			email: String(form.get('email') ?? '')
				.trim()
				.toLowerCase(),
			role: String(form.get('role') ?? '')
		};
		const errors = validateNewUser(input);
		if (Object.keys(errors).length > 0) return fail(400, { errors, values: input });

		addUser(input);
		return { created: input.name };
	},

	setStatus: async ({ request, locals }) => {
		if (!hasRole(locals.user, 'admin')) return fail(403, { rowError: 'Cuma admin yang bisa kelola users' });
		const form = await request.formData();
		const result = setUserStatus(String(form.get('id') ?? ''), String(form.get('status') ?? ''));
		if (!result.ok) return fail(result.status, { rowError: result.error });
		return { updated: true };
	},

	setRole: async ({ request, locals }) => {
		if (!hasRole(locals.user, 'admin')) return fail(403, { rowError: 'Cuma admin yang bisa kelola users' });
		const form = await request.formData();
		const result = setUserRole(String(form.get('id') ?? ''), String(form.get('role') ?? ''));
		if (!result.ok) return fail(result.status, { rowError: result.error });
		return { updated: true };
	}
};
