import type { Cookies } from '@sveltejs/kit';
import { DEFAULT_ROLE, ROLE_COOKIE, mockUsers, roles, type MockUser, type Role } from '$lib/mock/session';

export function getMockUser(cookies: Cookies): MockUser {
	const raw = cookies.get(ROLE_COOKIE);
	const role = roles.includes(raw as Role) ? (raw as Role) : DEFAULT_ROLE;
	return mockUsers[role];
}
