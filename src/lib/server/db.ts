import { env } from '$env/dynamic/private';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';

// Satu client per proses, disimpan di globalThis biar HMR di dev gak bikin koneksi baru tiap reload.
const globalForDb = globalThis as unknown as { __taskMonitorDb?: PrismaClient };

/** Dibuat lazy: `vite build` ngimpor modul server tanpa DATABASE_URL, jadi jangan konek di top level. */
export function getDb(): PrismaClient {
	if (globalForDb.__taskMonitorDb) return globalForDb.__taskMonitorDb;

	const connectionString = env.DATABASE_URL;
	if (!connectionString) {
		throw new Error('DATABASE_URL belum diisi. Salin .env.example jadi .env lalu isi.');
	}

	const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
	globalForDb.__taskMonitorDb = db;
	return db;
}
