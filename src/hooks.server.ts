import { redirect, type Handle } from '@sveltejs/kit';
import { SESSION_COOKIE, endSession, readSession } from '$lib/server/auth';
import { guardRedirect } from '$lib/server/guard';
import { logEvent } from '$lib/server/logger';

export const handle: Handle = async ({ event, resolve }) => {
	const start = performance.now();

	event.locals.user = readSession(event.cookies);
	// Cookie ada tapi gak sah (diubah, kedaluwarsa, user nonaktif): buang biar gak dikirim terus.
	if (!event.locals.user && event.cookies.get(SESSION_COOKIE)) endSession(event.cookies);

	const target = guardRedirect(event.url.pathname, event.locals.user !== null);
	if (target) {
		logEvent('auth.guard.redirect', { path: event.url.pathname, to: target });
		redirect(303, target);
	}

	const response = await resolve(event);

	logEvent('http.request', {
		method: event.request.method,
		path: event.url.pathname,
		status: response.status,
		userId: event.locals.user?.id ?? null,
		durationMs: Math.round(performance.now() - start)
	});

	return response;
};
