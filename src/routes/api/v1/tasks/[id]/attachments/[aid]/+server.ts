import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { failed, readBody, requireExpected } from '$lib/server/api';
import { getTaskForApi, removeAttachment } from '$lib/server/tasks';
import type { RequestHandler } from './$types';

// TM-22: hapus (umpetin) 1 lampiran dari task yang belum Done. File-nya tetep disimpen dan kecatet di Edit
// history. Body JSON wajib bawa `expected_updated_at`, sama kayak PATCH.
export const DELETE: RequestHandler = async ({ params, request, locals }) => {
	const user = locals.user!;
	const read = await readBody(request, ['expected_updated_at']);
	if (!read.ok) return read.response;
	const expected = requireExpected(read.body);
	if (!expected.ok) return expected.response;

	const result = await removeAttachment(getDb(), {
		id: params.id,
		attachmentId: params.aid,
		user,
		via: locals.via,
		expectedUpdatedAt: expected.value
	});
	return failed(result) ?? json(await getTaskForApi(getDb(), params.id, user));
};
