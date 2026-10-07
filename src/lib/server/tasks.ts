import { calendarDaysAgo, formatJakarta } from '../utils/time.ts';
import { renderDescriptionHtml, sanitizeDescription, descriptionText } from './richtext.ts';
import type { SessionUser } from '../utils/roles.ts';
import {
	allowedTargets,
	checkTransition,
	canReorder,
	canEditTask,
	hasOrdering,
	statuses,
	boardColumns,
	columnOf,
	taskTypes,
	platforms,
	type BoardTask,
	type Platform,
	type RuleResult,
	type Status,
	type TaskDetail,
	type TaskType
} from '../utils/tasks.ts';
import type { Prisma, PrismaClient } from './generated/prisma/client.ts';
import type { TaskStatus, TaskPlatform } from './generated/prisma/enums.ts';
import type { StoredFile } from './attachments.ts';

// Di DB label enum pakai tanda hubung (@map), di client Prisma jadi in_progress dst. Di app tetap 'in-progress'.
const statusToApp: Record<TaskStatus, Status> = {
	request: 'request',
	queue: 'queue',
	in_progress: 'in-progress',
	ready_to_test: 'ready-to-test',
	done: 'done',
	done_live: 'done-live',
	rejected: 'rejected'
};
const statusToDb: Record<Status, TaskStatus> = {
	request: 'request',
	queue: 'queue',
	'in-progress': 'in_progress',
	'ready-to-test': 'ready_to_test',
	done: 'done',
	'done-live': 'done_live',
	rejected: 'rejected'
};

// TM-12: sama pola kayak statusToApp/statusToDb, cuma buat platform (client 'ai_chat' <-> DB/app 'ai-chat').
const platformToApp: Record<TaskPlatform, Platform> = {
	api: 'api',
	mobile: 'mobile',
	ai_chat: 'ai-chat',
	web: 'web',
	other: 'other'
};
const platformToDb: Record<Platform, TaskPlatform> = {
	api: 'api',
	mobile: 'mobile',
	'ai-chat': 'ai_chat',
	web: 'web',
	other: 'other'
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Tx = Prisma.TransactionClient;

/** Semua yang ngubah urutan (bikin, pindah kolom, geser) antre lewat satu kunci, biar nomor urut gak dobel. */
const ORDERING_LOCK = 42_001;
const lockOrdering = (tx: Tx) => tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${ORDERING_LOCK})`);

/** Ambil urutan kolom sekarang, lalu tulis ulang jadi 1..n tanpa lompat (cuma yang berubah). */
const applyOrder = async (tx: Tx, ids: { id: string; ordering: number }[]) => {
	for (let i = 0; i < ids.length; i++) {
		if (ids[i].ordering !== i + 1) {
			await tx.task.update({ where: { id: ids[i].id }, data: { ordering: i + 1 } });
		}
	}
};

const columnOrder = (tx: Tx, status: TaskStatus) =>
	tx.task.findMany({
		where: { status },
		orderBy: [{ ordering: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
		select: { id: true, ordering: true }
	});

const renumberColumn = async (tx: Tx, status: TaskStatus) => {
	await applyOrder(tx, await columnOrder(tx, status));
};

// ---------------------------------------------------------------- baca

export const listBoard = async (db: PrismaClient, now: Date = new Date()): Promise<{ tasks: BoardTask[] }> => {
	const rows = await db.task.findMany({
		include: { createdBy: { select: { name: true } }, _count: { select: { attachments: true } } }
	});

	// TM-15: dikelompokin per kolom board (done-live ikut kolom Done). Di kolom Done yang belum live di atas.
	const liveLast = (s: TaskStatus) => (s === 'done_live' ? 1 : 0);
	const tasks: BoardTask[] = [];
	for (const column of boardColumns) {
		const inColumn = rows
			.filter((r) => columnOf(statusToApp[r.status]) === column)
			.sort(
				hasOrdering(column)
					? (a, b) => a.ordering - b.ordering || a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id)
					: (a, b) =>
							liveLast(a.status) - liveLast(b.status) ||
							b.updatedAt.getTime() - a.updatedAt.getTime() ||
							a.id.localeCompare(b.id)
			);
		inColumn.forEach((r, i) =>
			tasks.push({
				id: r.id,
				title: r.title,
				type: r.type,
				platform: platformToApp[r.platform],
				status: statusToApp[r.status],
				createdBy: r.createdBy.name,
				createdById: r.createdById,
				createdAt: formatJakarta(r.createdAt),
				ageDays: calendarDaysAgo(r.createdAt, now),
				position: hasOrdering(column) ? i + 1 : null,
				attachments: r._count.attachments
			})
		);
	}

	return { tasks };
};

export const getTaskDetail = async (db: PrismaClient, id: string): Promise<TaskDetail | null> => {
	if (!UUID_PATTERN.test(id)) return null;
	const t = await db.task.findUnique({
		where: { id },
		include: {
			createdBy: { select: { name: true } },
			recreatedFrom: { select: { id: true, title: true } },
			recreatedAs: { select: { id: true, title: true } },
			attachments: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
			history: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], include: { createdBy: { select: { name: true } } } },
			edits: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], include: { editedBy: { select: { name: true } } } }
		}
	});
	if (!t) return null;
	return {
		id: t.id,
		title: t.title,
		description: t.description,
		descriptionHtml: renderDescriptionHtml(t.description),
		type: t.type,
		platform: platformToApp[t.platform],
		status: statusToApp[t.status],
		createdBy: t.createdBy.name,
		createdAt: formatJakarta(t.createdAt),
		recreatedFrom: t.recreatedFrom,
		recreatedAs: t.recreatedAs,
		attachments: t.attachments.map((a) => ({ id: a.id, name: a.fileName, mime: a.mimeType, size: a.size })),
		history: t.history.map((h) => ({
			id: h.id,
			from: h.statusBefore ? statusToApp[h.statusBefore] : null,
			to: statusToApp[h.statusAfter],
			by: h.createdBy.name,
			via: h.via,
			at: formatJakarta(h.createdAt),
			note: h.note
		})),
		edits: t.edits.map((e) => ({
			id: e.id,
			field: e.field,
			by: e.editedBy.name,
			via: e.via,
			at: formatJakarta(e.createdAt),
			// description: nilai lama bisa aja teks polos legacy (task pra-TM-10) atau HTML — disaring ulang
			// lewat fungsi yang sama kayak descriptionHtml, biar aman dipakai lewat {@html} di UI.
			oldValue: e.field === 'description' ? renderDescriptionHtml(e.oldValue) : e.oldValue,
			newValue: e.field === 'description' ? renderDescriptionHtml(e.newValue) : e.newValue
		}))
	};
};

export const findAttachment = async (db: PrismaClient, id: string) => {
	if (!UUID_PATTERN.test(id)) return null;
	return db.taskAttachment.findUnique({ where: { id }, select: { fileName: true, filePath: true, mimeType: true } });
};

// ---------------------------------------------------------------- tulis

export type NewTask = {
	id: string;
	title: string;
	description: string;
	type: TaskType;
	platform: Platform;
	userId: string;
	attachments: StoredFile[];
	/** TM-17: nama API token kalau lewat API, null/kosong kalau lewat UI. */
	via?: string | null;
	/** TM-21: id task Rejected yang di-recreate jadi task ini. */
	recreatedFromId?: string | null;
};

/** TM-21: recreate gak sah (task asal gak ada / bukan Rejected / udah pernah di-recreate). */
export class RecreateError extends Error {
	constructor(
		readonly status: number,
		message: string
	) {
		super(message);
	}
}

export type RecreateSource = { id: string; title: string; description: string; type: TaskType; platform: Platform };

/** TM-21: cek task asal recreate di dalam/luar transaksi. Lempar RecreateError kalau gak boleh. */
const loadRecreateSource = async (db: Tx | PrismaClient, id: string): Promise<RecreateSource> => {
	if (!UUID_PATTERN.test(id)) throw new RecreateError(404, 'Task to recreate not found');
	const t = await db.task.findUnique({
		where: { id },
		select: { id: true, title: true, description: true, type: true, platform: true, status: true, recreatedAs: { select: { id: true } } }
	});
	if (!t) throw new RecreateError(404, 'Task to recreate not found');
	if (t.status !== 'rejected') throw new RecreateError(400, 'Only rejected tasks can be recreated');
	if (t.recreatedAs) throw new RecreateError(409, 'This task has already been recreated');
	return { id: t.id, title: t.title, description: t.description, type: t.type, platform: platformToApp[t.platform] };
};

/** TM-21: isi awal form New task waktu recreate (`/task/new?from=<id>`). */
export const getRecreateSource = (db: PrismaClient, id: string): Promise<RecreateSource> => loadRecreateSource(db, id);

/** Task + baris history pertama + lampiran dalam 1 transaksi. Masuk kolom request, paling belakang. */
export const createTask = async (db: PrismaClient, input: NewTask): Promise<void> => {
	const now = Date.now();
	await db.$transaction(async (tx) => {
		await lockOrdering(tx);
		// TM-21: dicek ulang di dalam transaksi (di bawah lock) — dua orang klik Recreate barengan, satu yang menang;
		// kalaupun lolos, unique index `recreated_from` tetep nolak yang kedua.
		const source = input.recreatedFromId ? await loadRecreateSource(tx, input.recreatedFromId) : null;
		const last = await tx.task.aggregate({ where: { status: 'request' }, _max: { ordering: true } });
		await tx.task.create({
			data: {
				id: input.id,
				title: input.title,
				description: input.description,
				type: input.type,
				platform: platformToDb[input.platform],
				status: 'request',
				ordering: (last._max.ordering ?? 0) + 1,
				createdById: input.userId,
				recreatedFromId: source?.id ?? null,
				// TM-21: jejak recreate di Edit history task baru (old = id task asal, new = judul task asal).
				...(source
					? { edits: { create: { field: 'recreate', oldValue: source.id, newValue: source.title, editedById: input.userId } } }
					: {}),
				history: {
					create: { statusBefore: null, statusAfter: 'request', createdById: input.userId, via: input.via ?? null }
				},
				attachments: {
					// createdAt selisih 1 ms per file, biar urutan tampil = urutan upload (semuanya 1 transaksi).
					create: input.attachments.map((a, i) => ({
						fileName: a.name,
						filePath: a.filePath,
						mimeType: a.mime,
						size: a.size,
						createdById: input.userId,
						createdAt: new Date(now + i)
					}))
				}
			}
		});
	});
};

export type ActionResult = RuleResult;

/**
 * TM-17: API wajib baca dulu sebelum nulis. Pemanggil API ngirim `updated_at` hasil GET; kalau task udah
 * berubah sejak dibaca, tolak (409) biar dia GET ulang. UI gak ngirim (undefined) jadi gak dicek.
 */
const staleCheck = (updatedAt: Date, expectedUpdatedAt: string | undefined): ActionResult | null => {
	if (expectedUpdatedAt === undefined) return null;
	if (Date.parse(expectedUpdatedAt) === updatedAt.getTime()) return null;
	return { ok: false, status: 409, error: 'Task has changed since you read it. GET it again, then retry.' };
};

/**
 * Pindah status: aturan dicek di sini (bukan di UI), lalu status, ordering dan 1 baris history
 * ditulis dalam 1 transaksi. Kolom yang ditinggalkan dirapihin lagi jadi 1..n.
 */
export const transitionTask = async (
	db: PrismaClient,
	input: { id: string; to: string; note: string; user: SessionUser; via?: string | null; expectedUpdatedAt?: string }
): Promise<ActionResult> => {
	const note = input.note.trim();
	if (input.user.role === 'marketing') {
		return { ok: false, status: 403, error: 'The marketing role cannot change status' };
	}
	if (!UUID_PATTERN.test(input.id)) return { ok: false, status: 404, error: 'Task not found' };
	if (!statuses.includes(input.to as Status)) return { ok: false, status: 400, error: 'Invalid status' };
	const to = input.to as Status;

	return db.$transaction(async (tx): Promise<ActionResult> => {
		await lockOrdering(tx);
		const row = await tx.task.findUnique({
			where: { id: input.id },
			select: { status: true, type: true, updatedAt: true }
		});
		if (!row) return { ok: false, status: 404, error: 'Task not found' };
		const stale = staleCheck(row.updatedAt, input.expectedUpdatedAt);
		if (stale) return stale;

		const from = statusToApp[row.status];
		const check = checkTransition({ from, to, note, role: input.user.role, type: row.type });
		if (!check.ok) return check;

		let ordering: number | undefined;
		if (to === 'queue') {
			const last = await tx.task.aggregate({ where: { status: 'queue' }, _max: { ordering: true } });
			ordering = (last._max.ordering ?? 0) + 1;
		}

		await tx.task.update({
			where: { id: input.id },
			data: { status: statusToDb[to], ...(ordering !== undefined ? { ordering } : {}) }
		});
		await tx.taskHistory.create({
			data: {
				taskId: input.id,
				statusBefore: row.status,
				statusAfter: statusToDb[to],
				note: note || null,
				createdById: input.user.id,
				via: input.via ?? null
			}
		});
		if (hasOrdering(from)) await renumberColumn(tx, statusToDb[from]);
		return { ok: true };
	});
};

export type TaskChanges = { title?: string; description?: string; type?: string; platform?: string };
type EditField = keyof TaskChanges;

/**
 * TM-11/TM-12/TM-17: ganti title/description/type/platform. Satu jalur buat UI (satu field per aksi) dan API
 * (beberapa field sekaligus). Cuma boleh selama status Request/Queue (dicek ulang di sini, bukan cuma di UI,
 * buat nutup race: status bisa pindah persis sebelum submit). Tiap field yang beneran berubah = 1 baris
 * `task_edit` (nilai lama + baru) buat audit; yang nilainya sama persis gak dicatat. `description` harus
 * udah disaring (`sanitizeDescription`) oleh pemanggil, sama kayak `createTask`.
 */
export const updateTaskFields = async (
	db: PrismaClient,
	input: { id: string; changes: TaskChanges; user: SessionUser; via?: string | null; expectedUpdatedAt?: string }
): Promise<ActionResult> => {
	if (!UUID_PATTERN.test(input.id)) return { ok: false, status: 404, error: 'Task not found' };
	const { changes } = input;
	const next: Partial<Record<EditField, string>> = {};
	if (changes.title !== undefined) {
		const title = changes.title.trim();
		if (!title) return { ok: false, status: 400, error: 'Title is required' };
		if (title.length > 120) return { ok: false, status: 400, error: 'Title must be at most 120 characters' };
		next.title = title;
	}
	if (changes.description !== undefined) {
		if (!descriptionText(changes.description)) return { ok: false, status: 400, error: 'Description is required' };
		next.description = changes.description;
	}
	if (changes.type !== undefined) {
		if (!taskTypes.includes(changes.type as TaskType)) {
			return { ok: false, status: 400, error: 'Choose bug, feature or support' };
		}
		next.type = changes.type;
	}
	if (changes.platform !== undefined) {
		if (!platforms.includes(changes.platform as Platform)) {
			return { ok: false, status: 400, error: 'Choose a valid platform' };
		}
		next.platform = changes.platform;
	}
	const fields = Object.keys(next) as EditField[];
	if (fields.length === 0) return { ok: false, status: 400, error: 'Nothing to update' };

	return db.$transaction(async (tx): Promise<ActionResult> => {
		const row = await tx.task.findUnique({
			where: { id: input.id },
			select: { status: true, title: true, description: true, type: true, platform: true, updatedAt: true }
		});
		if (!row) return { ok: false, status: 404, error: 'Task not found' };
		const stale = staleCheck(row.updatedAt, input.expectedUpdatedAt);
		if (stale) return stale;
		if (!canEditTask(statusToApp[row.status])) {
			return { ok: false, status: 403, error: 'Task can only be edited while in Request or Queue' };
		}
		// TM-19: support cuma punya Request/Done; task di Queue gak boleh diubah jadi support (bakal nyangkut).
		if (next.type === 'support' && row.type !== 'support' && row.status !== 'request') {
			return { ok: false, status: 400, error: 'Only tasks in Request can be changed to support' };
		}

		// Nilai lama/baru disimpen dalam bentuk app-level ('ai-chat', bukan 'ai_chat' punya client), biar UI
		// bisa langsung map lewat platformLabels tanpa perlu tau representasi DB.
		const current: Record<EditField, string> = {
			title: row.title,
			description: row.description,
			type: row.type,
			platform: platformToApp[row.platform]
		};
		const changed = fields.filter((f) => current[f] !== next[f]);
		if (changed.length === 0) return { ok: true };

		await tx.task.update({
			where: { id: input.id },
			data: {
				...(changed.includes('title') ? { title: next.title } : {}),
				...(changed.includes('description') ? { description: next.description } : {}),
				...(changed.includes('type') ? { type: next.type as TaskType } : {}),
				...(changed.includes('platform') ? { platform: platformToDb[next.platform as Platform] } : {})
			}
		});
		await tx.taskEdit.createMany({
			data: changed.map((field) => ({
				taskId: input.id,
				field,
				oldValue: current[field],
				newValue: next[field] as string,
				editedById: input.user.id,
				via: input.via ?? null
			}))
		});
		return { ok: true };
	});
};

// UI (halaman detail task): satu field per aksi, lewat jalur yang sama.
export const updateTaskTitle = (db: PrismaClient, input: { id: string; title: string; user: SessionUser }) =>
	updateTaskFields(db, { id: input.id, changes: { title: input.title }, user: input.user });
export const updateTaskDescription = (
	db: PrismaClient,
	input: { id: string; description: string; user: SessionUser }
) => updateTaskFields(db, { id: input.id, changes: { description: input.description }, user: input.user });
export const updateTaskType = (db: PrismaClient, input: { id: string; type: string; user: SessionUser }) =>
	updateTaskFields(db, { id: input.id, changes: { type: input.type }, user: input.user });
export const updateTaskPlatform = (db: PrismaClient, input: { id: string; platform: string; user: SessionUser }) =>
	updateTaskFields(db, { id: input.id, changes: { platform: input.platform }, user: input.user });

/** Geser kartu ke posisi `position` (1-based) di kolomnya. Kolom dinomori ulang 1..n dalam 1 transaksi. */
export const reorderTask = async (
	db: PrismaClient,
	input: { id: string; position: number; user: SessionUser }
): Promise<ActionResult> => {
	if (!UUID_PATTERN.test(input.id)) return { ok: false, status: 404, error: 'Task not found' };
	if (!Number.isInteger(input.position)) return { ok: false, status: 400, error: 'Invalid position' };

	return db.$transaction(async (tx): Promise<ActionResult> => {
		await lockOrdering(tx);
		const row = await tx.task.findUnique({ where: { id: input.id }, select: { status: true } });
		if (!row) return { ok: false, status: 404, error: 'Task not found' };

		const status = statusToApp[row.status];
		if (!hasOrdering(status)) return { ok: false, status: 400, error: 'This column has no ordering' };
		if (!canReorder(input.user.role, status)) {
			return { ok: false, status: 403, error: 'Your role cannot reorder this column' };
		}

		const ids = await columnOrder(tx, row.status);
		const from = ids.findIndex((t) => t.id === input.id);
		const to = Math.min(Math.max(input.position, 1), ids.length) - 1;
		const [moved] = ids.splice(from, 1);
		ids.splice(to, 0, moved);
		await applyOrder(tx, ids);
		return { ok: true };
	});
};

// ---------------------------------------------------------------- API (TM-17)

export type ApiTask = {
	id: string;
	title: string;
	/** HTML yang udah disaring (tag: p, strong, em, u, ul, ol, li, br, blockquote). */
	description: string;
	type: TaskType;
	platform: Platform;
	status: Status;
	created_by: string;
	created_at: string;
	/** Kirim balik nilai ini sebagai `expected_updated_at` pas PATCH / transition. */
	updated_at: string;
	/** true selama Request/Queue: title/description/type/platform boleh diedit. */
	editable: boolean;
	/** Status tujuan yang boleh buat pemilik token ini dari status sekarang. */
	allowed_transitions: Status[];
	history: { from: Status | null; to: Status; by: string; via: string | null; note: string | null; at: string }[];
};

export const getTaskForApi = async (db: PrismaClient, id: string, user: SessionUser): Promise<ApiTask | null> => {
	if (!UUID_PATTERN.test(id)) return null;
	const t = await db.task.findUnique({
		where: { id },
		include: {
			createdBy: { select: { name: true } },
			history: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], include: { createdBy: { select: { name: true } } } }
		}
	});
	if (!t) return null;
	const status = statusToApp[t.status];
	return {
		id: t.id,
		title: t.title,
		description: t.description,
		type: t.type,
		platform: platformToApp[t.platform],
		status,
		created_by: t.createdBy.name,
		created_at: t.createdAt.toISOString(),
		updated_at: t.updatedAt.toISOString(),
		editable: canEditTask(status),
		allowed_transitions: allowedTargets(user.role, status, t.type),
		history: t.history.map((h) => ({
			from: h.statusBefore ? statusToApp[h.statusBefore] : null,
			to: statusToApp[h.statusAfter],
			by: h.createdBy.name,
			via: h.via,
			note: h.note,
			at: h.createdAt.toISOString()
		}))
	};
};

export type ApiTaskSummary = Omit<ApiTask, 'description' | 'history'> & {
	/** Nomor urut di kolom (1..n) buat request/queue, null di status lain. */
	position: number | null;
};

/**
 * TM-17: daftar task buat API. Filter opsional: `status` (persis, `done` ≠ `done-live`) dan `mine` (cuma
 * task yang dibikin pemilik token — user diambil dari token, gak bisa nanya punya orang lain). Urutan per
 * status sama kayak board: request/queue ikut ordering, sisanya yang terakhir berubah di atas.
 */
export const listTasksForApi = async (
	db: PrismaClient,
	input: { user: SessionUser; status?: Status; mine?: boolean }
): Promise<ApiTaskSummary[]> => {
	const rows = await db.task.findMany({
		where: {
			...(input.status ? { status: statusToDb[input.status] } : {}),
			...(input.mine ? { createdById: input.user.id } : {})
		},
		include: { createdBy: { select: { name: true } } }
	});
	const out: ApiTaskSummary[] = [];
	for (const status of statuses) {
		const inStatus = rows
			.filter((r) => statusToApp[r.status] === status)
			.sort(
				hasOrdering(status)
					? (a, b) => a.ordering - b.ordering || a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id)
					: (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime() || a.id.localeCompare(b.id)
			);
		// Posisi dihitung dari urutan kolom penuh, bukan hasil filter `mine` (biar sama kayak nomor di board).
		const fullColumn = hasOrdering(status) && inStatus.length > 0
			? await db.task.findMany({
					where: { status: statusToDb[status] },
					orderBy: [{ ordering: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
					select: { id: true }
				})
			: [];
		for (const t of inStatus) {
			const idx = fullColumn.findIndex((r) => r.id === t.id);
			out.push({
				id: t.id,
				title: t.title,
				type: t.type,
				platform: platformToApp[t.platform],
				status,
				created_by: t.createdBy.name,
				created_at: t.createdAt.toISOString(),
				updated_at: t.updatedAt.toISOString(),
				editable: canEditTask(status),
				allowed_transitions: allowedTargets(input.user.role, status, t.type),
				position: idx >= 0 ? idx + 1 : null
			});
		}
	}
	return out;
};

// ---------------------------------------------------------------- aktivitas token (TM-18)

export type TokenActivity = {
	id: string;
	/** nama token yang dipakai (kolom `via`) */
	via: string;
	at: string;
	taskId: string;
	taskTitle: string;
} & (
	| { kind: 'status'; from: Status | null; to: Status }
	| { kind: 'edit'; field: 'title' | 'description' | 'type' | 'platform' | 'recreate' }
);

export const TOKEN_ACTIVITY_LIMIT = 50;

/**
 * TM-18: aksi terakhir yang dilakuin lewat token milik user ini (create, geser status, edit), terbaru di atas.
 * Sumbernya `task_history` + `task_edit` yang `via`-nya keisi; aksi dari UI (via null) gak ikut. `via` opsional
 * buat nyaring satu nama token. Baca (GET/list) gak pernah dicatat ke DB, jadi gak ada di sini.
 */
export const listTokenActivity = async (
	db: PrismaClient,
	input: { userId: string; via?: string }
): Promise<{ items: TokenActivity[]; names: string[] }> => {
	const via = input.via ? { equals: input.via } : { not: null };
	const [history, edits, historyNames, editNames] = await Promise.all([
		db.taskHistory.findMany({
			where: { createdById: input.userId, via },
			orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
			take: TOKEN_ACTIVITY_LIMIT,
			include: { task: { select: { title: true } } }
		}),
		db.taskEdit.findMany({
			where: { editedById: input.userId, via },
			orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
			take: TOKEN_ACTIVITY_LIMIT,
			include: { task: { select: { title: true } } }
		}),
		db.taskHistory.findMany({ where: { createdById: input.userId, via: { not: null } }, distinct: ['via'], select: { via: true } }),
		db.taskEdit.findMany({ where: { editedById: input.userId, via: { not: null } }, distinct: ['via'], select: { via: true } })
	]);

	const rows = [
		...history.map((h) => ({
			ms: h.createdAt.getTime(),
			item: {
				id: h.id,
				via: h.via as string,
				at: formatJakarta(h.createdAt),
				taskId: h.taskId,
				taskTitle: h.task.title,
				kind: 'status' as const,
				from: h.statusBefore ? statusToApp[h.statusBefore] : null,
				to: statusToApp[h.statusAfter]
			}
		})),
		...edits.map((e) => ({
			ms: e.createdAt.getTime(),
			item: {
				id: e.id,
				via: e.via as string,
				at: formatJakarta(e.createdAt),
				taskId: e.taskId,
				taskTitle: e.task.title,
				kind: 'edit' as const,
				field: e.field
			}
		}))
	];
	rows.sort((a, b) => b.ms - a.ms || b.item.id.localeCompare(a.item.id));
	const names = [...new Set([...historyNames, ...editNames].map((r) => r.via as string))].sort((a, b) =>
		a.localeCompare(b)
	);
	return { items: rows.slice(0, TOKEN_ACTIVITY_LIMIT).map((r) => r.item), names };
};
