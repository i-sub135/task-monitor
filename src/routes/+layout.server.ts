import { getMockUser } from '$lib/server/mock-session';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ cookies }) => ({ user: getMockUser(cookies) });
