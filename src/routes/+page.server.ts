import { fail } from '@sveltejs/kit';
import { moveTask, tasks } from '$lib/mock/tasks';
import { getMockUser } from '$lib/server/mock-session';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ tasks });

export const actions: Actions = {
	move: async ({ request, cookies }) => {
		const form = await request.formData();
		const result = moveTask({
			id: String(form.get('id') ?? ''),
			to: String(form.get('to') ?? ''),
			note: String(form.get('note') ?? '').trim(),
			user: getMockUser(cookies)
		});
		if (!result.ok) return fail(result.status, { moveError: result.error });
		return { moved: true };
	}
};
