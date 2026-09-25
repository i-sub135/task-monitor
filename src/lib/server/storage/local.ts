import { mkdir, readFile, rm, rmdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ATTACHMENT_PREFIX, isAttachmentKey } from './keys.ts';
import type { StorageDriver } from './types.ts';

const MISSING = new Set(['ENOENT', 'ENOTDIR', 'EISDIR']);

/** Simpan ke disk, key relatif dari `root` (default: root project). Perilaku sama kayak sebelum ada driver. */
export function createLocalStorage(root: string = process.cwd()): StorageDriver {
	const base = path.resolve(root, ATTACHMENT_PREFIX);

	// Dua lapis: cek bentuk key, lalu pastiin path hasil resolve masih di dalam folder lampiran.
	const resolve = (key: string): string | null => {
		if (!isAttachmentKey(key)) return null;
		const target = path.resolve(root, key);
		return target.startsWith(base + path.sep) ? target : null;
	};

	return {
		name: 'local',

		async put(key, bytes) {
			const target = resolve(key);
			if (!target) throw new Error(`Key lampiran tidak valid: ${key}`);
			await mkdir(path.dirname(target), { recursive: true });
			await writeFile(target, bytes, { flag: 'wx' });
		},

		async get(key) {
			const target = resolve(key);
			if (!target) return null;
			try {
				return await readFile(target);
			} catch (e) {
				if (MISSING.has((e as NodeJS.ErrnoException).code ?? '')) return null;
				throw e;
			}
		},

		async remove(keys) {
			for (const key of keys) {
				const target = resolve(key);
				if (!target) continue;
				await rm(target, { force: true });
				// Folder task ikut dibuang kalau udah kosong. Kalau masih ada isinya, biarin.
				await rmdir(path.dirname(target)).catch(() => undefined);
			}
		}
	};
}
