// Dipakai bareng oleh kode app (server dan browser) dan scripts/start.mjs. scripts/start.mjs jalan pakai
// `node` polos tanpa build (Node 24 type stripping), jadi file ini cuma boleh pakai anotasi tipe yang bisa
// dibuang begitu aja: gak boleh enum, namespace, parameter property, atau import tanpa ekstensi.

/** Jumlah lampiran maksimal per task. */
export const MAX_FILES = 5;

/** Batas ukuran per file kalau UPLOAD_SIZE_LIMIT gak diisi. */
export const DEFAULT_UPLOAD_SIZE_LIMIT = '5M';

/** Ubah "5M", "512K", "1G" (atau angka byte polos) jadi byte. NaN kalau formatnya salah. */
export const parseSize = (value: string | number): number => {
	const match = /^\s*(\d+(?:\.\d+)?)\s*([kmg]?)b?\s*$/i.exec(String(value));
	if (!match) return NaN;
	const unit: Record<string, number> = { '': 1, k: 1024, m: 1024 ** 2, g: 1024 ** 3 };
	return Math.floor(Number(match[1]) * unit[match[2].toLowerCase()]);
};

/** "5 MB", "512 KB", dst, buat ditampilin ke user. */
export const formatSize = (bytes: number): string => {
	if (bytes >= 1024 ** 2) {
		const mb = bytes / 1024 ** 2;
		return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
	}
	return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

/** Batas isi request buat adapter-node: semua lampiran + 1 MB buat field form dan overhead multipart. */
export const bodyLimitBytes = (perFileBytes: number): number => {
	return perFileBytes * MAX_FILES + 1024 ** 2;
};
