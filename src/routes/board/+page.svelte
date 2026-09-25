<script lang="ts">
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import { ArrowDownIcon, ArrowUpIcon, BugIcon, PaperclipIcon, SparklesIcon } from '@lucide/svelte';
	import { canAdvance } from '$lib/roles';
	import { canReorder, statusLabels, statuses, transitions, type BoardTask, type Status } from '$lib/tasks';

	let { data, form } = $props();

	const tasks = $derived(data.tasks);
	const summary = $derived(data.summary);
	const role = $derived(data.user.role);
	const canDrag = $derived(canAdvance(role));

	const byStatus = (status: Status) => tasks.filter((t) => t.status === status);

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

	const isValidTarget = (task: BoardTask | null, to: Status) =>
		task !== null && transitions[task.status].includes(to);
	const isDraggable = (task: BoardTask) => canDrag && transitions[task.status].length > 0;

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
			noteError = 'Catatan wajib diisi kalau menolak task';
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

	const ageLabel = (days: number) => (days === 0 ? 'hari ini' : days === 1 ? 'kemarin' : `${days} hari lalu`);
</script>

<div class="mb-1 flex flex-wrap items-baseline justify-between gap-x-4">
	<h1 class="h3">Board task</h1>
</div>

<dl class="mb-4 grid grid-cols-3 gap-3 sm:max-w-xl">
	<div class="card preset-filled-surface-50-950 border-surface-300-700 border px-4 py-3">
		<dt class="text-xs opacity-70">Total task</dt>
		<dd class="text-xl font-semibold">{summary.total}</dd>
	</div>
	<div class="card preset-filled-surface-50-950 border-surface-300-700 border px-4 py-3">
		<dt class="text-xs opacity-70">Di queue</dt>
		<dd class="text-xl font-semibold">{summary.queue}</dd>
	</div>
	<div class="card preset-filled-surface-50-950 border-surface-300-700 border px-4 py-3">
		<dt class="text-xs opacity-70">Done 7 hari terakhir</dt>
		<dd class="text-xl font-semibold">{summary.doneLast7Days}</dd>
	</div>
</dl>

<p class="mb-6 text-sm opacity-70">
	{#if canDrag}
		Geser kartu ke kolom berikutnya buat ubah status. Cuma bisa maju: Request → Queue → In progress →
		Ready to test → Done, atau Request → Rejected. Panah ▲▼ di kartu buat ngatur urutan.
	{:else}
		Role marketing bisa liat board, bikin task, dan ngatur urutan di kolom Request, tapi gak bisa ubah
		status.
	{/if}
</p>

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

<div class="mb-4 flex gap-1 overflow-x-auto xs:hidden" role="tablist" aria-label="Kolom status">
	{#each statuses as status (status)}
		<button
			type="button"
			role="tab"
			aria-selected={activeTab === status}
			class="btn btn-sm whitespace-nowrap {activeTab === status ? 'preset-filled-primary-500' : 'btn-outline-neutral'}"
			onclick={() => (activeTab = status)}
		>
			{statusLabels[status]} ({byStatus(status).length})
		</button>
	{/each}
</div>

<div class="grid grid-cols-1 gap-4 xs:grid-cols-2 xl:grid-cols-6">
	{#each statuses as status (status)}
		{@const items = byStatus(status)}
		{@const valid = isValidTarget(dragging, status)}
		<section
			role="group"
			aria-label="Kolom {statusLabels[status]}"
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

			{#each items as task, i (task.id)}
				<article
					draggable={isDraggable(task)}
					ondragstart={(e) => onDragStart(e, task)}
					ondragend={onDragEnd}
					class="card preset-filled-surface-50-950 border-surface-300-700 hover:border-primary-500 relative flex cursor-pointer flex-col gap-3 border p-4 shadow-xl transition duration-150 hover:-translate-y-1 hover:shadow-2xl {dragging?.id ===
					task.id
						? 'opacity-40'
						: ''}"
				>
					<div class="flex items-center gap-2 text-xs">
						{#if task.position !== null}
							<span class="badge preset-tonal" title="Nomor urut di kolom">#{task.position}</span>
						{/if}
						{#if task.type === 'bug'}
							<span class="badge preset-filled-error-500"><BugIcon class="size-3" /> bug</span>
						{:else}
							<span class="badge preset-filled-primary-500"
								><SparklesIcon class="size-3" /> feature</span
							>
						{/if}
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
							<span class="flex items-center gap-1"
								><PaperclipIcon class="size-3" />{task.attachments}</span
							>
						{/if}
					</footer>

					{#if canReorder(role, status)}
						<div class="relative z-10 flex justify-end gap-1">
							<button
								type="button"
								class="btn-icon btn-icon-sm btn-outline-neutral"
								aria-label="Naikkan urutan"
								disabled={i === 0}
								onclick={() => sendReorder(task, -1)}
							>
								<ArrowUpIcon class="size-4" />
							</button>
							<button
								type="button"
								class="btn-icon btn-icon-sm btn-outline-neutral"
								aria-label="Turunkan urutan"
								disabled={i === items.length - 1}
								onclick={() => sendReorder(task, 1)}
							>
								<ArrowDownIcon class="size-4" />
							</button>
						</div>
					{/if}
				</article>
			{:else}
				<p class="py-4 text-center text-sm opacity-50">Kosong</p>
			{/each}
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
			<h2 class="h4">Pindah ke {statusLabels[pending.to]}</h2>
			<p class="text-sm opacity-70">{pending.task.title}</p>
			<label class="label">
				<span class="label-text font-semibold">
					{pending.to === 'rejected' ? 'Alasan (wajib)' : 'Catatan / link hasil (opsional)'}
				</span>
				<textarea class="textarea" rows="3" bind:value={note}></textarea>
				{#if noteError}<span class="text-error-500 text-sm">{noteError}</span>{/if}
			</label>
			<div class="flex justify-end gap-2">
				<button type="button" class="btn btn-outline-neutral" onclick={cancelDialog}>Batal</button>
				<button type="submit" class="btn btn-outline-primary">Simpan</button>
			</div>
		</form>
	{/if}
</dialog>
