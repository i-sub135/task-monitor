import { canAdvance, type Role } from './roles.ts';

export type Status = 'request' | 'queue' | 'in-progress' | 'ready-to-test' | 'done' | 'done-live' | 'rejected';
/** TM-19: support = kerjaan operasional (bikinin akun, reset, akses). Cuma 2 status: Request → Done. */
export type TaskType = 'bug' | 'feature' | 'support';
/** TM-12: platform yang kena task. Satu task = satu platform, wajib diisi, `other` = fallback. */
export type Platform = 'api' | 'mobile' | 'ai-chat' | 'web' | 'other';

export const statusLabels: Record<Status, string> = {
	request: 'Request',
	queue: 'Queue',
	'in-progress': 'In progress',
	'ready-to-test': 'Ready to test',
	done: 'Done',
	'done-live': 'Live',
	rejected: 'Rejected'
};

export const platformLabels: Record<Platform, string> = {
	api: 'API',
	mobile: 'Mobile',
	'ai-chat': 'AI Chat',
	web: 'Web',
	other: 'Other'
};

export const statuses = Object.keys(statusLabels) as Status[];

/**
 * TM-15: kolom di board. `done-live` itu status sendiri di data (biar transisi + history-nya jalan
 * lewat mekanisme yang sama), tapi tampil di kolom Done bareng `done`, bukan kolom ke-7.
 */
export const boardColumns: Status[] = ['request', 'queue', 'in-progress', 'ready-to-test', 'done', 'rejected'];
export const columnOf = (status: Status): Status => (status === 'done-live' ? 'done' : status);
export const taskTypes: TaskType[] = ['bug', 'feature', 'support'];
export const platforms = Object.keys(platformLabels) as Platform[];

/**
 * Transisi maju doang (brainstorming.md bagian 3), rejected terminal. TM-15: done ↔ done-live (mark live /
 * unmark) satu-satunya jalan mundur, buat salah tandai atau rollback deploy.
 */
export const transitions: Record<Status, Status[]> = {
	request: ['queue', 'rejected'],
	queue: ['in-progress'],
	'in-progress': ['ready-to-test'],
	'ready-to-test': ['done'],
	done: ['done-live'],
	'done-live': ['done'],
	rejected: []
};

/**
 * TM-19: task support cuma punya 2 status, Request → Done (langsung, tanpa Queue/In progress/Ready to test,
 * tanpa reject, tanpa Live). Developer ke atas yang boleh geser (marketing tetep gak bisa, lewat canAdvance).
 */
const supportTransitions: Record<Status, Status[]> = {
	request: ['done'],
	queue: [],
	'in-progress': [],
	'ready-to-test': [],
	done: [],
	'done-live': [],
	rejected: []
};

/** Status tujuan yang ada dari `from` buat type ini (belum ngecek role). */
export const transitionsFor = (type: TaskType, from: Status): Status[] =>
	type === 'support' ? supportTransitions[from] : transitions[from];

/** Kolom yang urutannya bisa digeser: request (semua role) dan queue (developer dan admin). */
export const canReorder = (role: Role, status: Status): boolean => {
	if (status === 'request') return true;
	if (status === 'queue') return canAdvance(role);
	return false;
};

export const hasOrdering = (status: Status): boolean => status === 'request' || status === 'queue';

/** TM-13: kartu yang tampil per kolom di /board. Sisanya di /board/list/[status]. */
export const BOARD_COLUMN_LIMIT = 5;

/** TM-11: title/description cuma boleh diedit selama task masih Request atau Queue, role apa pun. */
export const canEditTask = (status: Status): boolean => status === 'request' || status === 'queue';

export type RuleResult = { ok: true } | { ok: false; status: number; error: string };

/**
 * TM-14: transisi yang cuma boleh role tertentu. Transisi yang gak ada di sini boleh semua role yang
 * `canAdvance`. Kuncinya `${from}>${to}`.
 */
const restrictedTransitions: Partial<Record<`${Status}>${Status}`, Role[]>> = {
	'ready-to-test>done': ['qa', 'admin'],
	// TM-15: mark live / unmark cuma developer + admin.
	'done>done-live': ['developer', 'admin'],
	'done-live>done': ['developer', 'admin']
};

/**
 * Boleh gak role ini mindahin task type `type` dari `from` ke `to` (cek urutan transisi per type + hak role).
 * Dipakai server dan UI. Aturan role khusus (restrictedTransitions) cuma berlaku buat jalur bug/feature.
 */
export const canMakeTransition = (role: Role, from: Status, to: Status, type: TaskType): boolean => {
	if (!canAdvance(role) || !transitionsFor(type, from).includes(to)) return false;
	if (type === 'support') return true;
	const only = restrictedTransitions[`${from}>${to}`];
	return !only || only.includes(role);
};

/** Target yang boleh dituju role ini dari status `from`, buat task type `type`. */
export const allowedTargets = (role: Role, from: Status, type: TaskType): Status[] =>
	transitionsFor(type, from).filter((to) => canMakeTransition(role, from, to, type));

/** Aturan transisi di satu tempat. Server yang jadi hakim, UI cuma ngikutin buat nampilin tombol. */
export const checkTransition = (input: {
	from: Status;
	to: Status;
	note: string;
	role: Role;
	type: TaskType;
}): RuleResult => {
	if (!canAdvance(input.role)) {
		return { ok: false, status: 403, error: 'The marketing role cannot change status' };
	}
	if (!transitionsFor(input.type, input.from).includes(input.to)) {
		return {
			ok: false,
			status: 400,
			error:
				input.type === 'support'
					? `Support tasks can only move from Request to Done`
					: `Cannot move from ${statusLabels[input.from]} to ${statusLabels[input.to]}`
		};
	}
	if (!canMakeTransition(input.role, input.from, input.to, input.type)) {
		const only = restrictedTransitions[`${input.from}>${input.to}`] ?? [];
		return {
			ok: false,
			status: 403,
			error: `Only ${only.map((r) => (r === 'qa' ? 'QA' : r)).join(' or ')} can move a task from ${statusLabels[input.from]} to ${statusLabels[input.to]}`
		};
	}
	if (input.to === 'rejected' && !input.note.trim()) {
		return { ok: false, status: 400, error: 'A reason is required to reject a task' };
	}
	return { ok: true };
};

export type BoardTask = {
	id: string;
	title: string;
	type: TaskType;
	platform: Platform;
	status: Status;
	createdBy: string;
	/** TM-16: buat filter "Created by" (nama bisa kembar, id enggak). */
	createdById: string;
	createdAt: string;
	ageDays: number;
	/** Nomor urut di kolom (1..n) buat request dan queue, null di kolom lain. */
	position: number | null;
	attachments: number;
};


export type HistoryEntry = {
	id: string;
	from: Status | null;
	to: Status;
	by: string;
	/** TM-17: nama API token kalau lewat API, null kalau lewat UI. */
	via: string | null;
	at: string;
	note: string | null;
};

export type AttachmentInfo = { id: string; name: string; mime: string; size: number };

/** TM-11/TM-12: satu baris per edit title/description/type/platform yang sukses. */
export type EditEntry = {
	id: string;
	field: 'title' | 'description' | 'type' | 'platform';
	by: string;
	/** TM-17: nama API token kalau lewat API, null kalau lewat UI. */
	via: string | null;
	at: string;
	/** Buat title/type/platform: teks polos. Buat description: HTML yang udah disaring, aman dipakai lewat {@html}. */
	oldValue: string;
	newValue: string;
};

export type TaskDetail = {
	id: string;
	title: string;
	/** Isi asli tersimpan (HTML rich text, atau teks polos buat task dari sebelum TM-10). */
	description: string;
	/** Sudah diproses buat ditampilin lewat `{@html}`: teks lama di-escape, HTML disaring ulang. */
	descriptionHtml: string;
	type: TaskType;
	platform: Platform;
	status: Status;
	createdBy: string;
	createdAt: string;
	attachments: AttachmentInfo[];
	history: HistoryEntry[];
	edits: EditEntry[];
};
