import { ALLOWED_TAGS, descriptionText, sanitizeDescription } from './richtext.ts';
import { platforms, taskTypes, type Platform, type TaskType } from '../utils/tasks.ts';

// TM-25: aturan import JSON (docs/task-import-format.md) satu tempat, dipakai halaman /task/import dan
// scripts/import-tasks.mjs. Modul ini gak nyentuh DB, jadi script bisa ngimpor tanpa Prisma.

export type ImportTask = {
	title: string;
	/** Udah final: teks polos dibungkus <p>, HTML apa adanya (udah dicek lolos saringan). */
	description: string;
	type: TaskType;
	platform: Platform;
	createdBy: string;
};

export type ParseResult = { ok: true; tasks: ImportTask[] } | { ok: false; errors: string[] };

const FIELDS = ['title', 'description', 'type', 'platform', 'created_by'];
const EMAIL_PATTERN = /^[^\s@A-Z]+@[^\s@A-Z]+\.[^\s@A-Z]+$/;
const HTML_TAG_PATTERN = /<[a-z][\s\S]*>/i;

/** Teks polos tanpa tag dibungkus <p>, sama kayak yang dijanjiin di docs. */
const toDescriptionHtml = (s: string): string =>
	HTML_TAG_PATTERN.test(s) ? s : `<p>${s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;

/** budi.santoso@maal.id → "Budi Santoso" */
export const nameFromEmail = (email: string): string =>
	email
		.split('@')[0]
		.split(/[._-]+/)
		.filter(Boolean)
		.map((w) => w[0].toUpperCase() + w.slice(1))
		.join(' ');

/** Cek satu task. Error gak dikasih awalan nomor; pemanggil yang nambahin kalau perlu. */
const checkTask = (t: unknown): string[] => {
	if (typeof t !== 'object' || t === null || Array.isArray(t)) return ['not an object'];
	const task = t as Record<string, unknown>;
	const errors: string[] = [];
	const keys = Object.keys(task);
	const extra = keys.filter((k) => !FIELDS.includes(k));
	const missing = FIELDS.filter((k) => !keys.includes(k));
	if (extra.length) errors.push(`unknown field: ${extra.join(', ')}`);
	if (missing.length) errors.push(`missing field: ${missing.join(', ')}`);
	if (typeof task.title !== 'string' || !task.title.trim()) errors.push('title is empty');
	else if (/[\r\n]/.test(task.title)) errors.push('title has more than one line');
	if (!taskTypes.includes(task.type as TaskType)) errors.push(`unknown type "${task.type}"`);
	if (!platforms.includes(task.platform as Platform)) errors.push(`unknown platform "${task.platform}"`);
	if (typeof task.created_by !== 'string' || !EMAIL_PATTERN.test(task.created_by))
		errors.push(`created_by "${task.created_by}" is not a lowercase email`);
	if (typeof task.description !== 'string') return [...errors, 'description is not a string'];
	if (!descriptionText(task.description)) errors.push('description is empty');
	if (sanitizeDescription(task.description) !== task.description) {
		// Sebut tag-nya kalau ketemu (mis. <code>), biar gak nyari manual. Kalau nol, berarti atribut / karakter.
		const bad = [...new Set([...task.description.matchAll(/<\/?([a-z][a-z0-9]*)/gi)].map((m) => m[1].toLowerCase()))]
			.filter((tag) => !ALLOWED_TAGS.includes(tag));
		errors.push(
			`description uses ${bad.length ? bad.map((tag) => `<${tag}>`).join(', ') : 'an attribute or character'} that is not allowed`
		);
	}
	return errors;
};

const toTask = (t: Record<string, string>): ImportTask => ({
	title: t.title.trim(),
	description: toDescriptionHtml(t.description),
	type: t.type as TaskType,
	platform: t.platform as Platform,
	createdBy: t.created_by
});

/** Satu baris file: object aslinya (dikirim balik pas submit), hasil cek, dan task final kalau lolos. */
export type ImportRow = { raw: unknown; task: ImportTask | null; errors: string[] };

export type RowsResult = { ok: true; rows: ImportRow[] } | { ok: false; error: string };

/** Baca isi file JSON per baris, buat tabel review: baris yang salah tetep ikut, lengkap sama error-nya. */
export const parseImportRows = (text: string): RowsResult => {
	let data: unknown;
	try {
		data = JSON.parse(text);
	} catch (e) {
		return { ok: false, error: `Not valid JSON: ${e instanceof Error ? e.message : String(e)}` };
	}
	if (!Array.isArray(data) || data.length === 0) return { ok: false, error: 'JSON must be a non-empty array of tasks' };
	return {
		ok: true,
		rows: data.map((raw) => {
			const errors = checkTask(raw);
			return { raw, errors, task: errors.length ? null : toTask(raw as Record<string, string>) };
		})
	};
};

/** Semua-atau-nol: satu task salah = semua ditolak, error dikumpulin semua biar sekali benerin. */
export const parseImport = (text: string): ParseResult => {
	const parsed = parseImportRows(text);
	if (!parsed.ok) return { ok: false, errors: [parsed.error] };
	const errors = parsed.rows.flatMap((r, i) => r.errors.map((e) => `Task #${i + 1}: ${e}`));
	if (errors.length) return { ok: false, errors };
	return { ok: true, tasks: parsed.rows.map((r) => r.task!) };
};
