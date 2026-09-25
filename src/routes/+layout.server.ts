import { env } from '$env/dynamic/private';
import pkg from '../../package.json';
import type { LayoutServerLoad } from './$types';

// Versi yang tampil di header: APP_VERSION dari env kalau diisi (saat deploy), kalau nggak versi di package.json.
const version = (): string => env.APP_VERSION?.trim() || pkg.version;

// Versi cuma dikirim ke yang sudah login, jadi tamu di halaman masuk gak dapat info versi app.
export const load: LayoutServerLoad = ({ locals }) => ({
	user: locals.user,
	version: locals.user ? version() : null
});
