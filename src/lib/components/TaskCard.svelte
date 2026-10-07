<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { CalendarIcon, CheckIcon, LinkIcon, PaperclipIcon } from '@lucide/svelte';
	import { copyText } from '$lib/utils/clipboard';
	import { typeFilledClass, typeIcons, typeTextClass } from '$lib/utils/type-styles';
	import { platformLabels, type BoardTask } from '$lib/utils/tasks';
	import { platformIcons, platformColors } from '$lib/utils/platform-icons';

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

	// Tombol share: salin link detail task (URL lengkap) ke clipboard, ikon jadi centang sebentar.
	let copied = $state(false);
	const shareLink = async () => {
		if ((await copyText(`${location.origin}/task/${task.id}`)) !== 'copied') return;
		copied = true;
		setTimeout(() => (copied = false), 1500);
	};
</script>

<article
	{...rest}
	class="card preset-filled-surface-50-950 border-surface-300-700 hover:border-primary-500 relative flex cursor-pointer flex-col gap-3 border p-4 shadow-xl transition duration-150 hover:-translate-y-1 hover:shadow-2xl {dimmed
		? 'opacity-40'
		: ''} {rest.class ?? ''}"
>
	<!-- Baris badge: kiri (posisi, type, platform) boleh turun baris kalau kartu sempit; kanan (LIVE, ▲▼)
	     dikunci di pojok kanan atas, jadi gak pernah turun sendirian ke baris kedua. -->
	<div class="flex items-start gap-2 text-xs">
		<div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
			{#if task.position !== null}
				<span class="badge preset-tonal" title="Position in column">#{task.position}</span>
			{/if}
			<span class="badge {typeFilledClass[task.type]}"><TypeIcon class="size-3" /> {task.type}</span>
			<span
				class="badge"
				style="background-color: {platformColors[task.platform].bg}; color: {platformColors[task.platform].fg}"
				><PlatformIcon class="size-3" /> {platformLabels[task.platform]}</span
			>
		</div>
		<!-- Grup kanan dalam satu wadah: LIVE, ▲▼ (`actions`), tombol salin link. Wadahnya gak di-z-10 biar klik di
		     LIVE tetep buka task; tiap tombol pasang z-10 sendiri biar gak ketutup link kartu. -->
		<div class="flex shrink-0 items-center gap-1">
			{#if task.status === 'done-live'}
				<!-- TM-15: latar = latar tema, garis ijo ngejreng tebel biar ketangkep mata di atas kartu Done
				     yang udah ijo, tulisan biru (#2D7495). -->
				<span
					class="badge bg-surface-50-950 border-2 font-black tracking-wider"
					style="color: #2d7495; border-color: #00c853">LIVE</span
				>
			{/if}
			{@render actions?.()}
			<button
				type="button"
				class="badge preset-tonal relative z-10 cursor-pointer px-1.5 transition hover:brightness-90"
				aria-label="Copy link to this task"
				title={copied ? 'Link copied' : 'Copy link to this task'}
				onclick={shareLink}
			>
				{#if copied}<CheckIcon class="size-3" />{:else}<LinkIcon class="size-3" />{/if}
			</button>
		</div>
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
