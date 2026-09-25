<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		ArrowLeftIcon,
		BugIcon,
		SparklesIcon,
		FileTextIcon,
		ZoomInIcon,
		ZoomOutIcon,
		DownloadIcon,
		XIcon
	} from '@lucide/svelte';
	import { canAdvance } from '$lib/roles';
	import { statusLabels, transitions, type Status } from '$lib/tasks';
	import { linkify } from '$lib/linkify';
	import type { AttachmentInfo } from '$lib/tasks';

	let { data, form } = $props();
	const task = $derived(data.task);
	const nextStatuses = $derived(transitions[task.status]);
	const canMove = $derived(data.user ? canAdvance(data.user.role) : false);

	// HP (di bawah 500px): pindah status lewat modal, dibuka dari tombol. Tab = target yang mungkin; catatan wajib
	// cuma buat reject (aturan yang sama dengan server dan kartu di desktop).
	let moveOpen = $state(false);
	let moveDialog = $state<HTMLDialogElement>();
	let moveTarget = $state<Status | null>(null);
	const selectedTo = $derived<Status>(
		moveTarget && nextStatuses.includes(moveTarget) ? moveTarget : nextStatuses[0]
	);
	$effect(() => {
		if (moveOpen && moveDialog && !moveDialog.open) moveDialog.showModal();
	});
	const tabLabel = (to: Status) => (to === 'rejected' ? 'Reject' : `Pindah ke ${statusLabels[to]}`);
	const noteLabel = (to: Status) =>
		to === 'rejected' ? 'Alasan (wajib)' : to === 'done' ? 'Catatan / link hasil (opsional)' : 'Catatan (opsional)';
	function openMove() {
		moveTarget = nextStatuses[0];
		moveOpen = true;
	}

	// Viewer lampiran: modal dengan zoom dan unduh, bukan buka tab baru.
	const ZOOM_STEPS = [1, 1.5, 2, 3, 4];
	let viewing = $state<AttachmentInfo | null>(null);
	let viewer = $state<HTMLDialogElement>();
	let zoomIndex = $state(0);
	const zoom = $derived(ZOOM_STEPS[zoomIndex]);
	const isImage = $derived(viewing?.mime.startsWith('image/') ?? false);

	$effect(() => {
		if (viewing && viewer && !viewer.open) viewer.showModal();
	});

	function openViewer(file: AttachmentInfo) {
		zoomIndex = 0;
		viewing = file;
	}
	const zoomIn = () => (zoomIndex = Math.min(zoomIndex + 1, ZOOM_STEPS.length - 1));
	const zoomOut = () => (zoomIndex = Math.max(zoomIndex - 1, 0));
	// Klik dua kali di gambar: balik ke pas layar, atau zoom 2x.
	const toggleZoom = () => (zoomIndex = zoomIndex === 0 ? 2 : 0);

	const sizeLabel = (bytes: number) =>
		bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
</script>

<svelte:head>
	<title>{task.title} · Task Monitor</title>
</svelte:head>

<a href="/board" class="btn btn-sm btn-outline-neutral mb-6 inline-flex items-center gap-1">
	<ArrowLeftIcon class="size-4" /> Board
</a>

<div class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
	<article class="card preset-filled-surface-50-950 border-surface-300-700 flex flex-col gap-6 border p-6 shadow-xl">
		<div class="flex flex-wrap items-center gap-2 text-xs">
			{#if task.type === 'bug'}
				<span class="badge preset-filled-error-500"><BugIcon class="size-3" /> bug</span>
			{:else}
				<span class="badge preset-filled-primary-500"
					><SparklesIcon class="size-3" /> feature</span
				>
			{/if}
			<span class="badge preset-tonal">{statusLabels[task.status]}</span>
		</div>

		<h1 class="h3">{task.title}</h1>
		<p class="text-sm opacity-70">oleh {task.createdBy} · {task.createdAt}</p>

		<section>
			<h2 class="mb-2 font-semibold">Deskripsi</h2>
			<p class="whitespace-pre-wrap">{task.description}</p>
		</section>

		<section>
			<h2 class="mb-3 font-semibold">Lampiran ({task.attachments.length})</h2>
			{#if task.attachments.length > 0}
				<ul class="grid grid-cols-2 gap-4 sm:grid-cols-3">
					{#each task.attachments as file (file.id)}
						<li class="flex flex-col gap-1">
							<button
								type="button"
								onclick={() => openViewer(file)}
								aria-label="Lihat {file.name}"
								class="border-surface-300-700 hover:border-primary-500 rounded-container block cursor-pointer overflow-hidden border shadow-md transition hover:shadow-xl"
							>
								{#if file.mime.startsWith('image/')}
									<img
										src="/attachment/{file.id}"
										alt={file.name}
										loading="lazy"
										class="aspect-video w-full object-cover"
									/>
								{:else}
									<div class="preset-outlined-surface-300-700 flex aspect-video w-full items-center justify-center">
										<FileTextIcon class="size-8 opacity-60" />
									</div>
								{/if}
							</button>
							<span class="truncate text-xs opacity-70" title={file.name}>{file.name} · {sizeLabel(file.size)}</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-sm opacity-50">Tidak ada lampiran</p>
			{/if}
		</section>
	</article>

	<div class="flex h-fit flex-col gap-6">
		{#if canMove && nextStatuses.length > 0}
			<button type="button" class="btn btn-outline-primary xs:hidden" onclick={openMove}>Pindah status</button>
			<section class="card preset-filled-surface-50-950 border-surface-300-700 hidden flex-col gap-4 border p-6 shadow-xl xs:flex">
				<h2 class="font-semibold">Pindah status</h2>
				{#if form?.transitionError}
					<div class="card preset-filled-error-500 p-3 text-sm" role="alert">{form.transitionError}</div>
				{/if}
				{#each nextStatuses as to (to)}
					<form method="POST" action="?/transition" use:enhance class="form-comfy flex flex-col gap-3">
						<input type="hidden" name="to" value={to} />
						{#if to === 'rejected' || to === 'done'}
							<label class="label">
								<span class="label-text font-semibold">
									{to === 'rejected' ? 'Alasan (wajib)' : 'Catatan / link hasil (opsional)'}
								</span>
								<textarea class="textarea" name="note" rows="2" required={to === 'rejected'}></textarea>
							</label>
						{/if}
						<button
							type="submit"
							class="btn {to === 'rejected' ? 'btn-outline-error' : 'btn-outline-primary'}"
						>
							Pindah ke {statusLabels[to]}
						</button>
					</form>
				{/each}
			</section>
		{/if}

		<aside class="card preset-filled-surface-50-950 border-surface-300-700 border p-6 shadow-xl">
			<h2 class="mb-4 font-semibold">Riwayat status</h2>
			<ol class="flex flex-col gap-4 text-sm">
				{#each task.history as h (h.id)}
					<li class="border-surface-300-700 border-l-2 pl-3">
						<p class="font-medium">
							{h.from ? `${statusLabels[h.from]} → ` : ''}{statusLabels[h.to]}
						</p>
						<p class="text-xs opacity-70">{h.by} · {h.at}</p>
						{#if h.note}
							<p class="mt-1 break-words whitespace-pre-wrap">
								{#each linkify(h.note) as seg, i (i)}
									{#if seg.type === 'link'}
										<a href={seg.href} target="_blank" rel="noopener noreferrer" class="anchor break-all"
											>{seg.text}</a
										>
									{:else}
										{seg.text}
									{/if}
								{/each}
							</p>
						{/if}
					</li>
				{/each}
			</ol>
		</aside>
	</div>
</div>

{#if viewing}
	<!-- Klik di luar kotak (backdrop) menutup; Esc ditangani dialog bawaan. -->
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
	<dialog
		bind:this={viewer}
		onclose={() => (viewing = null)}
		onclick={(e) => {
			if (e.target === viewer) viewer?.close();
		}}
		aria-labelledby="viewer-title"
		class="card preset-filled-surface-50-950 border-surface-300-700 m-auto w-[min(94vw,60rem)] max-w-none overflow-hidden border p-0 shadow-2xl backdrop:bg-black/60"
	>
		<div class="flex max-h-[92vh] flex-col">
			<header class="border-surface-300-700 flex flex-wrap items-center gap-3 border-b px-4 py-3">
				<div class="min-w-0 flex-1">
					<h2 id="viewer-title" class="truncate font-semibold" title={viewing.name}>{viewing.name}</h2>
					<p class="text-xs opacity-70">{sizeLabel(viewing.size)}</p>
				</div>
				{#if isImage}
					<div class="flex items-center gap-2" role="group" aria-label="Zoom">
						<button
							type="button"
							class="btn-icon btn-icon-sm btn-outline-neutral"
							onclick={zoomOut}
							disabled={zoomIndex === 0}
							aria-label="Perkecil"
							title="Perkecil"
						>
							<ZoomOutIcon class="size-4" />
						</button>
						<button
							type="button"
							class="btn btn-sm btn-outline-neutral min-w-16"
							onclick={() => (zoomIndex = 0)}
							title="Pas layar"
						>
							{Math.round(zoom * 100)}%
						</button>
						<button
							type="button"
							class="btn-icon btn-icon-sm btn-outline-neutral"
							onclick={zoomIn}
							disabled={zoomIndex === ZOOM_STEPS.length - 1}
							aria-label="Perbesar"
							title="Perbesar"
						>
							<ZoomInIcon class="size-4" />
						</button>
					</div>
				{/if}
				<a
					href="/attachment/{viewing.id}"
					download={viewing.name}
					class="btn btn-sm btn-outline-primary"
				>
					<DownloadIcon class="size-4" /> Unduh
				</a>
				<button
					type="button"
					class="btn-icon btn-icon-sm btn-outline-neutral"
					onclick={() => viewer?.close()}
					aria-label="Tutup"
					title="Tutup"
				>
					<XIcon class="size-4" />
				</button>
			</header>

			<div class="min-h-0 flex-1 overflow-auto p-4">
				{#if isImage}
					<!-- 100% = pas di layar. Di atas itu gambar melebar dan bisa digeser (scroll) di dalam kotak. -->
					<img
						src="/attachment/{viewing.id}"
						alt={viewing.name}
						ondblclick={toggleZoom}
						class="mx-auto block select-none {zoomIndex === 0
							? 'max-h-[70vh] max-w-full cursor-zoom-in object-contain'
							: 'max-w-none cursor-zoom-out'}"
						style={zoomIndex === 0 ? undefined : `width: ${zoom * 100}%`}
					/>
				{:else}
					<div class="flex flex-col items-center gap-3 py-12 text-center">
						<FileTextIcon class="size-16 opacity-60" />
						<p class="text-sm opacity-70">Pratinjau tidak tersedia untuk file ini. Unduh untuk membukanya.</p>
					</div>
				{/if}
			</div>
		</div>
	</dialog>
{/if}

{#if moveOpen && canMove && nextStatuses.length > 0}
	<!-- Klik di luar kotak (backdrop) menutup; Esc ditangani dialog bawaan. Sukses pindah = modal menutup sendiri. -->
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
	<dialog
		bind:this={moveDialog}
		onclose={() => (moveOpen = false)}
		onclick={(e) => {
			if (e.target === moveDialog) moveDialog?.close();
		}}
		aria-labelledby="move-title"
		class="card preset-filled-surface-50-950 border-surface-300-700 m-auto w-[min(94vw,28rem)] max-w-none overflow-hidden border p-0 shadow-2xl backdrop:bg-black/60"
	>
		<form
			method="POST"
			action="?/transition"
			use:enhance={() =>
				async ({ result, update }) => {
					await update();
					if (result.type === 'success') moveOpen = false;
				}}
			class="form-comfy flex max-h-[92vh] flex-col gap-5 overflow-y-auto p-5"
		>
			<input type="hidden" name="to" value={selectedTo} />
			<div>
				<h2 id="move-title" class="h5">Pindah status</h2>
				<p class="text-xs opacity-70">Sekarang: {statusLabels[task.status]}</p>
			</div>

			{#if nextStatuses.length > 1}
				<div class="flex" role="tablist" aria-label="Pindah ke">
					{#each nextStatuses as to (to)}
						<button
							type="button"
							role="tab"
							aria-selected={selectedTo === to}
							data-tab-status={to}
							class="btn relative min-h-10 min-w-0 flex-1 -ml-px rounded-none! px-2 text-sm first:ml-0 first:rounded-s-full! last:rounded-e-full! aria-selected:z-10 {selectedTo ===
							to
								? to === 'rejected'
									? 'preset-filled-error-500'
									: 'preset-filled-primary-500'
								: 'btn-outline-neutral'}"
							onclick={() => (moveTarget = to)}
						>
							{tabLabel(to)}
						</button>
					{/each}
				</div>
			{/if}

			{#if form?.transitionError}
				<div class="card preset-filled-error-500 p-3 text-sm" role="alert">{form.transitionError}</div>
			{/if}

			<label class="label">
				<span class="label-text font-semibold">{noteLabel(selectedTo)}</span>
				<textarea class="textarea" name="note" rows="3" required={selectedTo === 'rejected'}></textarea>
			</label>

			<div class="flex justify-end gap-3">
				<button type="button" class="btn btn-outline-neutral" onclick={() => moveDialog?.close()}>Batal</button>
				<button
					type="submit"
					class="btn {selectedTo === 'rejected' ? 'btn-outline-error' : 'btn-outline-primary'}"
				>
					{tabLabel(selectedTo)}
				</button>
			</div>
		</form>
	</dialog>
{/if}

