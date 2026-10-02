<script lang="ts">
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { ArrowDownIcon, ArrowUpIcon, ArrowRightIcon } from '@lucide/svelte';
	import { canAdvance } from '$lib/roles';
	import {
		BOARD_COLUMN_LIMIT,
		allowedTargets,
		boardColumns,
		canMakeTransition,
		canReorder,
		columnOf,
		statusLabels,
		type BoardTask,
		type Status
	} from '$lib/tasks';
	import TaskCard from '$lib/components/TaskCard.svelte';
	import BoardFilterBar from '$lib/components/BoardFilterBar.svelte';
	import { applyBoardFilter, creatorOptions, filterQuery, isFilterActive, parseBoardFilter } from '$lib/board-filter';

	let { data, form } = $props();

	const role = $derived(data.user.role);
	const canDrag = $derived(canAdvance(role));

	// TM-16: filter dari URL, disaring di sini (data board udah lengkap di halaman, gak perlu load ulang).
	// Batas 5 kartu dan angka di header kolom ngitung dari hasil filter.
	const filter = $derived(parseBoardFilter(page.url.searchParams));
	const filtering = $derived(isFilterActive(filter));
	const creators = $derived(creatorOptions(data.tasks));
	const tasks = $derived(applyBoardFilter(data.tasks, filter));

	// TM-15: kolom board, bukan status mentah (done-live tampil di kolom Done).
	const byStatus = (column: Status) => tasks.filter((t) => columnOf(t.status) === column);

	// Label pendek buat tab di HP (satu baris, 6 segmen). Nama lengkap tetap di aria-label dan tooltip.
	const tabLabels: Record<Status, string> = {
		request: 'Request',
		queue: 'Queue',
		'in-progress': 'Progress',
		'ready-to-test': 'Test',
		done: 'Done',
		'done-live': 'Live',
		rejected: 'Reject'
	};

	// HP: kolom ditampilin satu-satu lewat tab. Desktop: semua kolom sejajar.
	let activeTab = $state<Status>('request');

	let dragging = $state<BoardTask | null>(null);
	let overColumn = $state<Status | null>(null);

	// Dua form tersembunyi yang beneran ngirim ke action ?/move dan ?/reorder.
	let moveForm = $state<HTMLFormElement>();
	let moveFields = $state({ id: '', to: '', note: '' });
	let reorderForm = $state<HTMLFormElement>();
	let reorderFields = $state({ id: '', position: '' });

	// Dialog catatan: wajib buat reject, opsional buat done (link hasil).
	let dialog = $state<HTMLDialogElement>();
	let pending = $state<{ task: BoardTask; to: Status } | null>(null);
	let note = $state('');
	let noteError = $state('');

	// TM-14: target ikut hak role (mis. Ready to test → Done cuma QA + admin), bukan cuma urutan status.
	// Drag cuma buat pindah kolom; done ↔ done-live (satu kolom) lewat tombol Mark live / Unmark di kartu.
	const isValidTarget = (task: BoardTask | null, to: Status) =>
		task !== null && columnOf(task.status) !== to && canMakeTransition(role, task.status, to);
	const isDraggable = (task: BoardTask) =>
		canDrag && allowedTargets(role, task.status).some((to) => columnOf(to) !== columnOf(task.status));

	// TM-15: target tombol live di kolom Done (null = gak ada tombol buat role/kartu ini).
	const liveTarget = (task: BoardTask): Status | null => {
		const to = task.status === 'done' ? 'done-live' : task.status === 'done-live' ? 'done' : null;
		return to && canMakeTransition(role, task.status, to) ? to : null;
	};
	function openLiveDialog(task: BoardTask, to: Status) {
		pending = { task, to };
		note = '';
		noteError = '';
		dialog?.showModal();
	}
	const dialogTitle = (p: { task: BoardTask; to: Status }) =>
		p.to === 'done-live' ? 'Mark as live' : p.task.status === 'done-live' ? 'Unmark live' : `Move to ${statusLabels[p.to]}`;
	const dialogNoteLabel = (to: Status) =>
		to === 'rejected'
			? 'Reason (required)'
			: to === 'done-live'
				? 'Release note / version (optional)'
				: 'Note / result link (optional)';

	function onDragStart(e: DragEvent, task: BoardTask) {
		if (!isDraggable(task)) {
			e.preventDefault();
			return;
		}
		dragging = task;
		e.dataTransfer?.setData('text/plain', task.id);
		if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
	}

	function onDragEnd() {
		dragging = null;
		overColumn = null;
	}

	function onDragOver(e: DragEvent, col: Status) {
		if (!isValidTarget(dragging, col)) return;
		e.preventDefault();
		overColumn = col;
	}

	function onDragLeave(e: DragEvent, col: Status) {
		if ((e.currentTarget as HTMLElement).contains(e.relatedTarget as Node | null)) return;
		if (overColumn === col) overColumn = null;
	}

	function onDrop(e: DragEvent, col: Status) {
		e.preventDefault();
		const task = dragging;
		onDragEnd();
		if (!task || !isValidTarget(task, col)) return;

		if (col === 'rejected' || col === 'done') {
			pending = { task, to: col };
			note = '';
			noteError = '';
			dialog?.showModal();
		} else {
			void sendMove(task.id, col, '');
		}
	}

	async function sendMove(id: string, to: Status, noteText: string) {
		moveFields = { id, to, note: noteText };
		await tick();
		moveForm?.requestSubmit();
	}

	async function sendReorder(task: BoardTask, delta: -1 | 1) {
		if (task.position === null) return;
		reorderFields = { id: task.id, position: String(task.position + delta) };
		await tick();
		reorderForm?.requestSubmit();
	}

	function confirmDialog(e: SubmitEvent) {
		e.preventDefault();
		if (!pending) return;
		if (pending.to === 'rejected' && !note.trim()) {
			noteError = 'A reason is required to reject a task';
			return;
		}
		const { task, to } = pending;
		dialog?.close();
		pending = null;
		void sendMove(task.id, to, note.trim());
	}

	function cancelDialog() {
		dialog?.close();
		pending = null;
	}
</script>

<svelte:head>
	<title>Board · Task Monitor</title>
</svelte:head>

<div class="mb-1 flex flex-wrap items-baseline justify-between gap-x-4">
	<h1 class="h3">Task board</h1>
</div>

<p class="mb-6 text-sm opacity-70">
	{#if canDrag}
		Drag a card to the next column to change its status. Moves only go forward: Request → Queue → In progress → Ready to test → Done, or Request → Rejected. Only QA and admin can move Ready to test → Done. {filtering
			? 'Reordering is off while a filter is active.'
			: 'Use the ▲▼ arrows on a card to reorder.'}
	{:else}
		The marketing role can view the board, create tasks and reorder the Request column, but cannot change status.{filtering
			? ' Reordering is off while a filter is active.'
			: ''}
	{/if}
</p>

<BoardFilterBar {filter} {creators} />

{#if form?.moveError}
	<div class="card preset-filled-error-500 mb-6 p-4 text-sm" role="alert">{form.moveError}</div>
{/if}

<form method="POST" action="?/move" bind:this={moveForm} use:enhance class="hidden">
	<input type="hidden" name="id" value={moveFields.id} />
	<input type="hidden" name="to" value={moveFields.to} />
	<input type="hidden" name="note" value={moveFields.note} />
</form>
<form method="POST" action="?/reorder" bind:this={reorderForm} use:enhance class="hidden">
	<input type="hidden" name="id" value={reorderFields.id} />
	<input type="hidden" name="position" value={reorderFields.position} />
</form>

<!-- HP: 6 tab status jadi satu button group satu baris (segmen menyambung). Label dipendekin biar muat di 1/6 lebar. -->
<div class="mb-4 flex xs:hidden" role="tablist" aria-label="Status columns">
	{#each boardColumns as status (status)}
		<button
			type="button"
			role="tab"
			aria-selected={activeTab === status}
			aria-label={statusLabels[status]}
			title={statusLabels[status]}
			data-tab-status={status}
			class="btn relative min-h-10 min-w-0 flex-1 rounded-none! px-1 text-[11px] leading-tight -ml-px first:ml-0 first:rounded-s-full! last:rounded-e-full! aria-selected:z-10 {activeTab ===
			status
				? 'preset-filled-primary-500'
				: 'btn-outline-neutral'}"
			onclick={() => (activeTab = status)}
		>
			{tabLabels[status]}
		</button>
	{/each}
</div>

<div class="grid grid-cols-1 gap-4 xs:grid-cols-2 xl:grid-cols-6">
	{#each boardColumns as status (status)}
		{@const items = byStatus(status)}
		{@const valid = isValidTarget(dragging, status)}
		<section
			role="group"
			aria-label="Column {statusLabels[status]}"
			data-status={status}
			class="card preset-filled-surface-100-900 min-h-32 flex-col gap-4 p-4 transition {activeTab === status
				? 'flex'
				: 'hidden'} xs:flex {dragging ? (valid ? 'ring-primary-500 ring-2' : 'opacity-50') : ''} {overColumn ===
			status
				? 'bg-primary-100-900'
				: ''}"
			ondragover={(e) => onDragOver(e, status)}
			ondragleave={(e) => onDragLeave(e, status)}
			ondrop={(e) => onDrop(e, status)}
		>
			<header class="flex items-center justify-between">
				<h2 class="font-semibold">{statusLabels[status]}</h2>
				<span class="badge preset-tonal">{items.length}</span>
			</header>

			{#each items.slice(0, BOARD_COLUMN_LIMIT) as task, i (task.id)}
				<TaskCard
					{task}
					dimmed={dragging?.id === task.id}
					draggable={isDraggable(task)}
					ondragstart={(e) => onDragStart(e, task)}
					ondragend={onDragEnd}
				>
					<!-- TM-16: posisi itu urutan kolom penuh; pas filter aktif ada kartu yang ketutup, jadi ▲▼ dimatiin. -->
					{#if canReorder(role, status) && !filtering}
						<div class="relative z-10 flex justify-end gap-1">
							<button
								type="button"
								class="btn-icon btn-icon-sm btn-outline-neutral"
								aria-label="Move up"
								disabled={i === 0}
								onclick={() => sendReorder(task, -1)}
							>
								<ArrowUpIcon class="size-4" />
							</button>
							<button
								type="button"
								class="btn-icon btn-icon-sm btn-outline-neutral"
								aria-label="Move down"
								disabled={i === items.length - 1}
								onclick={() => sendReorder(task, 1)}
							>
								<ArrowDownIcon class="size-4" />
							</button>
						</div>
					{/if}
					{@const live = liveTarget(task)}
					{#if live}
						<!-- Bulet kecil: ijo tua = mark live, merah = unmark (warna eksplisit: success tema rosepine itu biru pucat, dan kartu Done udah ijo terang). Label di tooltip + aria-label. -->
						<div class="relative z-10 flex justify-end">
							<button
								type="button"
								class="size-4 cursor-pointer rounded-full shadow ring-2 ring-white transition hover:scale-125"
								style="background-color: {live === 'done-live' ? '#1f7a3a' : '#e73f1e'}"
								aria-label={live === 'done-live' ? 'Mark as live' : 'Unmark live'}
								title={live === 'done-live' ? 'Mark as live' : 'Unmark live'}
								onclick={() => openLiveDialog(task, live)}
							></button>
						</div>
					{/if}
				</TaskCard>
			{:else}
				<p class="py-4 text-center text-sm opacity-50">Empty</p>
			{/each}

			{#if items.length > BOARD_COLUMN_LIMIT}
				<a
					href="/board/list/{status}{filterQuery(filter)}"
					class="btn btn-sm btn-outline-neutral inline-flex items-center justify-center gap-1"
				>
					Read more ({items.length - BOARD_COLUMN_LIMIT} more) <ArrowRightIcon class="size-4" />
				</a>
			{/if}
		</section>
	{/each}
</div>

<dialog
	bind:this={dialog}
	onclose={() => (pending = null)}
	class="card preset-filled-surface-50-950 border-surface-300-700 m-auto w-full max-w-md border p-6 shadow-2xl backdrop:bg-black/40"
>
	{#if pending}
		<form onsubmit={confirmDialog} class="form-comfy flex flex-col gap-4">
			<h2 class="h4">{dialogTitle(pending)}</h2>
			<p class="text-sm opacity-70">{pending.task.title}</p>
			<label class="label">
				<span class="label-text font-semibold">
					{dialogNoteLabel(pending.to)}
				</span>
				<textarea class="textarea" rows="3" bind:value={note}></textarea>
				{#if noteError}<span class="text-error-500 text-sm">{noteError}</span>{/if}
			</label>
			<div class="flex justify-end gap-2">
				<button type="button" class="btn btn-outline-neutral" onclick={cancelDialog}>Cancel</button>
				<button type="submit" class="btn btn-outline-primary">Save</button>
			</div>
		</form>
	{/if}
</dialog>
