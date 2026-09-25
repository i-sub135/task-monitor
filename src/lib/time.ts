const jakartaTime = new Intl.DateTimeFormat('sv-SE', {
	timeZone: 'Asia/Jakarta',
	dateStyle: 'short',
	timeStyle: 'short'
});

/** Waktu sekarang di WIB, format "2026-09-24 14:30". */
export const nowJakarta = (): string => jakartaTime.format(new Date());

/** Format tanggal apa pun ke WIB, "2026-09-24 14:30". */
export const formatJakarta = (date: Date): string => jakartaTime.format(date);

const jakartaDay = new Intl.DateTimeFormat('en-CA', {
	timeZone: 'Asia/Jakarta',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit'
});

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Selisih hari kalender di WIB, bukan jumlah 24 jam yang lewat: dibuat kemarin jam 18.00 dan dilihat hari ini
 * jam 10.00 = 1 (kemarin), walau baru 16 jam. Ganti hari mengikuti tengah malam WIB.
 */
export function calendarDaysAgo(date: Date, now: Date = new Date()): number {
	const day = (d: Date): number => {
		const [y, m, dd] = jakartaDay.format(d).split('-').map(Number);
		return Date.UTC(y, m - 1, dd);
	};
	return Math.max(0, Math.round((day(now) - day(date)) / DAY_MS));
}

