const jakartaTime = new Intl.DateTimeFormat('sv-SE', {
	timeZone: 'Asia/Jakarta',
	dateStyle: 'short',
	timeStyle: 'short'
});

/** Waktu sekarang di WIB, format "2026-09-24 14:30". */
export const nowJakarta = (): string => jakartaTime.format(new Date());

/** Format tanggal apa pun ke WIB, "2026-09-24 14:30". */
export const formatJakarta = (date: Date): string => jakartaTime.format(date);
