import { fail, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { listBoard, reorderTask, transitionTask } from '$lib/server/tasks';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Guard di hooks udah mastiin login. Dicek lagi di sini biar tipe `user` gak nullable buat halaman.
	if (!locals.user) redirect(303, '/');
	const { tasks } = await listBoard(getDb());
	return { tasks, user: locals.user };
};

export const actions: Actions = {
	move: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { moveError: 'Sesi habis, masuk lagi' });
		const form = await request.formData();
		const result = await transitionTask(getDb(), {
			id: String(form.get('id') ?? ''),
			to: String(form.get('to') ?? ''),
			note: String(form.get('note') ?? ''),
			user: locals.user
		});
		if (!result.ok) return fail(result.status, { moveError: result.error });
		return { moved: true };
	},

	reorder: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { moveError: 'Sesi habis, masuk lagi' });
		const form = await request.formData();
		const result = await reorderTask(getDb(), {
			id: String(form.get('id') ?? ''),
			position: Number(form.get('position')),
			user: locals.user
		});
		if (!result.ok) return fail(result.status, { moveError: result.error });
		return { moved: true };
	}
};
