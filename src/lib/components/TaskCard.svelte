<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { CalendarIcon, PaperclipIcon } from '@lucide/svelte';
	import { typeFilledClass, typeIcons, typeTextClass } from '$lib/type-styles';
	import { platformLabels, type BoardTask } from '$lib/tasks';
	import { platformIcons, platformColors } from '$lib/platform-icons';

	// Isi kartu task yang dipakai bareng /board dan /board/list/[status]. Handler drag dan class tambahan
	// dioper lewat rest props ke <article>; tombol ▲▼ lewat `actions` (sebaris badge, mepet kanan);
	// tombol bulet mark/unmark live lewat `footerActions` (paling kanan di kotak footer).
	let {
		task,
		dimmed = false,
		actions,
		footerActions,
		children,
		...rest
	}: {
		task: BoardTask;
		dimmed?: boolean;
		actions?: Snippet;
		footerActions?: Snippet;
		children?: Snippet;
	} & HTMLAttributes<HTMLElement> = $props();

	const PlatformIcon = $derived(platformIcons[task.platform]);
	const TypeIcon = $derived(typeIcons[task.type]);
	const ageLabel = (days: number) => (days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`);

	// Footer: bulatan inisial pembuat, warnanya tetap per user (dari id, bukan nama) biar sekilas kebedain.
	const AVATAR_COLORS = ['#2d7495', '#578ef5', '#7a6bbf', '#c2410c', '#0f766e', '#a16207', '#be185d', '#4d7c0f'];
	const initials = (name: string) =>
		name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((w) => w[0].toUpperCase())
			.join('');
	const avatarColor = (id: string) => {
		let h = 0;
		for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
		return AVATAR_COLORS[h % AVATAR_COLORS.length];
	};
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
		<span class="badge {typeFilledClass[task.type]}"><TypeIcon class="size-3" /> {task.type}</span>
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
			: typeTextClass[task.type]}"
	>
		{task.title}
	</a>

	<!-- Kotak siapa/kapan: panel kecil di dalam kartu, latar tema setengah transparan (`.card-meta` di app.css)
	     jadi warnanya ikut kartu tapi lebih muda, + bayangan halus (elevation) biar keliatan ngambang. Nama gak dipotong: kalau kartu sempit, tanggal turun ke baris kedua.
	     Waktu persis di tooltip. -->
	<footer
		class="card-meta border-surface-300-700/60 mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-lg border px-2 py-1.5 text-xs shadow-sm"
		title="Created {task.createdAt}"
	>
		<span class="flex min-w-0 items-center gap-1.5">
			<span
				class="flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
				style="background-color: {avatarColor(task.createdById)}"
				aria-hidden="true">{initials(task.createdBy)}</span
			>
			<span class="font-semibold">{task.createdBy}</span>
		</span>
		<span class="ml-auto flex shrink-0 items-center gap-2">
			{#if task.attachments > 0}
				<span class="flex items-center gap-1 opacity-70" title="Attachments"
					><PaperclipIcon class="size-3" />{task.attachments}</span
				>
			{/if}
			<span class="flex items-center gap-1 opacity-80"
				><CalendarIcon class="size-3" /><span class="font-medium">{ageLabel(task.ageDays)}</span></span
			>
			{@render footerActions?.()}
		</span>
	</footer>

	{@render children?.()}
</article>
