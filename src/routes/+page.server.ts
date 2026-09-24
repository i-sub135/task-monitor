import { tasks } from '$lib/mock/tasks';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ tasks });
