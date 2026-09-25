import { redirect, type Handle, type ServerInit } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { SESSION_COOKIE, endSession, readSession } from '$lib/server/auth';
import { getLoginPassword } from '$lib/server/secret';
import { describeStorage, getStorage } from '$lib/server/storage';
import { getUploadLimitBytes } from '$lib/server/upload-config';
import { guardRedirect } from '$lib/server/guard';
import { getDb } from '$lib/server/db';
import { guardDb } from '$lib/server/db-health';
import { logEvent, logger } from '$lib/server/logger';
import { seedAdminIfEmpty } from '$lib/server/seed';

// Jalan sekali pas server nyala. Gagal konek ke DB = server gak jadi nyala, jangan nyala setengah.
export const init: ServerInit = async () => {
	try {
		getLoginPassword();
		getUploadLimitBytes();
		getStorage();
		logger.info('storage.ready', describeStorage());
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

	// DB gak bisa dihubungi: anggap belum login (jadinya diarahin ke halaman masuk, yang nampilin modal
	// "layanan tidak tersedia"), tapi cookie dibiarin biar user gak ke-logout cuma gara-gara DB lagi mati.
	const session = await guardDb(getDb(), () => readSession(event.cookies));
	if (!session.ok) logger.error('db.unavailable', { path: event.url.pathname, reason: session.reason });
	event.locals.user = session.ok ? session.value : null;
	event.locals.dbDown = !session.ok;
	// Cookie ada tapi gak sah (diubah, kedaluwarsa, user nonaktif): buang biar gak dikirim terus.
	if (session.ok && !event.locals.user && event.cookies.get(SESSION_COOKIE)) endSession(event.cookies, event.url);

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
