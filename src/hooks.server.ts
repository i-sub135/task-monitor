import { redirect, type Handle, type ServerInit } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { SESSION_COOKIE, endSession, readSession } from '$lib/server/auth';
import { getLoginPassword } from '$lib/server/secret';
import { getUploadLimitBytes } from '$lib/server/upload-config';
import { guardRedirect } from '$lib/server/guard';
import { getDb } from '$lib/server/db';
import { logEvent, logger } from '$lib/server/logger';
import { seedAdminIfEmpty } from '$lib/server/seed';

// Jalan sekali pas server nyala. Gagal konek ke DB = server gak jadi nyala, jangan nyala setengah.
export const init: ServerInit = async () => {
	try {
		getLoginPassword();
		getUploadLimitBytes();
		await seedAdminIfEmpty(
			getDb(),
			{ email: env.SEED_ADMIN_EMAIL, name: env.SEED_ADMIN_NAME },
			{ info: (event, meta) => logger.info(event, meta), error: (event, meta) => logger.error(event, meta) }
		);
	} catch (e) {
		logger.error('startup.failed', { error: e instanceof Error ? e.message : String(e) });
		throw e;
	}
};

export const handle: Handle = async ({ event, resolve }) => {
	const start = performance.now();

	event.locals.user = await readSession(event.cookies);
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
