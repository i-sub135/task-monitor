import type { Handle } from '@sveltejs/kit';
import { logEvent } from '$lib/server/logger';

// Request logging only. Auth guard (GUEST_ONLY_ROUTES / PUBLIC_ROUTES) lands in TM-3.
export const handle: Handle = async ({ event, resolve }) => {
	const start = performance.now();
	const response = await resolve(event);

	logEvent('http.request', {
		method: event.request.method,
		path: event.url.pathname,
		status: response.status,
		durationMs: Math.round(performance.now() - start)
	});

	return response;
};
