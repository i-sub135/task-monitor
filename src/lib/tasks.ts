import { canAdvance, type Role } from './roles.ts';

export type Status = 'request' | 'queue' | 'in-progress' | 'ready-to-test' | 'done' | 'rejected';
export type TaskType = 'bug' | 'feature';

export const statusLabels: Record<Status, string> = {
	request: 'Request',
	queue: 'Queue',
	'in-progress': 'In progress',
	'ready-to-test': 'Ready to test',
	done: 'Done',
	rejected: 'Rejected'
};

export const statuses = Object.keys(statusLabels) as Status[];
export const taskTypes: TaskType[] = ['bug', 'feature'];

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

export type RuleResult = { ok: true } | { ok: false; status: number; error: string };

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
	if (input.to === 'rejected' && !input.note.trim()) {
		return { ok: false, status: 400, error: 'A reason is required to reject a task' };
	}
	return { ok: true };
}

export type BoardTask = {
	id: string;
	title: string;
	type: TaskType;
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

export type TaskDetail = {
	id: string;
	title: string;
	description: string;
	type: TaskType;
	status: Status;
	createdBy: string;
	createdAt: string;
	attachments: AttachmentInfo[];
	history: HistoryEntry[];
};
