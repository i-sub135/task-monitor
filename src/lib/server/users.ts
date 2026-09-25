import { formatJakarta } from '../time.ts';
import { roles, type Role } from '../roles.ts';
import { Prisma, type PrismaClient } from './generated/prisma/client.ts';
import type { UserRole, UserStatus } from './generated/prisma/enums.ts';

// Di DB status = 'non-active' (@map), di client Prisma jadi non_active. Di app tetap 'non-active'.
export type AppUserStatus = 'active' | 'non-active';

export type AppUser = {
	id: string;
	name: string;
	email: string;
	role: Role;
	status: AppUserStatus;
	createdAt: string;
	updatedAt: string;
};

type UserRow = {
	id: string;
	name: string;
	email: string;
	role: UserRole;
	status: UserStatus;
	createdAt: Date;
	updatedAt: Date;
};

const statusToApp: Record<UserStatus, AppUserStatus> = { active: 'active', non_active: 'non-active' };
const statusToDb: Record<AppUserStatus, UserStatus> = { active: 'active', 'non-active': 'non_active' };

const toApp = (u: UserRow): AppUser => ({
	id: u.id,
	name: u.name,
	email: u.email,
	role: u.role,
	status: statusToApp[u.status],
	createdAt: formatJakarta(u.createdAt),
	updatedAt: formatJakarta(u.updatedAt)
});

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function countUsers(db: PrismaClient): Promise<number> {
	return db.user.count();
}

export async function listUsers(db: PrismaClient): Promise<AppUser[]> {
	const rows = await db.user.findMany({ orderBy: { createdAt: 'asc' } });
	return rows.map(toApp);
}

export async function findUserById(db: PrismaClient, id: string): Promise<AppUser | null> {
	// Kolom uuid: string non-uuid bikin Postgres error, bukan "gak ketemu".
	if (!UUID_PATTERN.test(id)) return null;
	const row = await db.user.findUnique({ where: { id } });
	return row ? toApp(row) : null;
}

export async function findUserByEmail(db: PrismaClient, email: string): Promise<AppUser | null> {
	const row = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
	return row ? toApp(row) : null;
}

export type NewUserInput = { name: string; email: string; role: string };

/** Validasi bentuk input. Keunikan email dicek DB (unique index), bukan di sini. */
export function validateNewUser({ name, email, role }: NewUserInput): Record<string, string> {
	const errors: Record<string, string> = {};
	if (!name) errors.name = 'Name is required';
	else if (name.length > 100) errors.name = 'Name must be at most 100 characters';

	if (!email) errors.email = 'Email is required';
	else if (email.length > 254 || !EMAIL_PATTERN.test(email)) errors.email = 'Invalid email format';

	if (!roles.includes(role as Role)) errors.role = 'Choose a role';
	return errors;
}

export type CreateResult = { ok: true; user: AppUser } | { ok: false; errors: Record<string, string> };

export async function createUser(db: PrismaClient, input: NewUserInput): Promise<CreateResult> {
	const errors = validateNewUser(input);
	if (Object.keys(errors).length > 0) return { ok: false, errors };

	try {
		const row = await db.user.create({
			data: { name: input.name, email: input.email.toLowerCase(), role: input.role as UserRole }
		});
		return { ok: true, user: toApp(row) };
	} catch (e) {
		if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
			return { ok: false, errors: { email: 'Email is already registered' } };
		}
		throw e;
	}
}

export type UpdateResult = { ok: true; user: AppUser } | { ok: false; status: number; error: string };

async function update(db: PrismaClient, id: string, data: { status?: UserStatus; role?: UserRole }): Promise<UpdateResult> {
	if (!UUID_PATTERN.test(id)) return { ok: false, status: 404, error: 'User not found' };
	try {
		const row = await db.user.update({ where: { id }, data });
		return { ok: true, user: toApp(row) };
	} catch (e) {
		if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
			return { ok: false, status: 404, error: 'User not found' };
		}
		throw e;
	}
}

export function setUserStatus(
	db: PrismaClient,
	id: string,
	status: string,
	actorId: string
): Promise<UpdateResult> | UpdateResult {
	if (status !== 'active' && status !== 'non-active') return { ok: false, status: 400, error: 'Invalid status' };
	// Biar gak ada yang ngunci dirinya sendiri (dan semua admin) di luar aplikasi.
	if (status === 'non-active' && id === actorId) {
		return { ok: false, status: 400, error: 'You cannot deactivate your own account' };
	}
	return update(db, id, { status: statusToDb[status] });
}

export function setUserRole(db: PrismaClient, id: string, role: string): Promise<UpdateResult> | UpdateResult {
	if (!roles.includes(role as Role)) return { ok: false, status: 400, error: 'Invalid role' };
	return update(db, id, { role: role as UserRole });
}
