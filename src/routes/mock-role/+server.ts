import { redirect } from '@sveltejs/kit';
import { ROLE_COOKIE, roles, type Role } from '$lib/mock/session';
import type { RequestHandler } from './$types';

// Mock: ganti role buat ngetes hak akses. Dibuang pas login beneran (TM-3).
export const POST: RequestHandler = async ({ request, cookies }) => {
	const form = await request.formData();
	const role = String(form.get('role') ?? '');
	if (!roles.includes(role as Role)) return new Response('Role tidak valid', { status: 400 });

	cookies.set(ROLE_COOKIE, role, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 7
	});

	// Cuma path internal, cegah open redirect.
	const to = String(form.get('redirectTo') ?? '/');
	redirect(303, to.startsWith('/') && !to.startsWith('//') ? to : '/');
};
