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

const checkTask = (t: unknown, at: string): string[] => {
	if (typeof t !== 'object' || t === null || Array.isArray(t)) return [`${at}: not an object`];
	const task = t as Record<string, unknown>;
	const errors: string[] = [];
	const keys = Object.keys(task);
	const extra = keys.filter((k) => !FIELDS.includes(k));
	const missing = FIELDS.filter((k) => !keys.includes(k));
	if (extra.length) errors.push(`${at}: unknown field: ${extra.join(', ')}`);
	if (missing.length) errors.push(`${at}: missing field: ${missing.join(', ')}`);
	if (typeof task.title !== 'string' || !task.title.trim()) errors.push(`${at}: title is empty`);
	else if (/[\r\n]/.test(task.title)) errors.push(`${at}: title has more than one line`);
	if (!taskTypes.includes(task.type as TaskType)) errors.push(`${at}: unknown type "${task.type}"`);
	if (!platforms.includes(task.platform as Platform)) errors.push(`${at}: unknown platform "${task.platform}"`);
	if (typeof task.created_by !== 'string' || !EMAIL_PATTERN.test(task.created_by))
		errors.push(`${at}: created_by "${task.created_by}" is not a lowercase email`);
	if (typeof task.description !== 'string') return [...errors, `${at}: description is not a string`];
	if (!descriptionText(task.description)) errors.push(`${at}: description is empty`);
	if (sanitizeDescription(task.description) !== task.description) {
		// Sebut tag-nya kalau ketemu (mis. <code>), biar gak nyari manual. Kalau nol, berarti atribut / karakter.
		const bad = [...new Set([...task.description.matchAll(/<\/?([a-z][a-z0-9]*)/gi)].map((m) => m[1].toLowerCase()))]
			.filter((tag) => !ALLOWED_TAGS.includes(tag));
		errors.push(
			`${at}: description uses ${bad.length ? bad.map((tag) => `<${tag}>`).join(', ') : 'an attribute or character'} that is not allowed`
		);
	}
	return errors;
};

/** Baca isi file JSON. Satu task salah = semua ditolak, error dikumpulin semua biar sekali benerin. */
export const parseImport = (text: string): ParseResult => {
	let data: unknown;
	try {
		data = JSON.parse(text);
	} catch (e) {
		return { ok: false, errors: [`Not valid JSON: ${e instanceof Error ? e.message : String(e)}`] };
	}
	if (!Array.isArray(data) || data.length === 0) return { ok: false, errors: ['JSON must be a non-empty array of tasks'] };

	const errors = data.flatMap((t, i) => checkTask(t, `Task #${i + 1}`));
	if (errors.length) return { ok: false, errors };

	return {
		ok: true,
		tasks: data.map((t) => ({
			title: t.title.trim(),
			description: toDescriptionHtml(t.description),
			type: t.type,
			platform: t.platform,
			createdBy: t.created_by
		}))
	};
};
