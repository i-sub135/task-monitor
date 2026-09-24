export type Segment =
	| { type: 'text'; text: string }
	| { type: 'link'; href: string; text: string };

const URL_PATTERN = /https?:\/\/[^\s<>"']+/g;
const CLOSERS: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

/** Buang tanda baca di ujung URL. Kurung penutup dipertahankan kalau ada pasangannya di dalam URL. */
function trimUrl(raw: string): string {
	let url = raw;
	while (url.length > 0) {
		const tail = url[url.length - 1];
		if ('.,;:!?'.includes(tail)) {
			url = url.slice(0, -1);
			continue;
		}
		const opener = CLOSERS[tail];
		if (opener && url.split(tail).length > url.split(opener).length) {
			url = url.slice(0, -1);
			continue;
		}
		break;
	}
	return url;
}

function isHttpUrl(value: string): boolean {
	try {
		const { protocol } = new URL(value);
		return protocol === 'http:' || protocol === 'https:';
	} catch {
		return false;
	}
}

/**
 * Pecah teks jadi potongan teks dan link http(s). Dirender lewat #each, bukan {@html},
 * jadi isi teks gak pernah dianggap markup. Skema selain http/https gak pernah jadi link.
 */
export function linkify(input: string): Segment[] {
	const segments: Segment[] = [];
	let cursor = 0;

	for (const match of input.matchAll(URL_PATTERN)) {
		const url = trimUrl(match[0]);
		if (!isHttpUrl(url)) continue;

		const start = match.index ?? 0;
		if (start > cursor) segments.push({ type: 'text', text: input.slice(cursor, start) });
		segments.push({ type: 'link', href: url, text: url });
		cursor = start + url.length;
	}

	if (cursor < input.length) segments.push({ type: 'text', text: input.slice(cursor) });
	return segments;
}
