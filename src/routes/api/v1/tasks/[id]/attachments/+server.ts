import { json } from '@sveltejs/kit';
import { checkUploads, detectFileType, removeStored, storeFiles, type StoredFile } from '$lib/server/attachments';
import { getDb } from '$lib/server/db';
import { logger } from '$lib/server/logger';
import { apiError, failed, readBody, requireExpected } from '$lib/server/api';
import { getStorage } from '$lib/server/storage';
import { getUploadLimitBytes } from '$lib/server/upload-config';
import { addAttachments, checkAttachmentsEditable, getTaskForApi } from '$lib/server/tasks';
import type { RequestHandler } from './$types';

const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;

/**
 * TM-22: tambah 1 lampiran ke task yang belum Done. Body JSON (bukan multipart: SvelteKit nolak form multipart
 * yang gak bawa header Origin, dan klien API gak ngirim itu): `file_name` + `content_base64` (boleh pakai awalan
 * `data:<mime>;base64,`) + `expected_updated_at`. Aturan file sama kayak form: gambar/PDF dicek dari isinya.
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = locals.user!;
	const read = await readBody(request, ['expected_updated_at', 'file_name', 'content_base64']);
	if (!read.ok) return read.response;
	const { body } = read;
	const expected = requireExpected(body);
	if (!expected.ok) return expected.response;

	const name = (body.file_name ?? '').trim();
	if (!name) return apiError(400, 'file_name is required');
	const raw = (body.content_base64 ?? '').replace(/^data:[^,]*;base64,/, '').replace(/\s+/g, '');
	if (!raw || raw.length % 4 !== 0 || !BASE64_PATTERN.test(raw)) {
		return apiError(400, 'content_base64 must be the file content encoded in base64');
	}
	const bytes = new Uint8Array(Buffer.from(raw, 'base64'));
	// Jenis file ditentuin dari isi; mime kiriman gak dipakai (sama kayak form, ujungnya dicek ulang checkUploads).
	const file = new File([bytes], name, { type: detectFileType(bytes)?.mime ?? 'application/octet-stream' });
	const uploads = await checkUploads([file], getUploadLimitBytes());
	if (!uploads.ok) return apiError(400, uploads.error);

	const editable = await checkAttachmentsEditable(getDb(), params.id, expected.value);
	if (!editable.ok) return failed(editable)!;

	const storage = getStorage();
	let stored: StoredFile[] = [];
	try {
		stored = await storeFiles(storage, params.id, uploads.files);
		const result = await addAttachments(getDb(), {
			id: params.id,
			files: stored,
			user,
			via: locals.via,
			expectedUpdatedAt: expected.value
		});
		if (!result.ok) {
			await removeStored(storage, stored);
			return failed(result)!;
		}
	} catch (e) {
		await removeStored(storage, stored).catch(() => undefined);
		logger.error('task.attachment.add_failed', {
			storage: storage.name,
			via: locals.via,
			error: e instanceof Error ? e.message : String(e)
		});
		return apiError(500, 'Failed to save the attachment. Please try again.');
	}
	return json(await getTaskForApi(getDb(), params.id, user), { status: 201 });
};
