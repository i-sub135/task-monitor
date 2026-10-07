import { error, fail } from '@sveltejs/kit';
import { checkUploads, removeStored, storeFiles, type StoredFile } from '$lib/server/attachments';
import { getDb } from '$lib/server/db';
import { logger } from '$lib/server/logger';
import { descriptionText, sanitizeDescription } from '$lib/server/richtext';
import { getStorage } from '$lib/server/storage';
import { getUploadLimitBytes } from '$lib/server/upload-config';
import { MAX_FILES } from '$lib/utils/upload-limits';
import {
	addAttachments,
	checkAttachmentsEditable,
	getTaskDetail,
	removeAttachment,
	transitionTask,
	updateTaskDescription,
	updateTaskPlatform,
	updateTaskTitle,
	updateTaskType
} from '$lib/server/tasks';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const task = await getTaskDetail(getDb(), params.id);
	if (!task) error(404, 'Task not found');
	return { task, maxFiles: MAX_FILES, maxFileBytes: getUploadLimitBytes() };
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
	},

	updateType: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401, { editError: 'Session expired, please log in again' });
		const form = await request.formData();
		const result = await updateTaskType(getDb(), {
			id: params.id,
			type: String(form.get('type') ?? ''),
			user: locals.user
		});
		if (!result.ok) return fail(result.status, { editError: result.error });
		return { typeUpdated: true };
	},

	updatePlatform: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401, { editError: 'Session expired, please log in again' });
		const form = await request.formData();
		const result = await updateTaskPlatform(getDb(), {
			id: params.id,
			platform: String(form.get('platform') ?? ''),
			user: locals.user
		});
		if (!result.ok) return fail(result.status, { editError: result.error });
		return { platformUpdated: true };
	},

	// TM-22: tambah lampiran dari detail (sampai sebelum Done). Total per task gak dibatasi; per sekali upload
	// tetep maks MAX_FILES, karena batas ukuran request server dihitung dari situ.
	addAttachments: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401, { attachmentError: 'Session expired, please log in again' });
		const form = await request.formData();
		const files = form.getAll('attachments').filter((f): f is File => f instanceof File && f.size > 0);
		if (files.length === 0) return fail(400, { attachmentError: 'Choose at least one file' });
		if (files.length > MAX_FILES) {
			return fail(400, { attachmentError: `Upload at most ${MAX_FILES} files at a time` });
		}
		const uploads = await checkUploads(files, getUploadLimitBytes());
		if (!uploads.ok) return fail(400, { attachmentError: uploads.error });
		const editable = await checkAttachmentsEditable(getDb(), params.id);
		if (!editable.ok) return fail(editable.status, { attachmentError: editable.error });

		// File ditulis dulu, baru DB (sama kayak task/new). Ditolak/gagal: file yang udah ditulis dihapus lagi.
		const storage = getStorage();
		let stored: StoredFile[] = [];
		try {
			stored = await storeFiles(storage, params.id, uploads.files);
			const result = await addAttachments(getDb(), { id: params.id, files: stored, user: locals.user });
			if (!result.ok) {
				await removeStored(storage, stored);
				return fail(result.status, { attachmentError: result.error });
			}
		} catch (e) {
			await removeStored(storage, stored).catch(() => undefined);
			logger.error('task.attachment.add_failed', {
				storage: storage.name,
				error: e instanceof Error ? e.message : String(e)
			});
			return fail(500, { attachmentError: 'Failed to save the attachments. Please try again.' });
		}
		return { attachmentsAdded: true };
	},

	removeAttachment: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401, { attachmentError: 'Session expired, please log in again' });
		const form = await request.formData();
		const result = await removeAttachment(getDb(), {
			id: params.id,
			attachmentId: String(form.get('attachment_id') ?? ''),
			user: locals.user
		});
		if (!result.ok) return fail(result.status, { attachmentError: result.error });
		return { attachmentRemoved: true };
	}
};
