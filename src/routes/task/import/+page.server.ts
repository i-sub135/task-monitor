import { fail } from '@sveltejs/kit';
import { hasRole, requireRole } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { logger } from '$lib/server/logger';
import { parseImport, parseImportRows } from '$lib/server/task-import';
import { importTasks, previewImport } from '$lib/server/tasks';
import type { Actions, PageServerLoad } from './$types';

// TM-25: import task dari file JSON (docs/task-import-format.md), cuma admin, karena bisa bikin user baru.
// Dua langkah: preview (tabel review, nol tulis; baris bisa dihapus di browser) → import baris yang tersisa.
// Yang dikirim pas import dicek ulang di server dari nol, gak percaya hasil preview.
const FORBIDDEN = 'Only admins can import tasks';
const MAX_BYTES = 1024 * 1024;

export const load: PageServerLoad = ({ locals }) => {
	requireRole(locals, 'admin');
	return { maxBytes: MAX_BYTES };
};

/** Isi JSON dari file yang dipilih (preview) atau dari field tersembunyi (import). */
const readJson = async (form: FormData): Promise<{ ok: true; text: string } | { ok: false; error: string }> => {
	const file = form.get('file');
	if (file instanceof File && file.size > 0) {
		if (file.size > MAX_BYTES) return { ok: false, error: 'File is larger than 1 MB' };
		return { ok: true, text: await file.text() };
	}
	const text = String(form.get('json') ?? '');
	if (!text) return { ok: false, error: 'Choose a JSON file' };
	if (new TextEncoder().encode(text).length > MAX_BYTES) return { ok: false, error: 'File is larger than 1 MB' };
	return { ok: true, text };
};

/** Tabel review buat teks JSON ini, atau pesan error tingkat file (bukan JSON, bukan array, kosong). */
const review = async (text: string, fileName: string) => {
	const parsed = parseImportRows(text);
	if (!parsed.ok) return fail(400, { fileName, error: parsed.error });
	return { fileName, rows: await previewImport(getDb(), parsed.rows) };
};

export const actions: Actions = {
	preview: async ({ request, locals }) => {
		if (!hasRole(locals.user, 'admin')) return fail(403, { fileName: '', error: FORBIDDEN });
		const form = await request.formData();
		const input = await readJson(form);
		if (!input.ok) return fail(400, { fileName: '', error: input.error });
		const file = form.get('file');
		return review(input.text, file instanceof File ? file.name : '');
	},

	import: async ({ request, locals }) => {
		if (!hasRole(locals.user, 'admin')) return fail(403, { fileName: '', error: FORBIDDEN });
		const form = await request.formData();
		const input = await readJson(form);
		if (!input.ok) return fail(400, { fileName: '', error: input.error });
		const fileName = String(form.get('fileName') ?? '');

		// Masih ada baris salah (mis. dikirim di luar UI) = nol yang masuk, tabelnya dibalikin lengkap sama error-nya.
		const parsed = parseImport(input.text);
		if (!parsed.ok) return review(input.text, fileName);
		const result = await importTasks(getDb(), parsed.tasks);
		logger.info('task.import', { by: locals.user!.id, imported: result.imported, newUsers: result.newUsers.length });
		return { fileName, imported: result.imported, newUsers: result.newUsers };
	}
};
