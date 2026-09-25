/** Yang dibutuhin dari PrismaClient buat ping. Dibikin sempit biar gampang dites tanpa DB beneran. */
export type Pingable = { $queryRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown> };

export type PingResult = { ok: true } | { ok: false; reason: string };

export const PING_TIMEOUT_MS = 2000;

/**
 * `SELECT 1` dengan batas waktu. DB mati bisa berarti gagal cepat (host gak ketemu, koneksi ditolak) atau
 * menggantung, makanya ada timeout: halaman gak boleh ikut nunggu selamanya.
 */
export async function pingDb(db: Pingable, timeoutMs: number = PING_TIMEOUT_MS): Promise<PingResult> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		const query = Promise.resolve(db.$queryRaw`SELECT 1`);
		query.catch(() => undefined); // kalah balapan lawan timeout: jangan jadi unhandled rejection
		const timeout = new Promise<never>((_, reject) => {
			timer = setTimeout(() => reject(new Error(`DB gak jawab dalam ${timeoutMs} ms`)), timeoutMs);
		});
		await Promise.race([query, timeout]);
		return { ok: true };
	} catch (e) {
		return { ok: false, reason: e instanceof Error ? e.message : String(e) };
	} finally {
		clearTimeout(timer);
	}
}

/**
 * Jalanin `fn` dengan batas waktu. Gagal karena timeout = DB dianggap mati (gak perlu ping lagi, DB yang
 * menggantung bakal nahan ping juga). Gagal karena error: ping DB. DB gak bisa dihubungi -> `{ ok: false }`
 * (ditampilin sebagai "layanan tidak tersedia"). DB sehat -> errornya bug beneran, dilempar lagi.
 */
export async function guardDb<T>(
	db: Pingable,
	fn: () => Promise<T>,
	timeoutMs: number = PING_TIMEOUT_MS
): Promise<{ ok: true; value: T } | { ok: false; reason: string }> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const TIMED_OUT = Symbol('timeout');
	try {
		const work = fn();
		work.catch(() => undefined); // kalah balapan lawan timeout: jangan jadi unhandled rejection
		const timeout = new Promise<typeof TIMED_OUT>((resolve) => {
			timer = setTimeout(() => resolve(TIMED_OUT), timeoutMs);
		});
		const result = await Promise.race([work, timeout]);
		if (result === TIMED_OUT) return { ok: false, reason: `DB gak jawab dalam ${timeoutMs} ms` };
		return { ok: true, value: result };
	} catch (e) {
		const ping = await pingDb(db, timeoutMs);
		if (ping.ok) throw e;
		return { ok: false, reason: ping.reason };
	} finally {
		clearTimeout(timer);
	}
}
