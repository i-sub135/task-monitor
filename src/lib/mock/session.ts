// Mock session, diganti session cookie HMAC beneran di TM-3.
export type Role = 'marketing' | 'developer' | 'admin';
export type MockUser = { name: string; role: Role };

export const roles: Role[] = ['marketing', 'developer', 'admin'];
export const DEFAULT_ROLE: Role = 'developer';
export const ROLE_COOKIE = 'mock_role';

export const mockUsers: Record<Role, MockUser> = {
	marketing: { name: 'Sari', role: 'marketing' },
	developer: { name: 'Budi', role: 'developer' },
	admin: { name: 'Ayu', role: 'admin' }
};

/** Majuin status / reject cuma boleh developer dan admin (brainstorming.md bagian 3). */
export const canAdvance = (role: Role): boolean => role !== 'marketing';
