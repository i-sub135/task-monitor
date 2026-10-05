import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { apiError, descriptionFromApi, failed, readBody, requireExpected } from '$lib/server/api';
import { getTaskForApi, updateTaskFields } from '$lib/server/tasks';
import type { RequestHandler } from './$types';

// TM-17: baca task. `updated_at` di sini yang wajib dikirim balik pas PATCH / transition.
export const GET: RequestHandler = async ({ params, locals }) => {
	const task = await getTaskForApi(getDb(), params.id, locals.user!);
	return task ? json(task) : apiError(404, 'Task not found');
};

// TM-17: edit title/description/type/platform (field yang gak dikirim gak diubah). Aturan sama kayak UI:
// cuma pas Request/Queue, tiap field yang berubah kecatet di Edit history.
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const user = locals.user!;
	const read = await readBody(request, ['expected_updated_at', 'title', 'description', 'type', 'platform']);
	if (!read.ok) return read.response;
	const { body } = read;
	const expected = requireExpected(body);
	if (!expected.ok) return expected.response;

	const result = await updateTaskFields(getDb(), {
		id: params.id,
		changes: {
			title: body.title,
			description: body.description === undefined ? undefined : descriptionFromApi(body.description),
			type: body.type,
			platform: body.platform
		},
		user,
		via: locals.via,
		expectedUpdatedAt: expected.value
	});
	return failed(result) ?? json(await getTaskForApi(getDb(), params.id, user));
};
