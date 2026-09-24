import { env } from '$env/dynamic/private';
import { DEFAULT_UPLOAD_SIZE_LIMIT, parseSize } from '../upload-limits.js';

/** Ukuran maksimal per file lampiran, dalam byte. Dari UPLOAD_SIZE_LIMIT ("5M", "512K", ...). */
export function getUploadLimitBytes(): number {
	const raw = env.UPLOAD_SIZE_LIMIT || DEFAULT_UPLOAD_SIZE_LIMIT;
	const bytes = parseSize(raw);
	if (!Number.isFinite(bytes) || bytes <= 0) {
		throw new Error(`UPLOAD_SIZE_LIMIT tidak valid: '${raw}'. Contoh yang benar: 5M, 512K, 10M`);
	}
	return bytes;
}
