import { randomUUID } from 'node:crypto';
import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { apiError, descriptionFromApi, readBody } from '$lib/server/api';
import { createTask, getTaskForApi, listTasksForApi } from '$lib/server/tasks';
import { descriptionText } from '$lib/server/richtext';
import { platforms, statuses, taskTypes, type Platform, type Status, type TaskType } from '$lib/utils/tasks';
import type { RequestHandler } from './$types';

// TM-17: daftar task. `?status=<status>` dan/atau `?mine=true` (cuma task yang dibikin pemilik token).
// Gak ada parameter user: "punya siapa" selalu diambil dari token, jadi gak bisa ngintip/ngurus punya orang.
export const GET: RequestHandler = async ({ url, locals }) => {
	const unknown = [...url.searchParams.keys()].filter((k) => k !== 'status' && k !== 'mine');
	if (unknown.length) return apiError(400, `Unknown query parameter(s): ${unknown.join(', ')}`);

	const status = url.searchParams.get('status');
	if (status !== null && !statuses.includes(status as Status)) {
		return apiError(400, `status must be one of: ${statuses.join(', ')}`);
	}
	const mine = url.searchParams.get('mine');
	if (mine !== null && mine !== 'true' && mine !== 'false') return apiError(400, 'mine must be true or false');

	const tasks = await listTasksForApi(getDb(), {
		user: locals.user!,
		status: (status as Status | null) ?? undefined,
		mine: mine === 'true'
	});
	return json({ count: tasks.length, tasks });
};

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
	if (!taskTypes.includes(body.type as TaskType)) return apiError(400, `type must be one of: ${taskTypes.join(', ')}`);
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
