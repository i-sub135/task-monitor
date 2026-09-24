export type Role = 'marketing' | 'developer' | 'admin';
export type SessionUser = { id: string; name: string; role: Role };

export const roles: Role[] = ['marketing', 'developer', 'admin'];

/** Majuin status / reject cuma boleh developer dan admin (brainstorming.md bagian 3). */
export const canAdvance = (role: Role): boolean => role !== 'marketing';
