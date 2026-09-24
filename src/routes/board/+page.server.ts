import { fail, redirect } from '@sveltejs/kit';
import { moveTask, tasks } from '$lib/mock/tasks';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	// Guard di hooks udah mastiin login. Dicek lagi di sini biar tipe `user` gak nullable buat halaman.
	if (!locals.user) redirect(303, '/');
	return { tasks, user: locals.user };
};

export const actions: Actions = {
	move: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { moveError: 'Sesi habis, masuk lagi' });
		const form = await request.formData();
		const result = moveTask({
			id: String(form.get('id') ?? ''),
			to: String(form.get('to') ?? ''),
			note: String(form.get('note') ?? '').trim(),
			user: locals.user
		});
		if (!result.ok) return fail(result.status, { moveError: result.error });
		return { moved: true };
	}
};
