/** Semua lampiran hidup di bawah prefix ini, di disk maupun di bucket. Key = task_attachment.file_path. */
export const ATTACHMENT_PREFIX = 'storage/attachment';

/**
 * Key yang boleh disentuh storage: harus di bawah ATTACHMENT_PREFIX, tanpa segmen kosong, `.` atau `..`,
 * tanpa backslash atau karakter NUL. Dicek di semua driver, jadi path traversal mati sebelum sampai disk/bucket.
 */
export function isAttachmentKey(key: string): boolean {
	if (!key.startsWith(`${ATTACHMENT_PREFIX}/`)) return false;
	if (key.includes('\\') || key.includes('\0')) return false;
	return key.split('/').every((part) => part !== '' && part !== '.' && part !== '..');
}
