import { ServerIcon, SmartphoneIcon, BotIcon, CircleDashedIcon } from '@lucide/svelte';
import type { Platform } from './tasks';

/** TM-12: satu sumber ikon per platform, dipakai form Task baru, badge detail, dan kartu board. */
export const platformIcons = {
	api: ServerIcon,
	mobile: SmartphoneIcon,
	'ai-chat': BotIcon,
	other: CircleDashedIcon
} satisfies Record<Platform, typeof ServerIcon>;

/**
 * Palet warna dari Iyan (5 hex, dipakai persis apa adanya — bukan sekadar referensi visual):
 * FCF9EA, 97A87A, 578EF5, F2F7A0, 2D7495. 4 dipakai sebagai background badge (satu tiap platform),
 * teks dipilih dari palet yang sama berdasar kontras: FCF9EA (terang) buat 3 background yang
 * medium/gelap, 2D7495 (gelap) buat F2F7A0 yang paling terang — biar kebaca di semuanya.
 */
export const platformColors = {
	api: { bg: '#578EF5', fg: '#FCF9EA' },
	mobile: { bg: '#97A87A', fg: '#FCF9EA' },
	'ai-chat': { bg: '#2D7495', fg: '#FCF9EA' },
	other: { bg: '#F2F7A0', fg: '#2D7495' }
} satisfies Record<Platform, { bg: string; fg: string }>;
