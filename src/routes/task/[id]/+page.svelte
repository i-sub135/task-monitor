<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		ArrowLeftIcon,
		FileTextIcon,
		ZoomInIcon,
		ZoomOutIcon,
		DownloadIcon,
		XIcon,
		CheckIcon,
		LinkIcon,
		PencilIcon,
		PlusIcon,
		RotateCcwIcon,
		SendIcon,
		Trash2Icon
	} from '@lucide/svelte';
	import { Dialog, Portal } from '@skeletonlabs/skeleton-svelte';
	import { copyText } from '$lib/utils/clipboard';
	import { canAdvance } from '$lib/utils/roles';
	import {
		allowedTargets,
		canComment,
		canEditAttachments,
		canEditTask,
		platformLabels,
		platforms,
		statusLabels,
		taskTypes,
		type EditField,
		type Platform,
		type Status
	} from '$lib/utils/tasks';
	import { linkify } from '$lib/utils/linkify';
	import RichTextEditor from '$lib/components/RichTextEditor.svelte';
	import { platformIcons, platformColors } from '$lib/utils/platform-icons';
	import { typeFilledClass, typeIcons } from '$lib/utils/type-styles';
	import type { AttachmentInfo } from '$lib/utils/tasks';

	let { data, form } = $props();
	const task = $derived(data.task);
	// TM-14: cuma target yang boleh buat role ini (mis. developer gak dapet tombol ke Done).
	const nextStatuses = $derived(data.user ? allowedTargets(data.user.role, task.status, task.type) : []);
	const TypeIcon = $derived(typeIcons[task.type]);
	const canMove = $derived(data.user ? canAdvance(data.user.role) : false);
	// TM-11/TM-12: siapa pun yang login boleh edit title/description/type/platform, selama status Request/Queue.
	const canEdit = $derived(Boolean(data.user) && canEditTask(task.status));
	// TM-22: lampiran boleh ditambah/dihapus siapa pun yang login, sampai sebelum Done.
	const canEditFiles = $derived(Boolean(data.user) && canEditAttachments(task.status));
	// TM-15: kapan terakhir ditandai live (history terakhir yang masuk ke done-live).
	const liveSince = $derived(
		task.status === 'done-live' ? (task.history.findLast((h) => h.to === 'done-live')?.at ?? null) : null
	);
	// TM-15: Live → Done di history ditulis sebagai rollback deploy gagal, bukan "Live → Done".
	const historyLabel = (from: Status | null, to: Status) =>
		from === 'done-live' && to === 'done'
			? 'Rollback: failed deploy'
			: `${from ? `${statusLabels[from]} → ` : ''}${statusLabels[to]}`;
	// Warna garis kiri entri history: status history per status tujuan (rollback oranye sendiri),
	// edit history per field. Dua palet gak saling pakai warna yang sama.
	const statusBorder: Record<Status, string> = {
		request: '#94a3b8',
		queue: '#578ef5',
		'in-progress': '#14b8a6',
		'ready-to-test': '#eab308',
		done: '#16a34a',
		'done-live': '#2d7495',
		rejected: '#dc2626'
	};
	const historyBorder = (from: Status | null, to: Status) =>
		from === 'done-live' && to === 'done' ? '#f97316' : statusBorder[to];
	const editBorder: Record<EditField, string> = {
		title: '#7c3aed',
		description: '#db2777',
		type: '#a16207',
		platform: '#78716c',
		recreate: '#0e7490',
		attachment_add: '#65a30d',
		attachment_remove: '#e11d48'
	};
	const editLabels: Record<EditField, string> = {
		title: 'Title edited',
		description: 'Description edited',
		type: 'Type edited',
		platform: 'Platform edited',
		recreate: 'Recreated from a rejected task',
		attachment_add: 'Attachment added',
		attachment_remove: 'Attachment removed'
	};
	// Salin link task ini (URL lengkap), sama kayak tombol rantai di kartu board.
	let linkCopied = $state(false);
	const copyTaskLink = async () => {
		if ((await copyText(`${location.origin}/task/${task.id}`)) !== 'copied') return;
		linkCopied = true;
		setTimeout(() => (linkCopied = false), 1500);
	};
	let editingTitle = $state(false);
	let editingDescription = $state(false);
	let editingType = $state(false);
	let editingPlatform = $state(false);
	/** Ganti `autofocus` (dilarang lint a11y): fokus pas element ini pertama kali dipasang ke DOM. */
	const focusOnMount = (node: HTMLElement) => {
		node.focus();
	};

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
	// TM-15: done ↔ done-live dapet label sendiri (Mark as live / Unmark live), bukan "Move to".
	const tabLabel = (to: Status) =>
		to === 'rejected'
			? 'Reject'
			: to === 'done-live'
				? 'Mark as live'
				: task.status === 'done-live' && to === 'done'
					? 'Unmark live'
					: `Move to ${statusLabels[to]}`;
	const noteLabel = (to: Status) =>
		to === 'rejected'
			? 'Reason (required)'
			: to === 'done-live'
				? 'Release note / version (optional)'
				: to === 'done'
					? 'Note / result link (optional)'
					: 'Note (optional)';
	const openMove = () => {
		moveTarget = nextStatuses[0];
		moveOpen = true;
	};

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

	const openViewer = (file: AttachmentInfo) => {
		zoomIndex = 0;
		viewing = file;
	};
	const zoomIn = () => (zoomIndex = Math.min(zoomIndex + 1, ZOOM_STEPS.length - 1));
	const zoomOut = () => (zoomIndex = Math.max(zoomIndex - 1, 0));
	// Klik dua kali di gambar: balik ke pas layar, atau zoom 2x.
	const toggleZoom = () => (zoomIndex = zoomIndex === 0 ? 2 : 0);

	// TM-22: tambah lampiran. Pilih file = langsung upload. Jumlah/ukuran dicek dulu di browser biar gak nunggu
	// upload cuma buat ditolak; server tetep ngecek ulang semuanya.
	let uploading = $state(false);
	let fileError = $state('');
	const onPickFiles = (e: Event) => {
		const input = e.currentTarget as HTMLInputElement;
		const files = [...(input.files ?? [])];
		fileError = '';
		if (files.length === 0) return;
		const tooBig = files.find((f) => f.size > data.maxFileBytes);
		if (files.length > data.maxFiles) fileError = `Upload at most ${data.maxFiles} files at a time`;
		else if (tooBig) fileError = `"${tooBig.name}" is larger than ${sizeLabel(data.maxFileBytes)}`;
		if (fileError) {
			input.value = '';
			return;
		}
		input.form?.requestSubmit();
	};
	// Konfirmasi hapus (lampiran TM-22, komentar TM-23): satu Dialog bawaan Skeleton, bukan confirm() browser.
	type PendingDelete = { action: string; field: string; id: string; title: string; name: string; message: string };
	let pendingDelete = $state<PendingDelete | null>(null);
	const askRemoveAttachment = (file: AttachmentInfo) =>
		(pendingDelete = {
			action: '?/removeAttachment',
			field: 'attachment_id',
			id: file.id,
			title: 'Remove attachment?',
			name: file.name,
			message: 'will be removed from this task. It stays viewable from the Edit history.'
		});
	const askDeleteComment = (id: string) =>
		(pendingDelete = {
			action: '?/deleteComment',
			field: 'comment_id',
			id,
			title: 'Delete comment?',
			name: '',
			message: 'This comment and its edit history will be permanently deleted.'
		});

	// TM-23: komentar. Siapa pun yang login boleh nulis/edit/hapus, kecuali task udah Live atau Rejected.
	const canWriteComments = $derived(Boolean(data.user) && canComment(task.status));
	// Ganti key = editor komentar baru dipasang ulang (kosong lagi) habis komentar kekirim.
	let commentFormKey = $state(0);
	let editingComment = $state<string | null>(null);
	let openCommentEdits = $state<string[]>([]);
	const toggleCommentEdits = (id: string) =>
		(openCommentEdits = openCommentEdits.includes(id)
			? openCommentEdits.filter((x) => x !== id)
			: [...openCommentEdits, id]);

	const sizeLabel = (bytes: number) =>
		bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
</script>

<svelte:head>
	<title>{task.title} · Task Monitor</title>
</svelte:head>

<a href="/board" class="btn btn-sm btn-outline-neutral mb-6 inline-flex items-center gap-1">
	<ArrowLeftIcon class="size-4" /> Board
</a>

<div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-[2fr_1fr]">
	<article class="card preset-filled-surface-50-950 border-surface-300-700 flex flex-col gap-6 border p-6 shadow-xl">
		<div class="flex flex-wrap items-center gap-2 text-xs">
			{#if editingType}
				<!-- TM-19: support cuma boleh dipilih kalau task masih di Request (server juga ngecek). -->
				{#each taskTypes.filter((t) => t !== 'support' || task.status === 'request' || task.type === 'support') as t (t)}
					{@const Icon = typeIcons[t]}
					<form
						method="POST"
						action="?/updateType"
						use:enhance={() =>
							async ({ result, update }) => {
								await update();
								if (result.type === 'success') editingType = false;
							}}
					>
						<input type="hidden" name="type" value={t} />
						<button type="submit" class="badge {typeFilledClass[t]} cursor-pointer"><Icon class="size-3" /> {t}</button>
					</form>
				{/each}
				<button type="button" class="badge preset-tonal" onclick={() => (editingType = false)}>Cancel</button>
			{:else if canEdit}
				<button
					type="button"
					class="badge cursor-pointer {typeFilledClass[task.type]}"
					title="Click to change"
					onclick={() => (editingType = true)}
				>
					<TypeIcon class="size-3" /> {task.type}
				</button>
			{:else}
				<span class="badge {typeFilledClass[task.type]}"><TypeIcon class="size-3" /> {task.type}</span>
			{/if}

			{#if editingPlatform}
				{#each platforms as p (p)}
					{@const Icon = platformIcons[p]}
					{@const pc = platformColors[p]}
					<form
						method="POST"
						action="?/updatePlatform"
						use:enhance={() =>
							async ({ result, update }) => {
								await update();
								if (result.type === 'success') editingPlatform = false;
							}}
					>
						<input type="hidden" name="platform" value={p} />
						<button
							type="submit"
							class="badge cursor-pointer"
							style="background-color: {pc.bg}; color: {pc.fg}"><Icon class="size-3" /> {platformLabels[p]}</button
						>
					</form>
				{/each}
				<button type="button" class="badge preset-tonal" onclick={() => (editingPlatform = false)}>Cancel</button>
			{:else if canEdit}
				{@const Icon = platformIcons[task.platform]}
				{@const pc = platformColors[task.platform]}
				<button
					type="button"
					class="badge cursor-pointer"
					style="background-color: {pc.bg}; color: {pc.fg}"
					title="Click to change"
					onclick={() => (editingPlatform = true)}
				>
					<Icon class="size-3" />
					{platformLabels[task.platform]}
				</button>
			{:else}
				{@const Icon = platformIcons[task.platform]}
				{@const pc = platformColors[task.platform]}
				<span class="badge" style="background-color: {pc.bg}; color: {pc.fg}"
					><Icon class="size-3" /> {platformLabels[task.platform]}</span
				>
			{/if}

			<span class="badge preset-tonal">{statusLabels[task.status]}</span>

			<button
				type="button"
				class="badge preset-tonal ml-auto cursor-pointer transition hover:brightness-90"
				title="Copy link to this task"
				onclick={copyTaskLink}
			>
				{#if linkCopied}<CheckIcon class="size-3" /> Link copied{:else}<LinkIcon class="size-3" /> Copy link{/if}
			</button>
		</div>
		{#if task.status === 'done-live'}
			<div class="flex items-center gap-4">
				<span class="live-stamp inline-block -rotate-6" style="opacity: 0.85" aria-hidden="true">Live</span>
				{#if liveSince}<span class="text-sm opacity-70">Live since {liveSince}</span>{/if}
			</div>
		{/if}
		{#if form?.editError && (editingType || editingPlatform)}
			<div class="card preset-filled-error-500 p-3 text-sm" role="alert">{form.editError}</div>
		{/if}

		{#if editingTitle}
			<form
				method="POST"
				action="?/updateTitle"
				use:enhance={() =>
					async ({ result, update }) => {
						await update();
						if (result.type === 'success') editingTitle = false;
					}}
				class="flex flex-wrap items-center gap-2"
			>
				<input
					class="input h3 min-w-0 flex-1"
					name="title"
					value={task.title}
					maxlength="120"
					required
					use:focusOnMount
				/>
				<button type="submit" class="btn btn-sm btn-outline-primary">Save</button>
				<button type="button" class="btn btn-sm btn-outline-neutral" onclick={() => (editingTitle = false)}
					>Cancel</button
				>
			</form>
		{:else}
			<h1 class="h3">
				{#if canEdit}
					<button
						type="button"
						class="cursor-text text-left decoration-dashed underline-offset-4 hover:underline"
						title="Click to edit"
						onclick={() => (editingTitle = true)}
					>
						{task.title}
					</button>
				{:else}
					{task.title}
				{/if}
			</h1>
		{/if}
		{#if form?.editError && editingTitle}
			<div class="card preset-filled-error-500 p-3 text-sm" role="alert">{form.editError}</div>
		{/if}
		<p class="text-sm opacity-70">by {task.createdBy} · {task.createdAt}</p>
		<!-- TM-21: rantai recreate (task Rejected → task baru). -->
		{#if task.recreatedFrom}
			<p class="text-sm">
				<span class="opacity-70">Recreated from</span>
				<a href="/task/{task.recreatedFrom.id}" class="anchor">{task.recreatedFrom.title}</a>
			</p>
		{/if}
		{#if task.recreatedAs}
			<p class="text-sm">
				<span class="opacity-70">Recreated as</span>
				<a href="/task/{task.recreatedAs.id}" class="anchor">{task.recreatedAs.title}</a>
			</p>
		{/if}

		<section>
			<h2 class="mb-2 font-semibold">Description</h2>
			{#if editingDescription}
				<form
					method="POST"
					action="?/updateDescription"
					use:enhance={() =>
						async ({ result, update }) => {
							await update();
							if (result.type === 'success') editingDescription = false;
						}}
					class="flex flex-col gap-3"
				>
					<RichTextEditor
						name="description"
						value={task.descriptionHtml}
						required
						placeholder="Describe the details: what happened, where, how often"
						invalid={Boolean(form?.editError)}
					/>
					{#if form?.editError}
						<div class="card preset-filled-error-500 p-3 text-sm" role="alert">{form.editError}</div>
					{/if}
					<div class="flex justify-end gap-3">
						<button
							type="button"
							class="btn btn-sm btn-outline-neutral"
							onclick={() => (editingDescription = false)}>Cancel</button
						>
						<button type="submit" class="btn btn-sm btn-outline-primary">Save</button>
					</div>
				</form>
			{:else if canEdit}
				<!-- Klik buat edit: sengaja bukan <label>, biar gak kena bug forwarding klik yang sama kayak TM-10. -->
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
				<div
					class="rich-text rounded-container -m-2 cursor-pointer p-2 transition hover:bg-surface-100-900"
					role="button"
					tabindex="0"
					title="Click to edit"
					onclick={() => (editingDescription = true)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							editingDescription = true;
						}
					}}
				>
					<!-- TM-10: task.descriptionHtml sudah disaring server (getTaskDetail -> renderDescriptionHtml),
					     nol markup mentah dari user yang nyampe ke sini. Sama sumbernya dengan {@html} di bawah
					     (dua cabang if/else yang gak pernah render bareng), bukan input mentah baru. -->
					{@html task.descriptionHtml}
				</div>
			{:else}
				<div class="rich-text">{@html task.descriptionHtml}</div>
			{/if}
		</section>

		<section>
			<div class="mb-3 flex flex-wrap items-center gap-2">
				<h2 class="font-semibold">Attachments ({task.attachments.length})</h2>
				{#if canEditFiles}
					<form
						method="POST"
						action="?/addAttachments"
						enctype="multipart/form-data"
						class="ml-auto"
						use:enhance={() => {
							uploading = true;
							return async ({ update }) => {
								await update();
								uploading = false;
							};
						}}
					>
						<label class="btn btn-sm btn-outline-primary cursor-pointer {uploading ? 'pointer-events-none opacity-60' : ''}">
							<PlusIcon class="size-4" />
							{uploading ? 'Uploading…' : 'Add files'}
							<input
								type="file"
								name="attachments"
								multiple
								accept="image/png,image/jpeg,image/gif,image/webp,application/pdf"
								class="sr-only"
								disabled={uploading}
								onchange={onPickFiles}
							/>
						</label>
					</form>
				{/if}
			</div>
			{#if fileError || form?.attachmentError}
				<div class="card preset-filled-error-500 mb-3 p-3 text-sm" role="alert">{fileError || form?.attachmentError}</div>
			{/if}
			{#if task.attachments.length > 0}
				<ul class="grid grid-cols-2 gap-4 sm:grid-cols-3">
					{#each task.attachments as file (file.id)}
						<li class="relative flex flex-col gap-1">
							<button
								type="button"
								onclick={() => openViewer(file)}
								aria-label="View {file.name}"
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
							{#if canEditFiles}
								<button
									type="button"
									class="btn-icon btn-icon-sm preset-filled-error-500 absolute top-1.5 right-1.5 size-7 shadow-md"
									aria-label="Remove {file.name}"
									title="Remove"
									onclick={() => askRemoveAttachment(file)}
								>
									<Trash2Icon class="size-3.5" />
								</button>
							{/if}
							<span class="truncate text-xs opacity-70" title={file.name}>{file.name} · {sizeLabel(file.size)}</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-sm opacity-50">No attachments</p>
			{/if}
		</section>

		<!-- TM-23: komentar. Isi udah disaring server (renderDescriptionHtml), sama kayak description. -->
		<section>
			<h2 class="mb-3 font-semibold">Comments ({task.comments.length})</h2>
			{#if task.comments.length > 0}
				<!-- Compact: gak dibungkus card, antar komentar cuma dipisah garis. -->
				<ol class="mb-4 flex flex-col text-sm">
					{#each task.comments as c, i (c.id)}
						<li>
							{#if i > 0}<hr class="border-surface-300-700 my-3" />{/if}
							<div class="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
								<span class="font-semibold">{c.by}</span>
								<span class="opacity-60">{c.at}</span>
								{#if c.edits.length > 0}
									<button
										type="button"
										class="cursor-pointer underline decoration-dotted underline-offset-2 opacity-70 hover:opacity-100"
										aria-expanded={openCommentEdits.includes(c.id)}
										onclick={() => toggleCommentEdits(c.id)}>edited</button
									>
								{/if}
								{#if canWriteComments && editingComment !== c.id}
									<span class="ml-auto flex gap-1">
										<button
											type="button"
											class="btn-icon btn-icon-sm hover:preset-tonal size-7"
											aria-label="Edit comment"
											title="Edit"
											onclick={() => (editingComment = c.id)}
										>
											<PencilIcon class="size-3.5" />
										</button>
										<button
											type="button"
											class="btn-icon btn-icon-sm hover:preset-tonal text-error-500 size-7"
											aria-label="Delete comment"
											title="Delete"
											onclick={() => askDeleteComment(c.id)}
										>
											<Trash2Icon class="size-3.5" />
										</button>
									</span>
								{/if}
							</div>
							{#if editingComment === c.id}
								<form
									method="POST"
									action="?/updateComment"
									use:enhance={() =>
										async ({ result, update }) => {
											await update({ reset: false });
											if (result.type === 'success') editingComment = null;
										}}
									class="flex flex-col gap-2"
								>
									<input type="hidden" name="comment_id" value={c.id} />
									<RichTextEditor name="body" value={c.bodyHtml} required compact>
										{#snippet actions()}
											<button type="button" class="btn btn-sm btn-outline-neutral" onclick={() => (editingComment = null)}
												>Cancel</button
											>
											<button type="submit" class="btn btn-sm btn-outline-primary">Save</button>
										{/snippet}
									</RichTextEditor>
									{#if form?.commentError && form?.commentId === c.id}
										<div class="card preset-filled-error-500 p-3 text-sm" role="alert">{form.commentError}</div>
									{/if}
								</form>
							{:else}
								<div class="rich-text">{@html c.bodyHtml}</div>
							{/if}
							{#if openCommentEdits.includes(c.id)}
								<!-- Jejak edit komentar: tampilannya sama kayak Edit history description. -->
								<ol class="border-surface-300-700 mt-3 flex flex-col gap-3 border-t pt-3 text-xs">
									{#each c.edits as e (e.id)}
										<li class="border-l-2 pl-3" style="border-color: {editBorder.description}">
											<p class="mb-1 opacity-70">{e.by} · {e.at}</p>
											<p class="mb-0.5 font-semibold tracking-wide uppercase opacity-50">Before</p>
											<div class="rich-text opacity-60 line-through">{@html e.oldValue}</div>
											<p class="mt-2 mb-0.5 font-semibold tracking-wide uppercase opacity-50">After</p>
											<div class="rich-text">{@html e.newValue}</div>
										</li>
									{/each}
								</ol>
							{/if}
						</li>
					{/each}
				</ol>
			{/if}
			{#if canWriteComments}
				{#key commentFormKey}
					<form
						method="POST"
						action="?/addComment"
						use:enhance={() =>
							async ({ result, update }) => {
								await update({ reset: false });
								if (result.type === 'success') commentFormKey++;
							}}
						class="flex flex-col gap-2"
					>
						<RichTextEditor name="body" required placeholder="Write a comment" compact>
							{#snippet actions()}
								<button type="submit" class="btn btn-sm btn-outline-primary"><SendIcon class="size-4" /> Comment</button>
							{/snippet}
						</RichTextEditor>
						{#if form?.commentError && !form?.commentId}
							<div class="card preset-filled-error-500 p-3 text-sm" role="alert">{form.commentError}</div>
						{/if}
					</form>
				{/key}
			{:else}
				<p class="text-sm opacity-50">
					{task.comments.length === 0 ? 'No comments. ' : ''}Comments are locked once the task is Live or Rejected.
				</p>
			{/if}
		</section>
	</article>

	<div class="flex h-fit flex-col gap-6">
		{#if canMove && nextStatuses.length > 0}
			<button type="button" class="btn btn-outline-primary xs:hidden" onclick={openMove}>Change status</button>
			<section class="card preset-filled-surface-50-950 border-surface-300-700 hidden flex-col gap-4 border p-6 shadow-xl xs:flex">
				<h2 class="font-semibold">Change status</h2>
				{#if form?.transitionError}
					<div class="card preset-filled-error-500 p-3 text-sm" role="alert">{form.transitionError}</div>
				{/if}
				{#each nextStatuses as to (to)}
					<form method="POST" action="?/transition" use:enhance class="form-comfy flex flex-col gap-3">
						<input type="hidden" name="to" value={to} />
						{#if to === 'rejected' || to === 'done' || to === 'done-live'}
							<label class="label">
								<span class="label-text font-semibold">
									{noteLabel(to)}
								</span>
								<textarea class="textarea" name="note" rows="2" required={to === 'rejected'}></textarea>
							</label>
						{/if}
						<button
							type="submit"
							class="btn {to === 'rejected' ? 'btn-outline-error' : 'btn-outline-primary'}"
						>
							{tabLabel(to)}
						</button>
					</form>
				{/each}
			</section>
		{/if}

		<!-- TM-21: task Rejected bisa diajuin ulang sekali (one-to-one). Isi lama dibawa ke form New task. -->
		{#if task.status === 'rejected' && !task.recreatedAs}
			<section class="card preset-filled-surface-50-950 border-surface-300-700 flex flex-col gap-3 border p-6 shadow-xl">
				<h2 class="font-semibold">Recreate</h2>
				<p class="text-sm opacity-70">
					Submit this task again as a new request. Title, description, type and platform are copied and can be
					changed; attachments are not. This task stays rejected and links to the new one.
				</p>
				<a href="/task/new?from={task.id}" class="btn btn-outline-primary inline-flex items-center justify-center gap-1">
					<RotateCcwIcon class="size-4" /> Recreate
				</a>
			</section>
		{/if}

		<aside class="card preset-filled-surface-50-950 border-surface-300-700 border p-6 shadow-xl">
			<h2 class="mb-4 font-semibold">Status history</h2>
			<ol class="flex flex-col gap-4 text-sm">
				{#each task.history as h (h.id)}
					<li class="border-l-2 pl-3" style="border-color: {historyBorder(h.from, h.to)}">
						<p class="font-medium">
							{historyLabel(h.from, h.to)}
						</p>
						<p class="text-xs opacity-70">{h.by}{h.via ? ` via ${h.via}` : ''} · {h.at}</p>
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

		{#if task.edits.length > 0}
			<aside class="card preset-filled-surface-50-950 border-surface-300-700 border p-6 shadow-xl">
				<h2 class="mb-4 font-semibold">Edit history</h2>
				<ol class="flex flex-col gap-3 text-sm">
					{#each task.edits as e (e.id)}
						<li class="border-l-2 pl-3" style="border-color: {editBorder[e.field]}">
							<p class="font-medium">{editLabels[e.field]}</p>
							<p class="text-xs opacity-70">{e.by}{e.via ? ` via ${e.via}` : ''} · {e.at}</p>
							{#if e.field === 'recreate'}
								<p class="mt-1 text-xs break-words">
									<a href="/task/{e.oldValue}" class="anchor">{e.newValue}</a>
								</p>
							{:else if e.field === 'attachment_add' || e.field === 'attachment_remove'}
								<!-- TM-22: link ke file-nya (yang udah dihapus pun tetep kebuka), di tab baru. -->
								<p class="mt-1 text-xs break-words">
									<a href="/attachment/{e.oldValue}" target="_blank" rel="noopener" class="anchor">{e.newValue}</a>
								</p>
							{:else if e.field === 'description'}
								<!-- Description bisa multi-baris, jadi lama/baru dipisah jelas pakai label + garis. -->
								<div class="mt-2 flex flex-col gap-2 text-xs">
									<div>
										<p class="mb-0.5 font-semibold tracking-wide uppercase opacity-50">Before</p>
										<div class="rich-text opacity-60 line-through">{@html e.oldValue}</div>
									</div>
									<hr class="border-surface-300-700" />
									<div>
										<p class="mb-0.5 font-semibold tracking-wide uppercase opacity-50">After</p>
										<div class="rich-text">{@html e.newValue}</div>
									</div>
								</div>
							{:else if e.field === 'platform'}
								<p class="mt-1 text-xs break-words">
									<span class="opacity-60 line-through">{platformLabels[e.oldValue as Platform]}</span> to {platformLabels[
										e.newValue as Platform
									]}
								</p>
							{:else}
								<p class="mt-1 text-xs break-words">
									<span class="opacity-60 line-through">{e.oldValue}</span> → {e.newValue}
								</p>
							{/if}
						</li>
					{/each}
				</ol>
			</aside>
		{/if}
	</div>
</div>

<Dialog
	open={pendingDelete !== null}
	onOpenChange={(e) => {
		if (!e.open) pendingDelete = null;
	}}
	role="alertdialog"
>
	<Portal>
		<Dialog.Backdrop class="fixed inset-0 z-50 bg-black/60" />
		<Dialog.Positioner class="fixed inset-0 z-50 flex items-center justify-center p-4">
			<Dialog.Content
				class="card preset-filled-surface-50-950 border-surface-300-700 w-full max-w-md space-y-4 border p-5 shadow-2xl"
			>
				<Dialog.Title class="h5">{pendingDelete?.title}</Dialog.Title>
				<Dialog.Description class="text-sm">
					{#if pendingDelete?.name}<strong class="break-all">{pendingDelete.name}</strong>{/if}
					{pendingDelete?.message}
				</Dialog.Description>
				<form
					method="POST"
					action={pendingDelete?.action}
					class="flex justify-end gap-3"
					use:enhance={() => {
						pendingDelete = null;
						return async ({ update }) => {
							await update();
						};
					}}
				>
					<input type="hidden" name={pendingDelete?.field} value={pendingDelete?.id ?? ''} />
					<Dialog.CloseTrigger class="btn btn-outline-neutral">Cancel</Dialog.CloseTrigger>
					<button type="submit" class="btn btn-outline-error">
						<Trash2Icon class="size-4" />
						{pendingDelete?.action === '?/deleteComment' ? 'Delete' : 'Remove'}
					</button>
				</form>
			</Dialog.Content>
		</Dialog.Positioner>
	</Portal>
</Dialog>

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
							aria-label="Zoom out"
							title="Zoom out"
						>
							<ZoomOutIcon class="size-4" />
						</button>
						<button
							type="button"
							class="btn btn-sm btn-outline-neutral min-w-16"
							onclick={() => (zoomIndex = 0)}
							title="Fit to screen"
						>
							{Math.round(zoom * 100)}%
						</button>
						<button
							type="button"
							class="btn-icon btn-icon-sm btn-outline-neutral"
							onclick={zoomIn}
							disabled={zoomIndex === ZOOM_STEPS.length - 1}
							aria-label="Zoom in"
							title="Zoom in"
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
					<DownloadIcon class="size-4" /> Download
				</a>
				<button
					type="button"
					class="btn-icon btn-icon-sm btn-outline-neutral"
					onclick={() => viewer?.close()}
					aria-label="Close"
					title="Close"
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
						<p class="text-sm opacity-70">No preview available for this file. Download it to open it.</p>
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
				<h2 id="move-title" class="h5">Change status</h2>
				<p class="text-xs opacity-70">Current: {statusLabels[task.status]}</p>
			</div>

			{#if nextStatuses.length > 1}
				<div class="flex" role="tablist" aria-label="Move to">
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
				<button type="button" class="btn btn-outline-neutral" onclick={() => moveDialog?.close()}>Cancel</button>
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

