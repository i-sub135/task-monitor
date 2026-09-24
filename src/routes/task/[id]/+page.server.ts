import { error } from '@sveltejs/kit';
import { getTask } from '$lib/mock/tasks';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const task = getTask(params.id);
	if (!task) error(404, 'Task tidak ditemukan');
	return { task };
};
