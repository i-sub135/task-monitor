import { createHash, randomBytes } from 'node:crypto';
import { formatJakarta } from '../time.ts';
import { canUseApi, type SessionUser } from '../roles.ts';
import type { PrismaClient } from './generated/prisma/client.ts';

/**
 * TM-17: token API per user. Token = user pemiliknya (role + aturan transisi sama persis kayak di UI).
 * Bentuk: `tm_` + 32 byte acak (base64url). Di DB cuma SHA-256-nya; token asli ditampilin sekali pas dibikin.
 * SHA-256 tanpa salt cukup: token 256-bit acak gak bisa ditebak, dan lookup per request harus cepat.
 */
export const MAX_API_TOKENS = 5;
export const TOKEN_NAME_MAX = 50;
const TOKEN_PREFIX = 'tm_';
const TOKEN_PATTERN = /^tm_[A-Za-z0-9_-]{43}$/;
/** `last_used_at` ditulis paling sering semenit sekali per token, biar tiap request gak nulis ke DB. */
const LAST_USED_RESOLUTION_MS = 60_000;

export type ApiTokenInfo = { id: string; name: string; prefix: string; createdAt: string; lastUsedAt: string | null };
export type TokenResult = { ok: true; token: string } | { ok: false; status: number; error: string };

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function listApiTokens(db: PrismaClient, userId: string): Promise<ApiTokenInfo[]> {
	const rows = await db.apiToken.findMany({ where: { userId }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
	return rows.map((t) => ({
		id: t.id,
		name: t.name,
		prefix: t.prefix,
		createdAt: formatJakarta(t.createdAt),
		lastUsedAt: t.lastUsedAt ? formatJakarta(t.lastUsedAt) : null
	}));
}

/** Bikin token baru. Balikin token asli (satu-satunya kesempatan dia keliatan). */
export async function createApiToken(db: PrismaClient, input: { user: SessionUser; name: string }): Promise<TokenResult> {
	const name = input.name.trim();
	if (!canUseApi(input.user.role)) return { ok: false, status: 403, error: 'Your role cannot use API tokens' };
	if (!name) return { ok: false, status: 400, error: 'Name is required' };
	if (name.length > TOKEN_NAME_MAX) {
		return { ok: false, status: 400, error: `Name must be at most ${TOKEN_NAME_MAX} characters` };
	}

	const token = TOKEN_PREFIX + randomBytes(32).toString('base64url');
	return db.$transaction(async (tx): Promise<TokenResult> => {
		// Kunci per user biar dua generate barengan gak bisa nembus batas 5.
		await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.user.id}))`;
		const existing = await tx.apiToken.findMany({ where: { userId: input.user.id }, select: { name: true } });
		if (existing.length >= MAX_API_TOKENS) {
			return { ok: false, status: 400, error: `You already have ${MAX_API_TOKENS} tokens. Revoke one first.` };
		}
		if (existing.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
			return { ok: false, status: 400, error: 'You already have a token with this name' };
		}
		await tx.apiToken.create({
			data: { userId: input.user.id, name, tokenHash: hashToken(token), prefix: token.slice(0, TOKEN_PREFIX.length + 6) }
		});
		return { ok: true, token };
	});
}

/** Revoke = hapus. Cuma token milik user itu sendiri yang bisa kena. */
export async function revokeApiToken(db: PrismaClient, input: { userId: string; id: string }): Promise<boolean> {
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.id)) return false;
	const { count } = await db.apiToken.deleteMany({ where: { id: input.id, userId: input.userId } });
	return count > 0;
}

/**
 * Cek token dari header `Authorization: Bearer <token>`. Sah = token ada, user-nya active, dan role-nya
 * boleh pakai API (marketing gak). Balikin user (role terbaru dari DB) + nama token buat jejak `via`.
 */
export async function authenticateApiToken(
	db: PrismaClient,
	token: string,
	now: Date = new Date()
): Promise<{ user: SessionUser; via: string } | null> {
	if (!TOKEN_PATTERN.test(token)) return null;
	const row = await db.apiToken.findUnique({
		where: { tokenHash: hashToken(token) },
		include: { user: { select: { id: true, name: true, role: true, status: true } } }
	});
	if (!row || row.user.status !== 'active' || !canUseApi(row.user.role)) return null;

	if (!row.lastUsedAt || now.getTime() - row.lastUsedAt.getTime() >= LAST_USED_RESOLUTION_MS) {
		await db.apiToken.update({ where: { id: row.id }, data: { lastUsedAt: now } });
	}
	return { user: { id: row.user.id, name: row.user.name, role: row.user.role }, via: row.name };
}
