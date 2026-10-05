import { fail } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { requireRole } from '$lib/server/auth';
import { MAX_API_TOKENS, TOKEN_NAME_MAX, createApiToken, listApiTokens, revokeApiToken } from '$lib/server/api-tokens';
import { listTokenActivity } from '$lib/server/tasks';
import type { Actions, PageServerLoad } from './$types';

// TM-17: token API milik user yang lagi login. Developer ke atas (developer, QA, admin); marketing gak.
const API_ROLES = ['developer', 'qa', 'admin'] as const;

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireRole(locals, ...API_ROLES);
	// TM-18: `?via=<nama token>` nyaring aktivitas ke satu token. Kosong = semua token.
	const via = url.searchParams.get('via') || '';
	const [tokens, activity] = await Promise.all([
		listApiTokens(getDb(), user.id),
		listTokenActivity(getDb(), { userId: user.id, via: via || undefined })
	]);
	return { tokens, activity: activity.items, activityNames: activity.names, via, max: MAX_API_TOKENS, nameMax: TOKEN_NAME_MAX };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const user = requireRole(locals, ...API_ROLES);
		const name = String((await request.formData()).get('name') ?? '');
		const result = await createApiToken(getDb(), { user, name });
		if (!result.ok) return fail(result.status, { error: result.error, name });
		// Satu-satunya kesempatan token asli keliatan: cuma di response action ini, gak pernah di load.
		return { created: { name: name.trim(), token: result.token } };
	},

	revoke: async ({ request, locals }) => {
		const user = requireRole(locals, ...API_ROLES);
		const id = String((await request.formData()).get('id') ?? '');
		if (!(await revokeApiToken(getDb(), { userId: user.id, id }))) return fail(404, { error: 'Token not found' });
		return { revoked: true };
	}
};
