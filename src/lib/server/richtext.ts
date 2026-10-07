import sanitizeHtml from 'sanitize-html';

// TM-10: description task sekarang boleh berisi rich text (list, bold, underline, italic,
// blockquote sebagai "indent"). Ini satu-satunya tempat yang boleh nentuin tag apa yang lolos —
// dipanggil pas simpan (task/new, nanti edit TM-11) dan pas render (dobel proteksi, murah).
const ALLOWED_TAGS = ['p', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'br', 'blockquote'];

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
	allowedTags: ALLOWED_TAGS,
	allowedAttributes: {},
	// Paragraf/list kosong dari editor (mis. <p></p> pas semua teks dihapus) tetap lolos sanitasi;
	// yang mastiin description gak kosong beneran itu descriptionText(), bukan di sini.
	disallowedTagsMode: 'discard'
};

/** Saring HTML dari editor (atau apa pun) jadi cuma tag yang diizinin, nol atribut. */
export const sanitizeDescription = (html: string): string => {
	return sanitizeHtml(html, SANITIZE_OPTIONS);
};

/** Isi teks doang (tanpa tag), buat cek "kosong beneran" tanpa kepancing markup kosong kayak <p></p>. */
export const descriptionText = (html: string): string => {
	return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).trim();
};

const HTML_TAG_PATTERN = /<[a-z][\s\S]*>/i;

/**
 * Task lama disimpan sebagai teks polos (whitespace-pre-wrap, auto-escaped, nol tag). Description
 * baru dari editor TM-10 selalu mulai dari tag blok (setidaknya <p>...</p>). Dibedain dari ada/
 * gaknya tag HTML: kalau ada, anggap udah HTML (dari editor, sudah/akan disaring ulang di bawah).
 * Kalau nggak, escape dulu + newline jadi <br> biar tampilannya identik sama sebelum tiket ini.
 */
export const renderDescriptionHtml = (raw: string): string => {
	if (HTML_TAG_PATTERN.test(raw)) return sanitizeDescription(raw);
	const escaped = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	return sanitizeDescription(escaped.replace(/\r\n|\r|\n/g, '<br>'));
};
