import { error, fail } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { descriptionText, sanitizeDescription } from '$lib/server/richtext';
import { getTaskDetail, transitionTask, updateTaskDescription, updateTaskTitle } from '$lib/server/tasks';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const task = await getTaskDetail(getDb(), params.id);
	if (!task) error(404, 'Task not found');
	return { task };
};

export const actions: Actions = {
	transition: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401, { transitionError: 'Session expired, please log in again' });
		const form = await request.formData();
		const result = await transitionTask(getDb(), {
			id: params.id,
			to: String(form.get('to') ?? ''),
			note: String(form.get('note') ?? ''),
			user: locals.user
		});
		if (!result.ok) return fail(result.status, { transitionError: result.error });
		return { transitioned: true };
	},

	// TM-11: title dan description diedit lewat dua action terpisah (edit partial, sesuai tiket).
	updateTitle: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401, { editError: 'Session expired, please log in again' });
		const form = await request.formData();
		const result = await updateTaskTitle(getDb(), {
			id: params.id,
			title: String(form.get('title') ?? ''),
			user: locals.user
		});
		if (!result.ok) return fail(result.status, { editError: result.error });
		return { titleUpdated: true };
	},

	updateDescription: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401, { editError: 'Session expired, please log in again' });
		const form = await request.formData();
		// Sama seperti task/new: disaring di sini, bukan cuma di render, sebelum disentuh lagi.
		const description = sanitizeDescription(String(form.get('description') ?? ''));
		if (!descriptionText(description)) return fail(400, { editError: 'Description is required' });
		const result = await updateTaskDescription(getDb(), { id: params.id, description, user: locals.user });
		if (!result.ok) return fail(result.status, { editError: result.error });
		return { descriptionUpdated: true };
	}
};
