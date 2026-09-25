import { env } from '$env/dynamic/private';
import { parseStorageConfig } from './config.ts';
import { createLocalStorage } from './local.ts';
import { createS3Storage } from './s3.ts';
import type { StorageDriver } from './types.ts';

let storage: StorageDriver | undefined;

/**
 * Driver aktif, dibikin sekali dari env. Bikin client S3 gak nyentuh jaringan, jadi ini aman dipanggil pas
 * startup buat fail-fast kalau env salah. Kredensial yang keliru baru ketahuan pas upload pertama.
 */
export function getStorage(): StorageDriver {
	if (!storage) {
		const config = parseStorageConfig(env);
		storage = config.driver === 's3' ? createS3Storage(config.s3) : createLocalStorage();
	}
	return storage;
}

/** Info driver buat log startup. Nol rahasia di sini. */
export function describeStorage(): Record<string, string> {
	const config = parseStorageConfig(env);
	return config.driver === 's3'
		? { driver: 's3', bucket: config.s3.bucket, region: config.s3.region, endpoint: config.s3.endpoint, checksum: config.s3.checksum }
		: { driver: 'local' };
}
