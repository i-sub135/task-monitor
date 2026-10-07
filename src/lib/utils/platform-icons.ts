import { ServerIcon, SmartphoneIcon, BotIcon, GlobeIcon, CircleDashedIcon } from '@lucide/svelte';
import type { Platform } from './tasks';

/** TM-12: satu sumber ikon per platform, dipakai form Task baru, badge detail, dan kartu board. */
export const platformIcons = {
	api: ServerIcon,
	mobile: SmartphoneIcon,
	'ai-chat': BotIcon,
	web: GlobeIcon,
	other: CircleDashedIcon
} satisfies Record<Platform, typeof ServerIcon>;

/**
 * Palet warna dari Iyan (5 hex, dipakai persis apa adanya — bukan sekadar referensi visual):
 * FCF9EA, 97A87A, 578EF5, F2F7A0, 2D7495. Awalnya 4 dipakai sebagai background (FCF9EA disisain
 * jadi teks doang), tapi platform sekarang jadi 5 — FCF9EA kepakai juga sebagai background `web`
 * (teks gelap 2D7495, sama pola kontras kayak `other`), soalnya cuma 5 hex yang dikasih buat 5
 * platform. Kalau Iyan mau warna ke-6 yang beda, tinggal ganti field ini.
 */
export const platformColors = {
	api: { bg: '#578EF5', fg: '#FCF9EA' },
	mobile: { bg: '#97A87A', fg: '#FCF9EA' },
	'ai-chat': { bg: '#2D7495', fg: '#FCF9EA' },
	web: { bg: '#FCF9EA', fg: '#2D7495' },
	other: { bg: '#F2F7A0', fg: '#2D7495' }
} satisfies Record<Platform, { bg: string; fg: string }>;
