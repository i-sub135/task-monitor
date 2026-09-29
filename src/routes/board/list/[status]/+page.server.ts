import { error, fail, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { listBoard, reorderTask } from '$lib/server/tasks';
import { statuses, type Status } from '$lib/tasks';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) redirect(303, '/');
	if (!statuses.includes(params.status as Status)) error(404, 'Unknown status');
	const status = params.status as Status;
	const { tasks } = await listBoard(getDb());
	return { status, tasks: tasks.filter((t) => t.status === status), user: locals.user };
};

// TM-13: halaman ini cuma satu status, jadi yang ada cuma reorder (gak ada pindah status).
export const actions: Actions = {
	reorder: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { moveError: 'Session expired, please log in again' });
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
