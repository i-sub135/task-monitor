import { redirect } from '@sveltejs/kit';
import { endSession } from '$lib/server/auth';
import { logEvent } from '$lib/server/logger';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ cookies, locals }) => {
	logEvent('auth.logout', { userId: locals.user?.id ?? null });
	endSession(cookies);
	redirect(303, '/');
};
