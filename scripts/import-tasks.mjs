#!/usr/bin/env node
// Import task satu kali dari JSON (format: docs/task-import-format.md) → SQL ke stdout.
// Script ini gak nyambung ke DB; hasilnya di-pipe ke psql, mis.:
//   node scripts/import-tasks.mjs tasks.json | docker exec -i <container postgres> psql -U <user> -d task_monitor -v ON_ERROR_STOP=1
// Semua dalam 1 transaksi: satu task gagal = nol yang masuk.
import { readFileSync } from 'node:fs';
import sanitizeHtml from 'sanitize-html';

// Harus sama dengan src/lib/server/richtext.ts dan src/lib/tasks.ts.
const ALLOWED_TAGS = ['p', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'br', 'blockquote'];
const TYPES = ['bug', 'feature', 'support'];
const PLATFORMS = ['api', 'mobile', 'ai-chat', 'web', 'other'];
const FIELDS = ['title', 'description', 'type', 'platform', 'created_by'];

const file = process.argv[2];
if (!file) {
	console.error('usage: node scripts/import-tasks.mjs <tasks.json>');
	process.exit(1);
}
const tasks = JSON.parse(readFileSync(file, 'utf8'));
if (!Array.isArray(tasks) || tasks.length === 0) {
	console.error('JSON harus array task yang gak kosong');
	process.exit(1);
}

const errors = [];
tasks.forEach((t, i) => {
	const at = `task #${i + 1}`;
	if (typeof t !== 'object' || t === null || Array.isArray(t)) return errors.push(`${at}: bukan object`);
	const keys = Object.keys(t);
	const extra = keys.filter((k) => !FIELDS.includes(k));
	const missing = FIELDS.filter((k) => !keys.includes(k));
	if (extra.length) errors.push(`${at}: field gak dikenal: ${extra.join(', ')}`);
	if (missing.length) errors.push(`${at}: field kurang: ${missing.join(', ')}`);
	if (typeof t.title !== 'string' || !t.title.trim()) errors.push(`${at}: title kosong`);
	else if (/[\r\n]/.test(t.title)) errors.push(`${at}: title lebih dari satu baris`);
	if (!TYPES.includes(t.type)) errors.push(`${at}: type "${t.type}" gak dikenal`);
	if (!PLATFORMS.includes(t.platform)) errors.push(`${at}: platform "${t.platform}" gak dikenal`);
	if (typeof t.created_by !== 'string' || !/^[^\s@A-Z]+@[^\s@A-Z]+\.[^\s@A-Z]+$/.test(t.created_by))
		errors.push(`${at}: created_by "${t.created_by}" bukan email huruf kecil`);
	if (typeof t.description !== 'string') return errors.push(`${at}: description bukan string`);
	const plain = sanitizeHtml(t.description, { allowedTags: [], allowedAttributes: {} }).trim();
	if (!plain) errors.push(`${at}: description kosong`);
	const clean = sanitizeHtml(t.description, { allowedTags: ALLOWED_TAGS, allowedAttributes: {}, disallowedTagsMode: 'discard' });
	if (clean !== t.description) errors.push(`${at}: description pakai tag/atribut yang gak diizinin`);
});
if (errors.length) {
	console.error(errors.join('\n'));
	process.exit(1);
}

const q = (s) => `'${s.replaceAll("'", "''")}'`;
// Teks polos tanpa tag dibungkus <p>, sama kayak yang dijanjiin di docs.
const html = (s) => (/<[a-z][\s\S]*>/i.test(s) ? s : `<p>${sanitizeHtml(s, { allowedTags: [], allowedAttributes: {} })}</p>`);
// budi.santoso@maal.id → "Budi Santoso"
const nameFromEmail = (email) =>
	email
		.split('@')[0]
		.split(/[._-]+/)
		.filter(Boolean)
		.map((w) => w[0].toUpperCase() + w.slice(1))
		.join(' ');

const out = ['BEGIN;', ''];
const emails = [...new Set(tasks.map((t) => t.created_by))];
out.push('-- User pembuat yang belum ada: dibikin role marketing, status active. Yang udah ada gak diubah.');
for (const email of emails) {
	out.push(
		`INSERT INTO users (id, name, email, role, status, created_at, updated_at) ` +
			`SELECT gen_random_uuid(), ${q(nameFromEmail(email))}, ${q(email)}, 'marketing', 'active', now(), now() ` +
			`WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = ${q(email)});`
	);
}
out.push('', `-- ${tasks.length} task, semua status request, urutan = urutan di JSON (di bawah request yang udah ada).`);
for (const t of tasks) {
	out.push(
		`WITH t AS (INSERT INTO task (id, title, description, type, platform, status, ordering, created_by, created_at, updated_at) ` +
			`VALUES (gen_random_uuid(), ${q(t.title.trim())}, ${q(html(t.description))}, '${t.type}', '${t.platform}', 'request', ` +
			`(SELECT coalesce(max(ordering), 0) + 1 FROM task WHERE status = 'request'), ` +
			`(SELECT id FROM users WHERE email = ${q(t.created_by)}), clock_timestamp(), clock_timestamp()) ` +
			`RETURNING id, created_by, created_at) ` +
			`INSERT INTO task_history (id, task_id, status_before, status_after, created_by, created_at) ` +
			`SELECT gen_random_uuid(), id, NULL, 'request', created_by, created_at FROM t;`
	);
}
out.push('', 'COMMIT;', '');
process.stdout.write(out.join('\n'));
