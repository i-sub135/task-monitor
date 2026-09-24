import { formatJakarta } from '../time.ts';
import type { SessionUser } from '../roles.ts';
import {
	checkTransition,
	canReorder,
	hasOrdering,
	statuses,
	type BoardSummary,
	type BoardTask,
	type RuleResult,
	type Status,
	type TaskDetail,
	type TaskType
} from '../tasks.ts';
import type { Prisma, PrismaClient } from './generated/prisma/client.ts';
import type { TaskStatus } from './generated/prisma/enums.ts';
import type { StoredFile } from './attachments.ts';

// Di DB label enum pakai tanda hubung (@map), di client Prisma jadi in_progress dst. Di app tetap 'in-progress'.
const statusToApp: Record<TaskStatus, Status> = {
	request: 'request',
	queue: 'queue',
	in_progress: 'in-progress',
	ready_to_test: 'ready-to-test',
	done: 'done',
	rejected: 'rejected'
};
const statusToDb: Record<Status, TaskStatus> = {
	request: 'request',
	queue: 'queue',
	'in-progress': 'in_progress',
	'ready-to-test': 'ready_to_test',
	done: 'done',
	rejected: 'rejected'
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY_MS = 24 * 60 * 60 * 1000;

type Tx = Prisma.TransactionClient;

/** Semua yang ngubah urutan (bikin, pindah kolom, geser) antre lewat satu kunci, biar nomor urut gak dobel. */
const ORDERING_LOCK = 42_001;
const lockOrdering = (tx: Tx) => tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${ORDERING_LOCK})`);

/** Ambil urutan kolom sekarang, lalu tulis ulang jadi 1..n tanpa lompat (cuma yang berubah). */
async function applyOrder(tx: Tx, ids: { id: string; ordering: number }[]) {
	for (let i = 0; i < ids.length; i++) {
		if (ids[i].ordering !== i + 1) {
			await tx.task.update({ where: { id: ids[i].id }, data: { ordering: i + 1 } });
		}
	}
}

const columnOrder = (tx: Tx, status: TaskStatus) =>
	tx.task.findMany({
		where: { status },
		orderBy: [{ ordering: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
		select: { id: true, ordering: true }
	});

async function renumberColumn(tx: Tx, status: TaskStatus) {
	await applyOrder(tx, await columnOrder(tx, status));
}

// ---------------------------------------------------------------- baca

export async function listBoard(db: PrismaClient, now: Date = new Date()): Promise<{ tasks: BoardTask[]; summary: BoardSummary }> {
	const rows = await db.task.findMany({
		include: { createdBy: { select: { name: true } }, _count: { select: { attachments: true } } }
	});

	const tasks: BoardTask[] = [];
	for (const status of statuses) {
		const inColumn = rows
			.filter((r) => statusToApp[r.status] === status)
			.sort(
				hasOrdering(status)
					? (a, b) => a.ordering - b.ordering || a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id)
					: (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime() || a.id.localeCompare(b.id)
			);
		inColumn.forEach((r, i) =>
			tasks.push({
				id: r.id,
				title: r.title,
				type: r.type,
				status,
				createdBy: r.createdBy.name,
				createdAt: formatJakarta(r.createdAt),
				ageDays: Math.max(0, Math.floor((now.getTime() - r.createdAt.getTime()) / DAY_MS)),
				position: hasOrdering(status) ? i + 1 : null,
				attachments: r._count.attachments
			})
		);
	}

	const weekAgo = now.getTime() - 7 * DAY_MS;
	const summary: BoardSummary = {
		total: rows.length,
		queue: rows.filter((r) => r.status === 'queue').length,
		doneLast7Days: rows.filter((r) => r.status === 'done' && r.updatedAt.getTime() >= weekAgo).length
	};
	return { tasks, summary };
}

export async function getTaskDetail(db: PrismaClient, id: string): Promise<TaskDetail | null> {
	if (!UUID_PATTERN.test(id)) return null;
	const t = await db.task.findUnique({
		where: { id },
		include: {
			createdBy: { select: { name: true } },
			attachments: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
			history: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], include: { createdBy: { select: { name: true } } } }
		}
	});
	if (!t) return null;
	return {
		id: t.id,
		title: t.title,
		description: t.description,
		type: t.type,
		status: statusToApp[t.status],
		createdBy: t.createdBy.name,
		createdAt: formatJakarta(t.createdAt),
		attachments: t.attachments.map((a) => ({ id: a.id, name: a.fileName, mime: a.mimeType, size: a.size })),
		history: t.history.map((h) => ({
			id: h.id,
			from: h.statusBefore ? statusToApp[h.statusBefore] : null,
			to: statusToApp[h.statusAfter],
			by: h.createdBy.name,
			at: formatJakarta(h.createdAt),
			note: h.note
		}))
	};
}

export async function findAttachment(db: PrismaClient, id: string) {
	if (!UUID_PATTERN.test(id)) return null;
	return db.taskAttachment.findUnique({ where: { id }, select: { fileName: true, filePath: true, mimeType: true } });
}

// ---------------------------------------------------------------- tulis

export type NewTask = {
	id: string;
	title: string;
	description: string;
	type: TaskType;
	userId: string;
	attachments: StoredFile[];
};

/** Task + baris history pertama + lampiran dalam 1 transaksi. Masuk kolom request, paling belakang. */
export async function createTask(db: PrismaClient, input: NewTask): Promise<void> {
	const now = Date.now();
	await db.$transaction(async (tx) => {
		await lockOrdering(tx);
		const last = await tx.task.aggregate({ where: { status: 'request' }, _max: { ordering: true } });
		await tx.task.create({
			data: {
				id: input.id,
				title: input.title,
				description: input.description,
				type: input.type,
				status: 'request',
				ordering: (last._max.ordering ?? 0) + 1,
				createdById: input.userId,
				history: { create: { statusBefore: null, statusAfter: 'request', createdById: input.userId } },
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
}

export type ActionResult = RuleResult;

/**
 * Pindah status: aturan dicek di sini (bukan di UI), lalu status, ordering dan 1 baris history
 * ditulis dalam 1 transaksi. Kolom yang ditinggalkan dirapihin lagi jadi 1..n.
 */
export async function transitionTask(
	db: PrismaClient,
	input: { id: string; to: string; note: string; user: SessionUser }
): Promise<ActionResult> {
	const note = input.note.trim();
	if (input.user.role === 'marketing') {
		return { ok: false, status: 403, error: 'Role marketing tidak bisa mengubah status' };
	}
	if (!UUID_PATTERN.test(input.id)) return { ok: false, status: 404, error: 'Task tidak ditemukan' };
	if (!statuses.includes(input.to as Status)) return { ok: false, status: 400, error: 'Status tidak valid' };
	const to = input.to as Status;

	return db.$transaction(async (tx): Promise<ActionResult> => {
		await lockOrdering(tx);
		const row = await tx.task.findUnique({ where: { id: input.id }, select: { status: true } });
		if (!row) return { ok: false, status: 404, error: 'Task tidak ditemukan' };

		const from = statusToApp[row.status];
		const check = checkTransition({ from, to, note, role: input.user.role });
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
				createdById: input.user.id
			}
		});
		if (hasOrdering(from)) await renumberColumn(tx, statusToDb[from]);
		return { ok: true };
	});
}

/** Geser kartu ke posisi `position` (1-based) di kolomnya. Kolom dinomori ulang 1..n dalam 1 transaksi. */
export async function reorderTask(
	db: PrismaClient,
	input: { id: string; position: number; user: SessionUser }
): Promise<ActionResult> {
	if (!UUID_PATTERN.test(input.id)) return { ok: false, status: 404, error: 'Task tidak ditemukan' };
	if (!Number.isInteger(input.position)) return { ok: false, status: 400, error: 'Posisi tidak valid' };

	return db.$transaction(async (tx): Promise<ActionResult> => {
		await lockOrdering(tx);
		const row = await tx.task.findUnique({ where: { id: input.id }, select: { status: true } });
		if (!row) return { ok: false, status: 404, error: 'Task tidak ditemukan' };

		const status = statusToApp[row.status];
		if (!hasOrdering(status)) return { ok: false, status: 400, error: 'Kolom ini gak punya urutan' };
		if (!canReorder(input.user.role, status)) {
			return { ok: false, status: 403, error: 'Role kamu tidak bisa mengubah urutan di kolom ini' };
		}

		const ids = await columnOrder(tx, row.status);
		const from = ids.findIndex((t) => t.id === input.id);
		const to = Math.min(Math.max(input.position, 1), ids.length) - 1;
		const [moved] = ids.splice(from, 1);
		ids.splice(to, 0, moved);
		await applyOrder(tx, ids);
		return { ok: true };
	});
}
