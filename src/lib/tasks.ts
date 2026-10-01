import { canAdvance, type Role } from './roles.ts';

export type Status = 'request' | 'queue' | 'in-progress' | 'ready-to-test' | 'done' | 'rejected';
export type TaskType = 'bug' | 'feature';
/** TM-12: platform yang kena task. Satu task = satu platform, wajib diisi, `other` = fallback. */
export type Platform = 'api' | 'mobile' | 'ai-chat' | 'web' | 'other';

export const statusLabels: Record<Status, string> = {
	request: 'Request',
	queue: 'Queue',
	'in-progress': 'In progress',
	'ready-to-test': 'Ready to test',
	done: 'Done',
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
export const taskTypes: TaskType[] = ['bug', 'feature'];
export const platforms = Object.keys(platformLabels) as Platform[];

/** Transisi maju doang (brainstorming.md bagian 3). done dan rejected terminal. */
export const transitions: Record<Status, Status[]> = {
	request: ['queue', 'rejected'],
	queue: ['in-progress'],
	'in-progress': ['ready-to-test'],
	'ready-to-test': ['done'],
	done: [],
	rejected: []
};

/** Kolom yang urutannya bisa digeser: request (semua role) dan queue (developer dan admin). */
export function canReorder(role: Role, status: Status): boolean {
	if (status === 'request') return true;
	if (status === 'queue') return canAdvance(role);
	return false;
}

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
	'ready-to-test>done': ['qa', 'admin']
};

/** Boleh gak role ini mindahin dari `from` ke `to` (cek urutan transisi + hak role). Dipakai server dan UI. */
export function canMakeTransition(role: Role, from: Status, to: Status): boolean {
	if (!canAdvance(role) || !transitions[from].includes(to)) return false;
	const only = restrictedTransitions[`${from}>${to}`];
	return !only || only.includes(role);
}

/** Target yang boleh dituju role ini dari status `from`. */
export const allowedTargets = (role: Role, from: Status): Status[] =>
	transitions[from].filter((to) => canMakeTransition(role, from, to));

/** Aturan transisi di satu tempat. Server yang jadi hakim, UI cuma ngikutin buat nampilin tombol. */
export function checkTransition(input: { from: Status; to: Status; note: string; role: Role }): RuleResult {
	if (!canAdvance(input.role)) {
		return { ok: false, status: 403, error: 'The marketing role cannot change status' };
	}
	if (!transitions[input.from].includes(input.to)) {
		return {
			ok: false,
			status: 400,
			error: `Cannot move from ${statusLabels[input.from]} to ${statusLabels[input.to]}`
		};
	}
	if (!canMakeTransition(input.role, input.from, input.to)) {
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
}

export type BoardTask = {
	id: string;
	title: string;
	type: TaskType;
	platform: Platform;
	status: Status;
	createdBy: string;
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
	at: string;
	note: string | null;
};

export type AttachmentInfo = { id: string; name: string; mime: string; size: number };

/** TM-11/TM-12: satu baris per edit title/description/type/platform yang sukses. */
export type EditEntry = {
	id: string;
	field: 'title' | 'description' | 'type' | 'platform';
	by: string;
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
