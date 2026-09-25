import { randomUUID } from 'node:crypto';
import { DEFAULT_UPLOAD_SIZE_LIMIT, MAX_FILES, formatSize, parseSize } from '../upload-limits.js';
import { ATTACHMENT_PREFIX, isAttachmentKey } from './storage/keys.ts';
import type { StorageDriver } from './storage/types.ts';

export { MAX_FILES };

export type DetectedType = { mime: string; ext: string };

const startsWith = (b: Uint8Array, sig: number[], offset = 0) =>
	sig.every((byte, i) => b[offset + i] === byte);

/**
 * Jenis file dari isi (magic number), bukan dari nama atau mime kiriman browser. .exe yang
 * di-rename .png tetap ketahuan. SVG sengaja gak diizinkan: bisa bawa script.
 */
export function detectFileType(b: Uint8Array): DetectedType | null {
	if (startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: 'image/png', ext: 'png' };
	if (startsWith(b, [0xff, 0xd8, 0xff])) return { mime: 'image/jpeg', ext: 'jpg' };
	if (startsWith(b, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) || startsWith(b, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])) {
		return { mime: 'image/gif', ext: 'gif' };
	}
	if (startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8)) {
		return { mime: 'image/webp', ext: 'webp' };
	}
	if (startsWith(b, [0x25, 0x50, 0x44, 0x46, 0x2d])) return { mime: 'application/pdf', ext: 'pdf' };
	return null;
}

const declaredAllowed = (mime: string) => mime.startsWith('image/') || mime === 'application/pdf';

export type AcceptedFile = { name: string; mime: string; ext: string; size: number; bytes: Uint8Array };
export type UploadCheck = { ok: true; files: AcceptedFile[] } | { ok: false; error: string };

const cleanName = (name: string) =>
	name.replace(/[\\/\0]/g, '_').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 200) || 'file';

/** Validasi di server: jumlah, ukuran, mime kiriman, dan isi file. maxFileBytes dari UPLOAD_SIZE_LIMIT. */
export async function checkUploads(
	files: File[],
	maxFileBytes: number = parseSize(DEFAULT_UPLOAD_SIZE_LIMIT)
): Promise<UploadCheck> {
	if (files.length > MAX_FILES) return { ok: false, error: `Maksimal ${MAX_FILES} lampiran` };

	const accepted: AcceptedFile[] = [];
	for (const file of files) {
		if (file.size > maxFileBytes) {
			return { ok: false, error: `"${cleanName(file.name)}" lebih dari ${formatSize(maxFileBytes)}` };
		}
		if (!declaredAllowed(file.type)) {
			return { ok: false, error: `"${cleanName(file.name)}" bukan gambar atau PDF` };
		}
		const bytes = new Uint8Array(await file.arrayBuffer());
		const detected = detectFileType(bytes);
		if (!detected) {
			return {
				ok: false,
				error: `Isi "${cleanName(file.name)}" bukan gambar (PNG, JPG, GIF, WEBP) atau PDF`
			};
		}
		accepted.push({ name: cleanName(file.name), ...detected, size: bytes.length, bytes });
	}
	return { ok: true, files: accepted };
}

export type StoredFile = { name: string; mime: string; size: number; filePath: string };

/**
 * Simpan ke storage di storage/attachment/<taskId>/<uuid>.<ext>. filePath yang dikembaliin = key di storage
 * = nilai task_attachment.file_path, sama buat semua driver. Gagal di tengah: yang udah ditulis dihapus lagi.
 */
export async function storeFiles(storage: StorageDriver, taskId: string, files: AcceptedFile[]): Promise<StoredFile[]> {
	const stored: StoredFile[] = [];
	const attempted: string[] = [];
	try {
		for (const file of files) {
			const filePath = `${ATTACHMENT_PREFIX}/${taskId}/${randomUUID()}.${file.ext}`;
			// Dicatat sebelum put: file yang gagal di tengah nulis pun ikut dibersihin.
			attempted.push(filePath);
			await storage.put(filePath, file.bytes, file.mime);
			stored.push({ name: file.name, mime: file.mime, size: file.size, filePath });
		}
		return stored;
	} catch (e) {
		await storage.remove(attempted).catch(() => undefined);
		throw e;
	}
}

/** Bersihin file yang udah ditulis (dipanggil kalau transaksi DB gagal). */
export async function removeStored(storage: StorageDriver, files: StoredFile[]): Promise<void> {
	await storage.remove(files.map((f) => f.filePath));
}

/** Isi file, atau null kalau key-nya di luar storage/attachment atau objeknya gak ada. */
export async function readAttachment(storage: StorageDriver, filePath: string): Promise<Uint8Array | null> {
	if (!isAttachmentKey(filePath)) return null;
	return storage.get(filePath);
}
