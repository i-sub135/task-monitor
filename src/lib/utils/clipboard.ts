/**
 * Salin teks ke clipboard. `navigator.clipboard` cuma ada di konteks aman (HTTPS / localhost); dev server lewat
 * http://192.168.x.x gak punya, jadi fallback ke textarea + execCommand. Balikin true kalau berhasil.
 */
export const copyText = async (text: string): Promise<boolean> => {
	if (navigator.clipboard && window.isSecureContext) {
		try {
			await navigator.clipboard.writeText(text);
			return true;
		} catch {
			// lanjut ke fallback
		}
	}
	const area = document.createElement('textarea');
	area.value = text;
	area.setAttribute('readonly', '');
	area.style.position = 'fixed';
	area.style.opacity = '0';
	document.body.appendChild(area);
	area.select();
	try {
		return document.execCommand('copy');
	} catch {
		return false;
	} finally {
		area.remove();
	}
};
