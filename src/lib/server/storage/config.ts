import type { S3Config } from './s3.ts';

export type StorageConfig = { driver: 'local' } | { driver: 's3'; s3: S3Config };

const TRUE = new Set(['1', 'true', 'yes', 'on']);

/**
 * Baca setelan storage dari env (dikasih dari luar biar gampang dites). Salah isi = lempar error yang
 * nyebut env mana yang bermasalah, supaya app gagal nyala dengan pesan jelas, bukan gagal pas upload pertama.
 */
export function parseStorageConfig(env: Record<string, string | undefined>): StorageConfig {
	const get = (name: string) => env[name]?.trim() ?? '';

	const driver = (get('STORAGE_DRIVER') || 'local').toLowerCase();
	if (driver === 'local') return { driver: 'local' };
	if (driver !== 's3') throw new Error(`STORAGE_DRIVER tidak valid: '${driver}'. Pilihan: local, s3`);

	const missing = ['S3_REGION', 'S3_BUCKET', 'S3_ACCESS_KEY', 'S3_SECRET_KEY'].filter((name) => !get(name));
	if (missing.length > 0) {
		throw new Error(`STORAGE_DRIVER=s3 tapi env berikut belum diisi: ${missing.join(', ')}`);
	}

	const region = get('S3_REGION');
	const endpoint = get('S3_ENDPOINT') || `https://s3.${region}.wasabisys.com`;
	try {
		new URL(endpoint);
	} catch {
		throw new Error(`S3_ENDPOINT tidak valid: '${endpoint}'. Contoh: https://s3.ap-southeast-1.wasabisys.com`);
	}

	const checksum = (get('S3_CHECKSUM') || 'default').toLowerCase();
	if (checksum !== 'default' && checksum !== 'when_required') {
		throw new Error(`S3_CHECKSUM tidak valid: '${checksum}'. Pilihan: default, when_required`);
	}

	return {
		driver: 's3',
		s3: {
			region,
			bucket: get('S3_BUCKET'),
			accessKeyId: get('S3_ACCESS_KEY'),
			secretAccessKey: get('S3_SECRET_KEY'),
			endpoint,
			forcePathStyle: TRUE.has(get('S3_FORCE_PATH_STYLE').toLowerCase()),
			checksum
		}
	};
}
