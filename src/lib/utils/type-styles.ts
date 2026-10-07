import { BugIcon, LifeBuoyIcon, SparklesIcon } from '@lucide/svelte';
import type { TaskType } from './tasks';

/**
 * Satu sumber tampilan per type task (badge, chip form, warna judul kartu). TM-19 nambah support:
 * biru #578EF5 + ikon pelampung. `preset-filled-support` / `text-support` didefinisiin di app.css (@utility,
 * biar bisa dipakai bareng varian kayak `has-[:checked]:`).
 */
export const typeIcons = {
	bug: BugIcon,
	feature: SparklesIcon,
	support: LifeBuoyIcon
} satisfies Record<TaskType, typeof BugIcon>;

/** Class badge/chip terisi per type. */
export const typeFilledClass: Record<TaskType, string> = {
	bug: 'preset-filled-error-500',
	feature: 'preset-filled-primary-500',
	support: 'preset-filled-support'
};

/** Class warna judul kartu per type (ngikut warna badge-nya). */
export const typeTextClass: Record<TaskType, string> = {
	bug: 'text-error-500',
	feature: 'text-primary-500',
	support: 'text-support'
};
