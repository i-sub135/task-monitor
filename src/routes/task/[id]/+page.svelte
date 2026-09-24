<script lang="ts">
	import { ArrowLeftIcon, BugIcon, SparklesIcon, FileTextIcon } from '@lucide/svelte';
	import { statusLabels } from '$lib/mock/tasks';
	import { linkify } from '$lib/linkify';

	let { data } = $props();
	const task = $derived(data.task);
</script>

<svelte:head>
	<title>{task.title} · Task Monitor</title>
</svelte:head>

<a href="/" class="btn btn-sm hover:preset-tonal mb-6 inline-flex items-center gap-1">
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
			<p>{task.description}</p>
		</section>

		<section>
			<h2 class="mb-3 font-semibold">Lampiran ({task.attachments.length})</h2>
			{#if task.attachments.length > 0}
				<ul class="grid grid-cols-2 gap-4 sm:grid-cols-3">
					{#each task.attachments as file (file.name)}
						<li class="flex flex-col gap-1">
							{#if file.mime.startsWith('image/') && file.url}
								<a
									href={file.url}
									target="_blank"
									rel="noopener noreferrer"
									class="border-surface-300-700 hover:border-primary-500 block overflow-hidden rounded-container border shadow-md transition hover:shadow-xl"
								>
									<img
										src={file.url}
										alt={file.name}
										loading="lazy"
										class="aspect-video w-full object-cover"
									/>
								</a>
							{:else}
								<div
									class="preset-outlined-surface-300-700 rounded-container flex aspect-video w-full items-center justify-center"
								>
									<FileTextIcon class="size-8 opacity-60" />
								</div>
							{/if}
							<span class="truncate text-xs opacity-70" title={file.name}>{file.name}</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-sm opacity-50">Tidak ada lampiran</p>
			{/if}
		</section>
	</article>

	<aside class="card preset-filled-surface-50-950 border-surface-300-700 h-fit border p-6 shadow-xl">
		<h2 class="mb-4 font-semibold">Riwayat status</h2>
		<ol class="flex flex-col gap-4 text-sm">
			{#each task.history as h, i (i)}
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
