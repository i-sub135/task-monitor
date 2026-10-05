import { randomUUID } from 'node:crypto';
import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { apiError, descriptionFromApi, readBody } from '$lib/server/api';
import { createTask, getTaskForApi } from '$lib/server/tasks';
import { descriptionText } from '$lib/server/richtext';
import { platforms, taskTypes, type Platform, type TaskType } from '$lib/tasks';
import type { RequestHandler } from './$types';

// TM-17: kirim task baru. Aturannya sama kayak form New task (tanpa lampiran), masuk Request paling belakang.
export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user!;
	const read = await readBody(request, ['title', 'description', 'type', 'platform']);
	if (!read.ok) return read.response;
	const { body } = read;

	const title = (body.title ?? '').trim();
	const description = descriptionFromApi(body.description ?? '');
	if (!title) return apiError(400, 'Title is required');
	if (title.length > 120) return apiError(400, 'Title must be at most 120 characters');
	if (!descriptionText(description)) return apiError(400, 'Description is required');
	if (!taskTypes.includes(body.type as TaskType)) return apiError(400, 'type must be one of: bug, feature');
	if (!platforms.includes(body.platform as Platform)) {
		return apiError(400, `platform must be one of: ${platforms.join(', ')}`);
	}

	const id = randomUUID();
	await createTask(getDb(), {
		id,
		title,
		description,
		type: body.type as TaskType,
		platform: body.platform as Platform,
		userId: user.id,
		attachments: [],
		via: locals.via
	});
	return json(await getTaskForApi(getDb(), id, user), { status: 201 });
};
