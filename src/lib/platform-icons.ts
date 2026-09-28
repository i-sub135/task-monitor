import { ServerIcon, SmartphoneIcon, BotIcon, CircleDashedIcon } from '@lucide/svelte';
import type { Platform } from './tasks';

/** TM-12: satu sumber ikon per platform, dipakai form Task baru, badge detail, dan kartu board. */
export const platformIcons = {
	api: ServerIcon,
	mobile: SmartphoneIcon,
	'ai-chat': BotIcon,
	other: CircleDashedIcon
} satisfies Record<Platform, typeof ServerIcon>;
