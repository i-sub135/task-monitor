import { error } from '@sveltejs/kit';
import { readAttachment } from '$lib/server/attachments';
import { getDb } from '$lib/server/db';
import { logger } from '$lib/server/logger';
import { getStorage } from '$lib/server/storage';
import { findAttachment } from '$lib/server/tasks';
import type { RequestHandler } from './$types';

// Cuma buat yang login (guard di hooks). Key dari DB divalidasi lagi supaya gak keluar dari storage/attachment.
export const GET: RequestHandler = async ({ params }) => {
	const att = await findAttachment(getDb(), params.id);
	if (!att) error(404, 'Attachment not found');

	let bytes: Uint8Array | null;
	try {
		bytes = await readAttachment(getStorage(), att.filePath);
	} catch (e) {
		logger.error('attachment.read.failed', { id: params.id, error: e instanceof Error ? e.message : String(e) });
		error(500, 'Failed to read the attachment');
	}
	if (!bytes) error(404, 'Attachment file not found');

	const safeName = att.fileName.replace(/["\\\r\n]/g, '_');
	return new Response(bytes as BodyInit, {
		headers: {
			'Content-Type': att.mimeType,
			'Content-Length': String(bytes.byteLength),
			'Content-Disposition': `inline; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(att.fileName)}`,
			'X-Content-Type-Options': 'nosniff',
			'Content-Security-Policy': "default-src 'none'; sandbox",
			'Cache-Control': 'private, max-age=3600'
		}
	});
};
