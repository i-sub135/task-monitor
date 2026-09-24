// Mock data, diganti query Prisma di TM-2+.
export type Status = 'request' | 'queue' | 'in-progress' | 'done' | 'rejected';
export type TaskType = 'bug' | 'feature';

export type MockHistory = {
	from: Status | null;
	to: Status;
	by: string;
	at: string;
	note?: string;
};

export type MockTask = {
	id: string;
	title: string;
	description: string;
	type: TaskType;
	status: Status;
	createdBy: string;
	createdAt: string;
	attachments: string[];
	history: MockHistory[];
};

export const statusLabels: Record<Status, string> = {
	request: 'Request',
	queue: 'Queue',
	'in-progress': 'In progress',
	done: 'Done',
	rejected: 'Rejected'
};

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
		attachments: ['checkout-kosong.png', 'console-error.png'],
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
		attachments: ['contoh-format.pdf'],
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
		attachments: ['desain-v2.png', 'copy.pdf', 'aset-logo.png', 'referensi.png'],
		history: [
			{ from: null, to: 'request', by: 'Dimas', at: '2026-09-22 13:00' },
			{ from: 'request', to: 'queue', by: 'Budi', at: '2026-09-22 15:10' },
			{ from: 'queue', to: 'in-progress', by: 'Budi', at: '2026-09-24 08:30' }
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
		attachments: ['footer.png'],
		history: [
			{ from: null, to: 'request', by: 'Rina', at: '2026-09-20 11:15' },
			{ from: 'request', to: 'queue', by: 'Budi', at: '2026-09-20 11:40' },
			{ from: 'queue', to: 'in-progress', by: 'Budi', at: '2026-09-21 09:00' },
			{
				from: 'in-progress',
				to: 'done',
				by: 'Budi',
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
