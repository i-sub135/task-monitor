/**
 * Salin teks ke clipboard pakai Clipboard API. API ini cuma ada di konteks aman (HTTPS / localhost) — prod aman.
 * Di luar itu (mis. dev server lewat http://192.168.x.x) atau kalau browser nolak, teksnya ditampilin di
 * dialog `prompt` yang udah keblok, tinggal Ctrl/Cmd+C. (Sengaja gak pakai `document.execCommand('copy')`:
 * udah deprecated.)
 */
export const copyText = async (text: string): Promise<'copied' | 'shown'> => {
	if (navigator.clipboard && window.isSecureContext) {
		try {
			await navigator.clipboard.writeText(text);
			return 'copied';
		} catch {
			// izin ditolak dll: lanjut ke prompt
		}
	}
	window.prompt('Copy this link:', text);
	return 'shown';
};
