// Mock data, diganti query Prisma di TM-2+. Bentuk ngikut tabel users di brainstorming.md bagian 1.
import { roles, type Role } from './session';
import { nowJakarta } from './time';

export type UserStatus = 'active' | 'non-active';

export type ManagedUser = {
	id: string;
	name: string;
	email: string;
	role: Role;
	status: UserStatus;
	createdAt: string;
	updatedAt: string;
};

export const users: ManagedUser[] = [
	{ id: 'u1', name: 'Ayu', email: 'ayu@kantor.test', role: 'admin', status: 'active', createdAt: '2026-09-01 09:00', updatedAt: '2026-09-01 09:00' },
	{ id: 'u2', name: 'Budi', email: 'budi@kantor.test', role: 'developer', status: 'active', createdAt: '2026-09-01 09:10', updatedAt: '2026-09-01 09:10' },
	{ id: 'u3', name: 'Tono', email: 'tono@kantor.test', role: 'developer', status: 'non-active', createdAt: '2026-09-01 09:12', updatedAt: '2026-09-15 16:00' },
	{ id: 'u4', name: 'Sari', email: 'sari@kantor.test', role: 'marketing', status: 'active', createdAt: '2026-09-02 10:00', updatedAt: '2026-09-02 10:00' },
	{ id: 'u5', name: 'Dimas', email: 'dimas@kantor.test', role: 'marketing', status: 'active', createdAt: '2026-09-02 10:05', updatedAt: '2026-09-02 10:05' },
	{ id: 'u6', name: 'Rina', email: 'rina@kantor.test', role: 'marketing', status: 'active', createdAt: '2026-09-03 11:30', updatedAt: '2026-09-03 11:30' }
];

export const findUserById = (id: string): ManagedUser | undefined => users.find((u) => u.id === id);

export const findUserByEmail = (email: string): ManagedUser | undefined =>
	users.find((u) => u.email === email.trim().toLowerCase());

export type NewUserInput = { name: string; email: string; role: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Balikin map field -> pesan error. Kosong berarti valid. */
export function validateNewUser({ name, email, role }: NewUserInput): Record<string, string> {
	const errors: Record<string, string> = {};
	if (!name) errors.name = 'Nama wajib diisi';
	else if (name.length > 100) errors.name = 'Nama maksimal 100 karakter';

	if (!email) errors.email = 'Email wajib diisi';
	else if (email.length > 254 || !EMAIL_PATTERN.test(email)) errors.email = 'Format email tidak valid';
	else if (users.some((u) => u.email === email.toLowerCase())) errors.email = 'Email sudah terdaftar';

	if (!roles.includes(role as Role)) errors.role = 'Pilih role';
	return errors;
}

export function addUser({ name, email, role }: NewUserInput): ManagedUser {
	const at = nowJakarta();
	const user: ManagedUser = {
		id: crypto.randomUUID(),
		name,
		email: email.toLowerCase(),
		role: role as Role,
		status: 'active',
		createdAt: at,
		updatedAt: at
	};
	users.push(user);
	return user;
}

export type UpdateResult = { ok: true; user: ManagedUser } | { ok: false; status: number; error: string };

export function setUserStatus(id: string, status: string): UpdateResult {
	const user = users.find((u) => u.id === id);
	if (!user) return { ok: false, status: 404, error: 'User tidak ditemukan' };
	if (status !== 'active' && status !== 'non-active') {
		return { ok: false, status: 400, error: 'Status tidak valid' };
	}
	user.status = status;
	user.updatedAt = nowJakarta();
	return { ok: true, user };
}

export function setUserRole(id: string, role: string): UpdateResult {
	const user = users.find((u) => u.id === id);
	if (!user) return { ok: false, status: 404, error: 'User tidak ditemukan' };
	if (!roles.includes(role as Role)) return { ok: false, status: 400, error: 'Role tidak valid' };
	user.role = role as Role;
	user.updatedAt = nowJakarta();
	return { ok: true, user };
}
