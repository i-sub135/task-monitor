import { fail, redirect } from '@sveltejs/kit';
import { addTask, type TaskType } from '$lib/mock/tasks';
import type { Actions } from './$types';

const MAX_FILES = 5;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const isAllowedMime = (mime: string) => mime.startsWith('image/') || mime === 'application/pdf';

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		const description = String(form.get('description') ?? '').trim();
		const type = String(form.get('type') ?? '');
		const files = form
			.getAll('attachments')
			.filter((f): f is File => f instanceof File && f.size > 0);

		const errors: Record<string, string> = {};
		if (!title) errors.title = 'Judul wajib diisi';
		else if (title.length > 120) errors.title = 'Judul maksimal 120 karakter';
		if (!description) errors.description = 'Deskripsi wajib diisi';
		if (type !== 'bug' && type !== 'feature') errors.type = 'Pilih bug atau feature';
		if (files.length > MAX_FILES) errors.attachments = `Maksimal ${MAX_FILES} lampiran`;
		else if (files.some((f) => f.size > MAX_FILE_BYTES)) errors.attachments = 'Maksimal 5 MB per file';
		else if (files.some((f) => !isAllowedMime(f.type))) errors.attachments = 'Hanya gambar atau PDF';

		if (Object.keys(errors).length > 0) {
			return fail(400, { errors, values: { title, description, type } });
		}

		// Mock: cuma nyimpen nama + mime, isi file gak disimpan.
		const task = addTask({
			title,
			description,
			type: type as TaskType,
			attachments: files.map((f) => ({ name: f.name, mime: f.type }))
		});
		redirect(303, `/task/${task.id}`);
	}
};
