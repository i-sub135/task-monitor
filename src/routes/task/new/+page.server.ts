import { randomUUID } from 'node:crypto';
import { fail, redirect } from '@sveltejs/kit';
import { checkUploads, removeStored, storeFiles, type StoredFile } from '$lib/server/attachments';
import { getDb } from '$lib/server/db';
import { logger } from '$lib/server/logger';
import { createTask } from '$lib/server/tasks';
import { getUploadLimitBytes } from '$lib/server/upload-config';
import { MAX_FILES } from '$lib/upload-limits';
import type { TaskType } from '$lib/tasks';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	maxFiles: MAX_FILES,
	maxFileBytes: getUploadLimitBytes()
});

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/');

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

		const uploads = await checkUploads(files, getUploadLimitBytes());
		if (!uploads.ok) errors.attachments = uploads.error;

		if (Object.keys(errors).length > 0 || !uploads.ok) {
			return fail(400, { errors, values: { title, description, type } });
		}

		// File ditulis dulu, baru DB. Kalau transaksi gagal, file yang udah ditulis dihapus lagi.
		const id = randomUUID();
		let stored: StoredFile[] = [];
		try {
			stored = await storeFiles(id, uploads.files);
			await createTask(getDb(), {
				id,
				title,
				description,
				type: type as TaskType,
				userId: locals.user.id,
				attachments: stored
			});
		} catch (e) {
			await removeStored(id, stored).catch(() => undefined);
			logger.error('task.create.failed', { error: e instanceof Error ? e.message : String(e) });
			const saveErrors: Record<string, string> = { form: 'Gagal menyimpan task. Coba lagi.' };
			return fail(500, { errors: saveErrors, values: { title, description, type } });
		}

		redirect(303, `/task/${id}`);
	}
};
