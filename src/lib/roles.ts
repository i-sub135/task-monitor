export type Role = 'marketing' | 'developer' | 'qa' | 'admin';
export type SessionUser = { id: string; name: string; role: Role };

export const roles: Role[] = ['marketing', 'developer', 'qa', 'admin'];

/** Majuin status / reject: semua kecuali marketing (brainstorming.md bagian 3; TM-14 nambah QA). Aturan per transisi di checkTransition. */
export const canAdvance = (role: Role): boolean => role !== 'marketing';
