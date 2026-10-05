import { json } from '@sveltejs/kit';
import { sanitizeDescription } from './richtext.ts';
import type { ActionResult } from './tasks.ts';

/**
 * TM-17: helper buat endpoint /api/v1. Body JSON object, field-nya string semua, field yang gak dikenal
 * ditolak (biar typo nama field ketahuan, bukan diem-diem diabaikan).
 */
export type Body = Record<string, string>;

export const apiError = (status: number, error: string) => json({ error }, { status });

export async function readBody(
	request: Request,
	allowed: readonly string[]
): Promise<{ ok: true; body: Body } | { ok: false; response: Response }> {
	let raw: unknown;
	try {
		raw = await request.json();
	} catch {
		return { ok: false, response: apiError(400, 'Body must be valid JSON') };
	}
	if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
		return { ok: false, response: apiError(400, 'Body must be a JSON object') };
	}
	const unknown = Object.keys(raw).filter((k) => !allowed.includes(k));
	if (unknown.length) return { ok: false, response: apiError(400, `Unknown field(s): ${unknown.join(', ')}`) };
	for (const [key, value] of Object.entries(raw)) {
		if (typeof value !== 'string') return { ok: false, response: apiError(400, `Field "${key}" must be a string`) };
	}
	return { ok: true, body: raw as Body };
}

/** Update wajib bawa `expected_updated_at` dari GET. Gak ada = 428 (baca dulu, baru nulis). */
export function requireExpected(body: Body): { ok: true; value: string } | { ok: false; response: Response } {
	const value = body.expected_updated_at;
	if (!value) {
		return {
			ok: false,
			response: apiError(428, 'expected_updated_at is required: GET the task first and send back its updated_at')
		};
	}
	if (Number.isNaN(Date.parse(value))) {
		return { ok: false, response: apiError(400, 'expected_updated_at must be the updated_at value from GET') };
	}
	return { ok: true, value };
}

// Dianggap HTML cuma kalau ada tag yang emang diizinin editor. Teks polos yang kebetulan ada `<sesuatu>`
// (mis. "list <item>") tetap teks: di-escape, bukan dibuang diam-diam sama sanitizer.
const ALLOWED_TAG_PATTERN = /<\/?(p|strong|em|u|ul|ol|li|br|blockquote)\b[^>]*>/i;

/** Description dari API: HTML disaring kayak dari editor; teks polos dibungkus <p> (newline jadi <br>). */
export function descriptionFromApi(raw: string): string {
	if (ALLOWED_TAG_PATTERN.test(raw)) return sanitizeDescription(raw);
	const escaped = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	return `<p>${sanitizeDescription(escaped.replace(/\r\n|\r|\n/g, '<br>'))}</p>`;
}

export const failed = (result: ActionResult) => (result.ok ? null : apiError(result.status, result.error));
