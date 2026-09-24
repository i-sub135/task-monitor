// Mock data, diganti query Prisma di TM-2+.
import { canAdvance, type MockUser } from './session';

export type Status = 'request' | 'queue' | 'in-progress' | 'ready-to-test' | 'done' | 'rejected';
export type TaskType = 'bug' | 'feature';

export type MockHistory = {
	from: Status | null;
	to: Status;
	by: string;
	at: string;
	note?: string;
};

export type MockAttachment = {
	name: string;
	mime: string;
	/** Public URL of the file. Mock thumbnails live in static/mock; real ones come from storage later. */
	url?: string;
};

export type MockTask = {
	id: string;
	title: string;
	description: string;
	type: TaskType;
	status: Status;
	createdBy: string;
	createdAt: string;
	attachments: MockAttachment[];
	history: MockHistory[];
};

/** Transisi maju doang (brainstorming.md bagian 3). done dan rejected terminal. */
export const transitions: Record<Status, Status[]> = {
	request: ['queue', 'rejected'],
	queue: ['in-progress'],
	'in-progress': ['ready-to-test'],
	'ready-to-test': ['done'],
	done: [],
	rejected: []
};

export const statusLabels: Record<Status, string> = {
	request: 'Request',
	queue: 'Queue',
	'in-progress': 'In progress',
	'ready-to-test': 'Ready to test',
	done: 'Done',
	rejected: 'Rejected'
};

const img = (name: string, n: number): MockAttachment => ({
	name,
	mime: 'image/png',
	url: `/mock/thumb-${n}.svg`
});
const pdf = (name: string): MockAttachment => ({ name, mime: 'application/pdf' });

export const tasks: MockTask[] = [
	{
		id: 'a1',
		title: 'Banner promo gak muncul di halaman checkout',
		description:
			'Banner promo Oktober harusnya tampil di atas form checkout, tapi kosong di semua browser. Sudah dicoba refresh dan clear cache.',
		type: 'bug',
		status: 'request',
		createdBy: 'Sari',
		createdAt: '2026-09-24 09:12',
		attachments: [img('checkout-kosong.png', 1), img('console-error.png', 2)],
		history: [{ from: null, to: 'request', by: 'Sari', at: '2026-09-24 09:12' }]
	},
	{
		id: 'a2',
		title: 'Tambah filter tanggal di laporan kampanye',
		description: 'Laporan kampanye butuh filter rentang tanggal supaya bisa dibandingkan per minggu.',
		type: 'feature',
		status: 'request',
		createdBy: 'Dimas',
		createdAt: '2026-09-24 09:40',
		attachments: [],
		history: [{ from: null, to: 'request', by: 'Dimas', at: '2026-09-24 09:40' }]
	},
	{
		id: 'b1',
		title: 'Export leads ke CSV',
		description: 'Tim sales minta tombol export leads ke CSV dari halaman daftar leads.',
		type: 'feature',
		status: 'queue',
		createdBy: 'Sari',
		createdAt: '2026-09-23 14:05',
		attachments: [pdf('contoh-format.pdf')],
		history: [
			{ from: null, to: 'request', by: 'Sari', at: '2026-09-23 14:05' },
			{ from: 'request', to: 'queue', by: 'Budi', at: '2026-09-23 16:30' }
		]
	},
	{
		id: 'b2',
		title: 'Link unsubscribe di email salah domain',
		description: 'Link unsubscribe di email newsletter mengarah ke domain staging.',
		type: 'bug',
		status: 'queue',
		createdBy: 'Rina',
		createdAt: '2026-09-23 10:20',
		attachments: [],
		history: [
			{ from: null, to: 'request', by: 'Rina', at: '2026-09-23 10:20' },
			{ from: 'request', to: 'queue', by: 'Budi', at: '2026-09-23 11:00' }
		]
	},
	{
		id: 'c1',
		title: 'Landing page campaign Oktober',
		description: 'Landing page baru untuk campaign Oktober, desain dan copy ada di lampiran.',
		type: 'feature',
		status: 'in-progress',
		createdBy: 'Dimas',
		createdAt: '2026-09-22 13:00',
		attachments: [img('desain-v2.png', 3), pdf('copy.pdf'), img('aset-logo.png', 4), img('referensi.png', 1)],
		history: [
			{ from: null, to: 'request', by: 'Dimas', at: '2026-09-22 13:00' },
			{ from: 'request', to: 'queue', by: 'Budi', at: '2026-09-22 15:10' },
			{ from: 'queue', to: 'in-progress', by: 'Budi', at: '2026-09-24 08:30' }
		]
	},
	{
		id: 'f1',
		title: 'Gambar produk di katalog kepotong di HP',
		description: 'Di layar HP, gambar produk di halaman katalog kepotong di sisi kanan.',
		type: 'bug',
		status: 'ready-to-test',
		createdBy: 'Sari',
		createdAt: '2026-09-22 10:30',
		attachments: [img('katalog-hp.png', 2)],
		history: [
			{ from: null, to: 'request', by: 'Sari', at: '2026-09-22 10:30' },
			{ from: 'request', to: 'queue', by: 'Budi', at: '2026-09-22 11:00' },
			{ from: 'queue', to: 'in-progress', by: 'Budi', at: '2026-09-23 09:00' },
			{ from: 'in-progress', to: 'ready-to-test', by: 'Budi', at: '2026-09-24 10:15' }
		]
	},
	{
		id: 'd1',
		title: 'Fix typo di footer website',
		description: 'Kata "Kebijakan Privasi" tertulis "Kebijakan Privasy" di footer.',
		type: 'bug',
		status: 'done',
		createdBy: 'Rina',
		createdAt: '2026-09-20 11:15',
		attachments: [img('footer.png', 2)],
		history: [
			{ from: null, to: 'request', by: 'Rina', at: '2026-09-20 11:15' },
			{ from: 'request', to: 'queue', by: 'Budi', at: '2026-09-20 11:40' },
			{ from: 'queue', to: 'in-progress', by: 'Budi', at: '2026-09-21 09:00' },
			{ from: 'in-progress', to: 'ready-to-test', by: 'Budi', at: '2026-09-21 09:10' },
			{
				from: 'ready-to-test',
				to: 'done',
				by: 'Rina',
				at: '2026-09-21 09:20',
				note: 'Sudah live: https://example.com'
			}
		]
	},
	{
		id: 'e1',
		title: 'Ganti seluruh brand color',
		description: 'Ganti semua warna brand di seluruh website dengan palet baru.',
		type: 'feature',
		status: 'rejected',
		createdBy: 'Sari',
		createdAt: '2026-09-19 16:45',
		attachments: [],
		history: [
			{ from: null, to: 'request', by: 'Sari', at: '2026-09-19 16:45' },
			{
				from: 'request',
				to: 'rejected',
				by: 'Budi',
				at: '2026-09-20 10:00',
				note: 'Skala terlalu besar untuk satu task, pecah per halaman.'
			}
		]
	}
];

export function getTask(id: string): MockTask | undefined {
	return tasks.find((t) => t.id === id);
}

const jakartaTime = new Intl.DateTimeFormat('sv-SE', {
	timeZone: 'Asia/Jakarta',
	dateStyle: 'short',
	timeStyle: 'short'
});

export type NewTaskInput = {
	title: string;
	description: string;
	type: TaskType;
	attachments: MockAttachment[];
};

/** Mock create: hidup di memori server, hilang kalau server restart. Diganti Prisma di TM-2+. */
export function addTask(input: NewTaskInput, user: MockUser): MockTask {
	const at = jakartaTime.format(new Date());
	const task: MockTask = {
		id: crypto.randomUUID(),
		...input,
		status: 'request',
		createdBy: user.name,
		createdAt: at,
		history: [{ from: null, to: 'request', by: user.name, at }]
	};
	tasks.unshift(task);
	return task;
}

export type MoveInput = { id: string; to: string; note: string; user: MockUser };
export type MoveResult =
	| { ok: true; task: MockTask }
	| { ok: false; status: number; error: string };

/** Mock transisi status: 1 baris riwayat per transisi. Diganti service Prisma di TM-2+. */
export function moveTask({ id, to, note, user }: MoveInput): MoveResult {
	const task = getTask(id);
	if (!task) return { ok: false, status: 404, error: 'Task tidak ditemukan' };
	if (!canAdvance(user.role)) {
		return { ok: false, status: 403, error: 'Role marketing tidak bisa mengubah status' };
	}

	const statuses = Object.keys(transitions) as Status[];
	if (!statuses.includes(to as Status)) return { ok: false, status: 400, error: 'Status tidak valid' };
	const target = to as Status;

	if (!transitions[task.status].includes(target)) {
		return {
			ok: false,
			status: 400,
			error: `Tidak bisa pindah dari ${statusLabels[task.status]} ke ${statusLabels[target]}`
		};
	}
	if (target === 'rejected' && !note) {
		return { ok: false, status: 400, error: 'Catatan wajib diisi kalau menolak task' };
	}

	const from = task.status;
	task.status = target;
	task.history.push({
		from,
		to: target,
		by: user.name,
		at: jakartaTime.format(new Date()),
		...(note ? { note } : {})
	});
	// Pindah ke ujung array = ujung kolom tujuan. Ordering beneran nyusul di TM-5.
	tasks.splice(tasks.indexOf(task), 1);
	tasks.push(task);
	return { ok: true, task };
}
