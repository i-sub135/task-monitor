import { randomUUID } from 'node:crypto';
import { error, fail, redirect } from '@sveltejs/kit';
import { checkUploads, removeStored, storeFiles, type StoredFile } from '$lib/server/attachments';
import { getDb } from '$lib/server/db';
import { logger } from '$lib/server/logger';
import { RecreateError, createTask, getRecreateSource } from '$lib/server/tasks';
import { getStorage } from '$lib/server/storage';
import { getUploadLimitBytes } from '$lib/server/upload-config';
import { descriptionText, sanitizeDescription } from '$lib/server/richtext';
import { MAX_FILES } from '$lib/utils/upload-limits';
import { platforms, taskTypes, type Platform, type TaskType } from '$lib/utils/tasks';
import type { Actions, PageServerLoad } from './$types';

// TM-21: `?from=<id task Rejected>` = recreate; form diisi dari task itu. Gak sah (gak ada / bukan Rejected /
// udah pernah di-recreate) = halaman error, bukan form kosong diam-diam.
const recreateSourceOr404 = async (id: string) => {
	try {
		return await getRecreateSource(getDb(), id);
	} catch (e) {
		if (e instanceof RecreateError) error(e.status, e.message);
		throw e;
	}
};

export const load: PageServerLoad = async ({ url }) => {
	const from = url.searchParams.get('from');
	return {
		maxFiles: MAX_FILES,
		maxFileBytes: getUploadLimitBytes(),
		recreateFrom: from ? await recreateSourceOr404(from) : null
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/');

		const form = await request.formData();
		const recreateFrom = String(form.get('recreate_from') ?? '') || null;
		const title = String(form.get('title') ?? '').trim();
		// TM-10: description sekarang HTML dari rich text editor. Disaring di sini (bukan cuma di
		// render) sebelum disentuh lagi, jadi apa yang kesimpan dan yang di-echo balik ke form
		// (kalau validasi field lain gagal) udah pasti bersih, nol markup mentah dari klien.
		const description = sanitizeDescription(String(form.get('description') ?? ''));
		const type = String(form.get('type') ?? '');
		// TM-12: wajib diisi, sama kayak type — nol default diam-diam pas bikin task baru.
		const platform = String(form.get('platform') ?? '');
		const files = form
			.getAll('attachments')
			.filter((f): f is File => f instanceof File && f.size > 0);

		const errors: Record<string, string> = {};
		if (!title) errors.title = 'Title is required';
		else if (title.length > 120) errors.title = 'Title must be at most 120 characters';
		if (!descriptionText(description)) errors.description = 'Description is required';
		if (!taskTypes.includes(type as TaskType)) errors.type = 'Choose bug, feature or support';
		if (!platforms.includes(platform as Platform)) errors.platform = 'Choose a platform';

		const uploads = await checkUploads(files, getUploadLimitBytes());
		if (!uploads.ok) errors.attachments = uploads.error;

		if (Object.keys(errors).length > 0 || !uploads.ok) {
			return fail(400, { errors, values: { title, description, type, platform } });
		}

		// File ditulis dulu, baru DB. Kalau transaksi gagal, file yang udah ditulis dihapus lagi.
		const id = randomUUID();
		const storage = getStorage();
		let stored: StoredFile[] = [];
		try {
			stored = await storeFiles(storage, id, uploads.files);
			await createTask(getDb(), {
				id,
				title,
				description,
				type: type as TaskType,
				platform: platform as Platform,
				userId: locals.user.id,
				attachments: stored,
				recreatedFromId: recreateFrom
			});
		} catch (e) {
			await removeStored(storage, stored).catch((cleanup) =>
				logger.error('task.create.cleanup_failed', {
					storage: storage.name,
					keys: stored.map((f) => f.filePath),
					error: cleanup instanceof Error ? cleanup.message : String(cleanup)
				})
			);
			// TM-21: recreate ditolak (mis. keduluan orang lain) = pesan jelas, bukan "gagal simpan".
			if (e instanceof RecreateError) {
				const recreateErrors: Record<string, string> = { form: e.message };
				return fail(e.status, { errors: recreateErrors, values: { title, description, type, platform } });
			}
			logger.error('task.create.failed', {
				storage: storage.name,
				error: e instanceof Error ? e.message : String(e)
			});
			const saveErrors: Record<string, string> = { form: 'Failed to save the task. Please try again.' };
			return fail(500, { errors: saveErrors, values: { title, description, type, platform } });
		}

		redirect(303, `/task/${id}`);
	}
};
