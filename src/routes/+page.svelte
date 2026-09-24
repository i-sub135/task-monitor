<script lang="ts">
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import { BugIcon, SparklesIcon, PaperclipIcon } from '@lucide/svelte';
	import { statusLabels, transitions, type MockTask, type Status } from '$lib/mock/tasks';
	import { canAdvance, type MockUser } from '$lib/mock/session';

	// Tipe ditulis manual: TS 7 gak punya JS API, jadi SvelteKit gak bisa nurunin tipe `data` dari load.
	let {
		data,
		form
	}: {
		data: { tasks: MockTask[]; user: MockUser };
		form?: { moveError?: string; moved?: boolean } | null;
	} = $props();

	const tasks = $derived(data.tasks);
	const columns = Object.keys(statusLabels) as Status[];
	const canDrag = $derived(canAdvance(data.user.role));

	let dragging = $state<MockTask | null>(null);
	let overColumn = $state<Status | null>(null);

	// Form tersembunyi yang beneran ngirim ke action ?/move.
	let moveForm = $state<HTMLFormElement>();
	let moveFields = $state({ id: '', to: '', note: '' });

	// Dialog catatan: wajib buat reject, opsional buat done (link hasil).
	let dialog = $state<HTMLDialogElement>();
	let pending = $state<{ task: MockTask; to: Status } | null>(null);
	let note = $state('');
	let noteError = $state('');

	const isValidTarget = (task: MockTask | null, to: Status) =>
		task !== null && transitions[task.status].includes(to);
	const isDraggable = (task: MockTask) => canDrag && transitions[task.status].length > 0;

	function onDragStart(e: DragEvent, task: MockTask) {
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
			void send(task.id, col, '');
		}
	}

	async function send(id: string, to: Status, noteText: string) {
		moveFields = { id, to, note: noteText };
		await tick();
		moveForm?.requestSubmit();
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
		void send(task.id, to, note.trim());
	}

	function cancelDialog() {
		dialog?.close();
		pending = null;
	}
</script>

<div class="mb-1 flex flex-wrap items-baseline justify-between gap-x-4">
	<h1 class="h3">Board task</h1>
	<p class="text-sm opacity-70">{tasks.length} task (data mock)</p>
</div>

<p class="mb-6 text-sm opacity-70">
	{#if canDrag}
		Geser kartu ke kolom berikutnya buat ubah status. Cuma bisa maju: Request → Queue → In progress →
		Ready to test → Done, atau Request → Rejected.
	{:else}
		Role marketing bisa liat board dan bikin task, tapi gak bisa ubah status.
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

<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
	{#each columns as status (status)}
		{@const items = tasks.filter((t) => t.status === status)}
		{@const valid = isValidTarget(dragging, status)}
		<section
			role="group"
			aria-label="Kolom {statusLabels[status]}"
			class="card preset-filled-surface-100-900 flex min-h-32 flex-col gap-4 p-4 transition {dragging
				? valid
					? 'ring-primary-500 ring-2'
					: 'opacity-50'
				: ''} {overColumn === status ? 'bg-primary-100-900' : ''}"
			ondragover={(e) => onDragOver(e, status)}
			ondragleave={(e) => onDragLeave(e, status)}
			ondrop={(e) => onDrop(e, status)}
		>
			<header class="flex items-center justify-between">
				<h2 class="font-semibold">{statusLabels[status]}</h2>
				<span class="badge preset-tonal">{items.length}</span>
			</header>

			{#each items as task (task.id)}
				<a
					href="/task/{task.id}"
					draggable={isDraggable(task)}
					ondragstart={(e) => onDragStart(e, task)}
					ondragend={onDragEnd}
					class="card preset-filled-surface-50-950 border-surface-300-700 hover:border-primary-500 focus-visible:outline-primary-500 flex cursor-pointer flex-col gap-3 border p-4 shadow-xl transition duration-150 hover:-translate-y-1 hover:shadow-2xl focus-visible:outline-2 {isDraggable(
						task
					)
						? 'active:cursor-grabbing'
						: ''} {dragging?.id === task.id ? 'opacity-40' : ''}"
				>
					<div class="flex items-center gap-2 text-xs">
						{#if task.type === 'bug'}
							<span class="badge preset-filled-error-500"><BugIcon class="size-3" /> bug</span>
						{:else}
							<span class="badge preset-filled-primary-500"
								><SparklesIcon class="size-3" /> feature</span
							>
						{/if}
					</div>
					<p class="font-medium">{task.title}</p>
					<footer class="flex items-center justify-between text-xs opacity-70">
						<span>oleh {task.createdBy}</span>
						{#if task.attachments.length > 0}
							<span class="flex items-center gap-1"
								><PaperclipIcon class="size-3" />{task.attachments.length}</span
							>
						{/if}
					</footer>
				</a>
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
				<button type="button" class="btn hover:preset-tonal" onclick={cancelDialog}>Batal</button>
				<button type="submit" class="btn preset-filled-primary-500">Simpan</button>
			</div>
		</form>
	{/if}
</dialog>
