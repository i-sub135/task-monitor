// Jalanin server production: `npm start` (atau `node scripts/start.mjs`).
//
// adapter-node punya batas ukuran request sendiri (BODY_SIZE_LIMIT, default 512K) yang nolak upload
// sebelum sampai ke kode app. Namanya gak jelas dan bukan setelan app, jadi gak dipakai di .env.
// Cukup isi UPLOAD_SIZE_LIMIT (ukuran maksimal PER FILE); batas request diturunin dari situ.
import { DEFAULT_UPLOAD_SIZE_LIMIT, bodyLimitBytes, parseSize } from '../src/lib/upload-limits.js';

const raw = process.env.UPLOAD_SIZE_LIMIT || DEFAULT_UPLOAD_SIZE_LIMIT;
const perFile = parseSize(raw);
if (!Number.isFinite(perFile) || perFile <= 0) {
	console.error(`UPLOAD_SIZE_LIMIT is invalid: '${raw}'. Valid examples: 5M, 512K, 10M`);
	process.exit(1);
}

process.env.BODY_SIZE_LIMIT = String(bodyLimitBytes(perFile));
await import('../build/index.js');
