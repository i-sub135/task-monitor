// Dipakai bareng oleh kode app (server dan browser) dan scripts/start.mjs, makanya JS biasa, bukan TS.

/** Jumlah lampiran maksimal per task. */
export const MAX_FILES = 5;

/** Batas ukuran per file kalau UPLOAD_SIZE_LIMIT gak diisi. */
export const DEFAULT_UPLOAD_SIZE_LIMIT = '5M';

/**
 * Ubah "5M", "512K", "1G" (atau angka byte polos) jadi byte. NaN kalau formatnya salah.
 * @param {string | number} value
 * @returns {number}
 */
export function parseSize(value) {
	const match = /^\s*(\d+(?:\.\d+)?)\s*([kmg]?)b?\s*$/i.exec(String(value));
	if (!match) return NaN;
	/** @type {Record<string, number>} */
	const unit = { '': 1, k: 1024, m: 1024 ** 2, g: 1024 ** 3 };
	return Math.floor(Number(match[1]) * unit[match[2].toLowerCase()]);
}

/**
 * "5 MB", "512 KB", dst, buat ditampilin ke user.
 * @param {number} bytes
 * @returns {string}
 */
export function formatSize(bytes) {
	if (bytes >= 1024 ** 2) {
		const mb = bytes / 1024 ** 2;
		return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
	}
	return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Batas isi request buat adapter-node: semua lampiran + 1 MB buat field form dan overhead multipart.
 * @param {number} perFileBytes
 * @returns {number}
 */
export function bodyLimitBytes(perFileBytes) {
	return perFileBytes * MAX_FILES + 1024 ** 2;
}
