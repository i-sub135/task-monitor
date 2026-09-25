import type { PrismaClient } from './generated/prisma/client.ts';
import { countUsers, createUser, validateNewUser } from './users.ts';

export type SeedLog = {
	info: (event: string, meta?: Record<string, unknown>) => void;
	error: (event: string, meta?: Record<string, unknown>) => void;
};

export type SeedResult = 'seeded' | 'skipped' | 'invalid_env';

/**
 * User pertama: kalau tabel users kosong, bikin 1 admin dari env. Idempotent: begitu ada user,
 * gak ngapa-ngapain. Env kosong atau salah dan tabel kosong dilaporin keras, gak diem.
 */
export async function seedAdminIfEmpty(
	db: PrismaClient,
	config: { email?: string; name?: string },
	log: SeedLog
): Promise<SeedResult> {
	if ((await countUsers(db)) > 0) return 'skipped';

	const email = config.email?.trim().toLowerCase() ?? '';
	const name = config.name?.trim() ?? '';
	if (!email || !name) {
		log.error('seed.admin.missing_env', {
			note: 'The users table is empty but SEED_ADMIN_EMAIL / SEED_ADMIN_NAME are not set. Nobody can log in yet.'
		});
		return 'invalid_env';
	}

	const errors = validateNewUser({ name, email, role: 'admin' });
	if (errors.name || errors.email) {
		log.error('seed.admin.invalid_env', { errors });
		return 'invalid_env';
	}

	const result = await createUser(db, { name, email, role: 'admin' });
	if (!result.ok) {
		// Dua instance start bareng: yang kalah balapan kena unique email, itu bukan error.
		if (result.errors.email === 'Email is already registered') return 'skipped';
		log.error('seed.admin.failed', { errors: result.errors });
		return 'invalid_env';
	}

	log.info('seed.admin.created', { userId: result.user.id });
	return 'seeded';
}
