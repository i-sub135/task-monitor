import { error, fail } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { getTaskDetail, transitionTask } from '$lib/server/tasks';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const task = await getTaskDetail(getDb(), params.id);
	if (!task) error(404, 'Task tidak ditemukan');
	return { task };
};

export const actions: Actions = {
	transition: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401, { transitionError: 'Sesi habis, masuk lagi' });
		const form = await request.formData();
		const result = await transitionTask(getDb(), {
			id: params.id,
			to: String(form.get('to') ?? ''),
			note: String(form.get('note') ?? ''),
			user: locals.user
		});
		if (!result.ok) return fail(result.status, { transitionError: result.error });
		return { transitioned: true };
	}
};
