<script lang="ts">
	import { enhance } from '$app/forms';
	import { ArrowLeftIcon, BugIcon, SparklesIcon, FileTextIcon } from '@lucide/svelte';
	import { canAdvance } from '$lib/roles';
	import { statusLabels, transitions } from '$lib/tasks';
	import { linkify } from '$lib/linkify';

	let { data, form } = $props();
	const task = $derived(data.task);
	const nextStatuses = $derived(transitions[task.status]);
	const canMove = $derived(data.user ? canAdvance(data.user.role) : false);

	const sizeLabel = (bytes: number) =>
		bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
</script>

<svelte:head>
	<title>{task.title} · Task Monitor</title>
</svelte:head>

<a href="/board" class="btn btn-sm hover:preset-tonal mb-6 inline-flex items-center gap-1">
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
							<a
								href="/attachment/{file.id}"
								target="_blank"
								rel="noopener noreferrer"
								class="border-surface-300-700 hover:border-primary-500 rounded-container block overflow-hidden border shadow-md transition hover:shadow-xl"
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
							</a>
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
			<section class="card preset-filled-surface-50-950 border-surface-300-700 flex flex-col gap-4 border p-6 shadow-xl">
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
							class="btn {to === 'rejected' ? 'preset-filled-error-500' : 'preset-filled-primary-500'}"
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
