import { platforms, taskTypes, type BoardTask, type Platform, type TaskType } from '$lib/utils/tasks';

/**
 * TM-16: filter /board dan /board/list/[status]. Satu nilai per filter (dropdown), disimpen di query URL
 * (`?type=bug&platform=mobile&by=<user id>&q=checkout`) biar bisa di-refresh, di-bookmark, dibagi linknya.
 * Nilai yang gak dikenal di URL dianggap gak ada (bukan error).
 */
export type BoardFilter = {
	type: TaskType | null;
	platform: Platform | null;
	/** id user pembuat task */
	by: string | null;
	/** cari di judul, gak peduli huruf besar/kecil. Disimpen apa adanya (gak di-trim) biar spasi yang lagi
	 * diketik gak dihapus pas URL ke-update; trim-nya pas dipakai. */
	q: string;
};

export const parseBoardFilter = (params: URLSearchParams): BoardFilter => {
	const type = params.get('type');
	const platform = params.get('platform');
	return {
		type: taskTypes.includes(type as TaskType) ? (type as TaskType) : null,
		platform: platforms.includes(platform as Platform) ? (platform as Platform) : null,
		by: params.get('by') || null,
		q: params.get('q') ?? ''
	};
};

export const isFilterActive = (f: BoardFilter): boolean => Boolean(f.type || f.platform || f.by || f.q.trim());

export const applyBoardFilter = (tasks: BoardTask[], f: BoardFilter): BoardTask[] => {
	if (!isFilterActive(f)) return tasks;
	const q = f.q.trim().toLowerCase();
	return tasks.filter(
		(t) =>
			(!f.type || t.type === f.type) &&
			(!f.platform || t.platform === f.platform) &&
			(!f.by || t.createdById === f.by) &&
			(!q || t.title.toLowerCase().includes(q))
	);
};

/** Query string filter (diawali `?`, atau kosong) buat dibawa ke link board ↔ list. */
export const filterQuery = (f: BoardFilter): string => {
	const params = new URLSearchParams();
	if (f.type) params.set('type', f.type);
	if (f.platform) params.set('platform', f.platform);
	if (f.by) params.set('by', f.by);
	if (f.q.trim()) params.set('q', f.q);
	const s = params.toString();
	return s ? `?${s}` : '';
};

/** Pilihan dropdown "Created by": pembuat yang punya task di daftar ini, urut nama. */
export const creatorOptions = (tasks: BoardTask[]): { id: string; name: string }[] => {
	const byId = new Map<string, string>();
	for (const t of tasks) byId.set(t.createdById, t.createdBy);
	return [...byId].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
};
