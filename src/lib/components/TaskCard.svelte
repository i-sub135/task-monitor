<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { BugIcon, CalendarIcon, PaperclipIcon, SparklesIcon, UserIcon } from '@lucide/svelte';
	import { platformLabels, type BoardTask } from '$lib/tasks';
	import { platformIcons, platformColors } from '$lib/platform-icons';

	// Isi kartu task yang dipakai bareng /board dan /board/list/[status]. Handler drag dan class tambahan
	// dioper lewat rest props ke <article>; tombol ▲▼ lewat `actions` (sebaris badge, mepet kanan);
	// kontrol lain (tombol live) lewat children di bawah.
	let {
		task,
		dimmed = false,
		actions,
		children,
		...rest
	}: { task: BoardTask; dimmed?: boolean; actions?: Snippet; children?: Snippet } & HTMLAttributes<HTMLElement> =
		$props();

	const PlatformIcon = $derived(platformIcons[task.platform]);
	const ageLabel = (days: number) => (days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`);
</script>

<article
	{...rest}
	class="card preset-filled-surface-50-950 border-surface-300-700 hover:border-primary-500 relative flex cursor-pointer flex-col gap-3 border p-4 shadow-xl transition duration-150 hover:-translate-y-1 hover:shadow-2xl {dimmed
		? 'opacity-40'
		: ''} {rest.class ?? ''}"
>
	<div class="flex flex-wrap items-center gap-2 text-xs">
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
		<!-- Grup kanan: badge LIVE + ▲▼ dalam satu wadah ml-auto. Kalau masing-masing ml-auto, sisa ruang
		     kebagi dua dan LIVE nyangkut di tengah (slot actions di board selalu dikirim walau isinya kosong).
		     Wadahnya gak di-z-10 biar klik di LIVE tetep buka task; tombol di `actions` yang pasang z-10 sendiri. -->
		{#if task.status === 'done-live' || actions}
			<div class="ml-auto flex items-center gap-1">
				{#if task.status === 'done-live'}
					<!-- TM-15: latar = latar tema, garis ijo ngejreng tebel biar ketangkep mata di atas kartu Done
					     yang udah ijo, tulisan biru (#2D7495). -->
					<span
						class="badge bg-surface-50-950 border-2 font-black tracking-wider"
						style="color: #2d7495; border-color: #00c853">LIVE</span
					>
				{/if}
				{@render actions?.()}
			</div>
		{/if}
	</div>

	<a
		href="/task/{task.id}"
		draggable="false"
		class="focus-visible:outline-primary-500 font-medium after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline-2 {task.status ===
		'rejected'
			? 'text-gray-500 line-through'
			: ''}"
	>
		{task.title}
	</a>

	<footer class="flex items-center justify-between gap-2 text-xs opacity-70">
		<!-- Singkat: "<user> · today / yesterday / 10 days ago". Waktu persis (WIB) di tooltip. -->
		<span class="flex min-w-0 flex-wrap items-center gap-x-1" title="Created {task.createdAt}">
			<UserIcon class="size-3 shrink-0" /><span class="font-semibold">{task.createdBy}</span>
			<span aria-hidden="true">·</span>
			<CalendarIcon class="size-3 shrink-0" /><span class="font-semibold">{ageLabel(task.ageDays)}</span>
		</span>
		{#if task.attachments > 0}
			<span class="flex items-center gap-1"><PaperclipIcon class="size-3" />{task.attachments}</span>
		{/if}
	</footer>

	{@render children?.()}
</article>
