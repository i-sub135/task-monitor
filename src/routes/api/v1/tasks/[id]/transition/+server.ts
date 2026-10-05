import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { failed, readBody, requireExpected } from '$lib/server/api';
import { getTaskForApi, transitionTask } from '$lib/server/tasks';
import type { RequestHandler } from './$types';

// TM-17: geser status. Aturannya persis kayak drag di board (role, urutan status, note wajib buat reject).
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = locals.user!;
	const read = await readBody(request, ['expected_updated_at', 'to', 'note']);
	if (!read.ok) return read.response;
	const { body } = read;
	const expected = requireExpected(body);
	if (!expected.ok) return expected.response;

	const result = await transitionTask(getDb(), {
		id: params.id,
		to: body.to ?? '',
		note: body.note ?? '',
		user,
		via: locals.via,
		expectedUpdatedAt: expected.value
	});
	return failed(result) ?? json(await getTaskForApi(getDb(), params.id, user));
};
