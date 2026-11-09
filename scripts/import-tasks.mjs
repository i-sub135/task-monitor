#!/usr/bin/env node
// Import task satu kali dari JSON (format: docs/task-import-format.md) → SQL ke stdout.
// Script ini gak nyambung ke DB; hasilnya di-pipe ke psql, mis.:
//   node scripts/import-tasks.mjs tasks.json | docker exec -i <container postgres> psql -U <user> -d task_monitor -v ON_ERROR_STOP=1
// Semua dalam 1 transaksi: satu task gagal = nol yang masuk.
// TM-25: aturan validasinya sama persis sama halaman /task/import (satu modul, src/lib/server/task-import.ts).
// Lewat UI lebih gampang (ada preview + cek dobel); script ini buat jalur darurat.
import { readFileSync } from 'node:fs';
import { nameFromEmail, parseImport } from '../src/lib/server/task-import.ts';

const file = process.argv[2];
if (!file) {
	console.error('usage: node scripts/import-tasks.mjs <tasks.json>');
	process.exit(1);
}
const parsed = parseImport(readFileSync(file, 'utf8'));
if (!parsed.ok) {
	console.error(parsed.errors.join('\n'));
	process.exit(1);
}
const { tasks } = parsed;

const q = (s) => `'${s.replaceAll("'", "''")}'`;

const out = ['BEGIN;', ''];
const emails = [...new Set(tasks.map((t) => t.createdBy))];
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
			`VALUES (gen_random_uuid(), ${q(t.title)}, ${q(t.description)}, '${t.type}', '${t.platform}', 'request', ` +
			`(SELECT coalesce(max(ordering), 0) + 1 FROM task WHERE status = 'request'), ` +
			`(SELECT id FROM users WHERE email = ${q(t.createdBy)}), clock_timestamp(), clock_timestamp()) ` +
			`RETURNING id, created_by, created_at) ` +
			`INSERT INTO task_history (id, task_id, status_before, status_after, created_by, created_at) ` +
			`SELECT gen_random_uuid(), id, NULL, 'request', created_by, created_at FROM t;`
	);
}
out.push('', 'COMMIT;', '');
process.stdout.write(out.join('\n'));
