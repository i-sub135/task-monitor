import { error, fail } from '@sveltejs/kit';
import { addUser, setUserRole, setUserStatus, users, validateNewUser } from '$lib/mock/users';
import { getMockUser } from '$lib/server/mock-session';
import type { Cookies } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Kelola users cuma buat admin (brainstorming.md bagian 3). Dicek ulang di tiap action.
const isAdmin = (cookies: Cookies) => getMockUser(cookies).role === 'admin';

export const load: PageServerLoad = ({ cookies }) => {
	if (!isAdmin(cookies)) error(403, 'Cuma admin yang bisa kelola users');
	return { users };
};

export const actions: Actions = {
	create: async ({ request, cookies }) => {
		if (!isAdmin(cookies)) return fail(403, { rowError: 'Cuma admin yang bisa kelola users' });

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

	setStatus: async ({ request, cookies }) => {
		if (!isAdmin(cookies)) return fail(403, { rowError: 'Cuma admin yang bisa kelola users' });
		const form = await request.formData();
		const result = setUserStatus(String(form.get('id') ?? ''), String(form.get('status') ?? ''));
		if (!result.ok) return fail(result.status, { rowError: result.error });
		return { updated: true };
	},

	setRole: async ({ request, cookies }) => {
		if (!isAdmin(cookies)) return fail(403, { rowError: 'Cuma admin yang bisa kelola users' });
		const form = await request.formData();
		const result = setUserRole(String(form.get('id') ?? ''), String(form.get('role') ?? ''));
		if (!result.ok) return fail(result.status, { rowError: result.error });
		return { updated: true };
	}
};
