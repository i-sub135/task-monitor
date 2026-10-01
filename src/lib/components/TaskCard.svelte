<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { BugIcon, PaperclipIcon, SparklesIcon } from '@lucide/svelte';
	import { platformLabels, type BoardTask } from '$lib/tasks';
	import { platformIcons, platformColors } from '$lib/platform-icons';

	// Isi kartu task yang dipakai bareng /board dan /board/list/[status]. Handler drag dan class tambahan
	// dioper lewat rest props ke <article>; tombol kontrol (▲▼) lewat children.
	let {
		task,
		dimmed = false,
		children,
		...rest
	}: { task: BoardTask; dimmed?: boolean; children?: Snippet } & HTMLAttributes<HTMLElement> = $props();

	const PlatformIcon = $derived(platformIcons[task.platform]);
	const ageLabel = (days: number) => (days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`);
</script>

<article
	{...rest}
	class="card preset-filled-surface-50-950 border-surface-300-700 hover:border-primary-500 relative flex cursor-pointer flex-col gap-3 border p-4 shadow-xl transition duration-150 hover:-translate-y-1 hover:shadow-2xl {dimmed
		? 'opacity-40'
		: ''} {rest.class ?? ''}"
>
	{#if task.status === 'done-live'}
		<!-- TM-15: stempel diagonal transparan nutup kartu; gak nangkep klik, jadi link & tombol tetap jalan. -->
		<span aria-hidden="true" class="live-stamp-layer">
			<span class="live-stamp live-stamp--diagonal">Live</span>
		</span>
		<span class="sr-only">Live</span>
	{/if}
	<div class="flex items-center gap-2 text-xs">
		{#if task.position !== null}
			<span class="badge preset-tonal" title="Position in column">#{task.position}</span>
		{/if}
		{#if task.type === 'bug'}
			<span class="badge preset-filled-error-500"><BugIcon class="size-3" /> bug</span>
		{:else}
			<span class="badge preset-filled-primary-500"><SparklesIcon class="size-3" /> feature</span>
		{/if}
		<span
			class="badge"
			style="background-color: {platformColors[task.platform].bg}; color: {platformColors[task.platform].fg}"
			><PlatformIcon class="size-3" /> {platformLabels[task.platform]}</span
		>
	</div>

	<a
		href="/task/{task.id}"
		draggable="false"
		class="focus-visible:outline-primary-500 font-medium after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline-2"
	>
		{task.title}
	</a>

	<footer class="flex items-center justify-between gap-2 text-xs opacity-70">
		<span>oleh {task.createdBy} · {ageLabel(task.ageDays)}</span>
		{#if task.attachments > 0}
			<span class="flex items-center gap-1"><PaperclipIcon class="size-3" />{task.attachments}</span>
		{/if}
	</footer>

	{@render children?.()}
</article>
