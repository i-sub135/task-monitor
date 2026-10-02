<script lang="ts">
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { ArrowDownIcon, ArrowLeftIcon, ArrowUpIcon } from '@lucide/svelte';
	import { canReorder, statusLabels, type BoardTask } from '$lib/tasks';
	import TaskCard from '$lib/components/TaskCard.svelte';
	import BoardFilterBar from '$lib/components/BoardFilterBar.svelte';
	import { applyBoardFilter, creatorOptions, filterQuery, isFilterActive, parseBoardFilter } from '$lib/board-filter';

	let { data, form } = $props();

	const status = $derived(data.status);
	// TM-16: filter sama kayak /board (dibawa lewat link Read more). Reorder dimatiin selama filter aktif.
	const filter = $derived(parseBoardFilter(page.url.searchParams));
	const filtering = $derived(isFilterActive(filter));
	const creators = $derived(creatorOptions(data.tasks));
	const tasks = $derived(applyBoardFilter(data.tasks, filter));
	const reorderable = $derived(canReorder(data.user.role, status) && !filtering);

	let reorderForm = $state<HTMLFormElement>();
	let reorderFields = $state({ id: '', position: '' });

	// Drag di sini cuma buat reorder dalam kolom yang sama: lepas kartu di atas kartu lain = ambil posisinya.
	let dragging = $state<BoardTask | null>(null);
	let overId = $state<string | null>(null);

	async function sendReorder(id: string, position: number) {
		reorderFields = { id, position: String(position) };
		await tick();
		reorderForm?.requestSubmit();
	}

	function onDragStart(e: DragEvent, task: BoardTask) {
		if (!reorderable) {
			e.preventDefault();
			return;
		}
		dragging = task;
		e.dataTransfer?.setData('text/plain', task.id);
		if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
	}

	function onDragEnd() {
		dragging = null;
		overId = null;
	}

	function onDragOver(e: DragEvent, target: BoardTask) {
		if (!dragging || dragging.id === target.id) return;
		e.preventDefault();
		overId = target.id;
	}

	function onDrop(e: DragEvent, target: BoardTask) {
		e.preventDefault();
		const task = dragging;
		onDragEnd();
		if (!task || task.id === target.id || target.position === null) return;
		void sendReorder(task.id, target.position);
	}
</script>

<svelte:head>
	<title>{statusLabels[status]} · Board · Task Monitor</title>
</svelte:head>

<a href="/board{filterQuery(filter)}" class="btn btn-sm btn-outline-neutral mb-6 inline-flex items-center gap-1">
	<ArrowLeftIcon class="size-4" /> Board
</a>

<div class="mb-1 flex flex-wrap items-baseline gap-x-3">
	<h1 class="h3">{statusLabels[status]}</h1>
	<span class="badge preset-tonal">{tasks.length}</span>
</div>

<p class="mb-6 text-sm opacity-70">
	{#if reorderable}
		All tasks in this column. Drag a card onto another card, or use the ▲▼ arrows, to reorder.
	{:else if filtering && canReorder(data.user.role, status)}
		All tasks in this column that match the filter. Reordering is off while a filter is active.
	{:else}
		All tasks in this column.
	{/if}
</p>

<BoardFilterBar {filter} {creators} />

{#if form?.moveError}
	<div class="card preset-filled-error-500 mb-6 p-4 text-sm" role="alert">{form.moveError}</div>
{/if}

<form method="POST" action="?/reorder" bind:this={reorderForm} use:enhance class="hidden">
	<input type="hidden" name="id" value={reorderFields.id} />
	<input type="hidden" name="position" value={reorderFields.position} />
</form>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
	{#each tasks as task, i (task.id)}
		<TaskCard
			{task}
			dimmed={dragging?.id === task.id}
			draggable={reorderable}
			ondragstart={(e) => onDragStart(e, task)}
			ondragend={onDragEnd}
			ondragover={(e) => onDragOver(e, task)}
			ondragleave={() => overId === task.id && (overId = null)}
			ondrop={(e) => onDrop(e, task)}
			class={overId === task.id ? 'ring-primary-500 ring-2' : ''}
		>
			{#if reorderable && task.position !== null}
				{@const position = task.position}
				<div class="relative z-10 flex justify-end gap-1">
					<button
						type="button"
						class="btn-icon btn-icon-sm btn-outline-neutral"
						aria-label="Move up"
						disabled={i === 0}
						onclick={() => sendReorder(task.id, position - 1)}
					>
						<ArrowUpIcon class="size-4" />
					</button>
					<button
						type="button"
						class="btn-icon btn-icon-sm btn-outline-neutral"
						aria-label="Move down"
						disabled={i === tasks.length - 1}
						onclick={() => sendReorder(task.id, position + 1)}
					>
						<ArrowDownIcon class="size-4" />
					</button>
				</div>
			{/if}
		</TaskCard>
	{:else}
		<p class="py-4 text-sm opacity-50">Empty</p>
	{/each}
</div>
