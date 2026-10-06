<script lang="ts">
	import { enhance } from '$app/forms';
	import { onDestroy, untrack } from 'svelte';
	import { formatSize } from '$lib/upload-limits';
	import RichTextEditor from '$lib/components/RichTextEditor.svelte';
	import { ArrowLeftIcon, BugIcon, SparklesIcon, FileTextIcon, InfoIcon, LifeBuoyIcon, XIcon } from '@lucide/svelte';
	import { platforms, platformLabels } from '$lib/tasks';
	import { platformIcons, platformColors } from '$lib/platform-icons';

	let { form, data } = $props();

	const MAX_FILES = $derived(data.maxFiles);
	const MAX_FILE_BYTES = $derived(data.maxFileBytes);

	// Chip platform butuh warna per-pilihan (hex spesifik, bukan preset Tailwind statis kayak Type),
	// jadi state kepilih dilacak di sini dan style-nya di-apply langsung, bukan lewat has-[:checked].
	// Disinkron ulang dari form.values kalau validasi field lain gagal dan server nge-echo balik pilihan lama.
	let selectedPlatform = $state(untrack(() => form?.values?.platform ?? ''));
	$effect(() => {
		if (form?.values?.platform) selectedPlatform = form.values.platform;
	});

	// `file` disimpan supaya isi <input type="file"> bisa dibangun ulang pas satu file dihapus.
	type Preview = { id: number; file: File; name: string; size: number; url?: string; error?: string };
	let previews = $state<Preview[]>([]);
	let nextId = 0;
	let fileInput = $state<HTMLInputElement>();

	const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf'];
	const isAllowed = (f: File) => ALLOWED_TYPES.includes(f.type);

	function revokeAll() {
		for (const p of previews) if (p.url) URL.revokeObjectURL(p.url);
	}

	function onPick(e: Event) {
		revokeAll();
		const files = Array.from((e.currentTarget as HTMLInputElement).files ?? []);
		previews = files.map((f) => ({
			id: nextId++,
			file: f,
			name: f.name,
			size: f.size,
			url: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
			error: !isAllowed(f)
				? 'Only PNG, JPG, GIF, WEBP or PDF'
				: f.size > MAX_FILE_BYTES
					? `Larger than ${formatSize(MAX_FILE_BYTES)}`
					: undefined
		}));
	}

	// Hapus satu lampiran. Input file gak bisa diubah per item, jadi dibangun ulang dari file yang tersisa
	// lewat DataTransfer; yang dikirim ke server tetap isi input itu.
	function removeFile(id: number) {
		const gone = previews.find((p) => p.id === id);
		if (gone?.url) URL.revokeObjectURL(gone.url);
		previews = previews.filter((p) => p.id !== id);
		if (fileInput) {
			const keep = new DataTransfer();
			for (const p of previews) keep.items.add(p.file);
			fileInput.files = keep.files;
		}
	}

	function clearFiles() {
		revokeAll();
		previews = [];
		if (fileInput) fileInput.value = '';
	}

	onDestroy(revokeAll);

	const tooMany = $derived(previews.length > MAX_FILES);
	const hasFileError = $derived(tooMany || previews.some((p) => p.error));
	const kb = (n: number) => `${Math.max(1, Math.round(n / 1024))} KB`;
</script>

<svelte:head>
	<title>New task · Task Monitor</title>
</svelte:head>

<a href="/board" class="btn btn-sm btn-outline-neutral mb-6 inline-flex items-center gap-1">
	<ArrowLeftIcon class="size-4" /> Board
</a>

<form
	method="POST"
	enctype="multipart/form-data"
	use:enhance
	class="card preset-filled-surface-50-950 border-surface-300-700 form-comfy mx-auto flex max-w-2xl flex-col gap-6 border p-6 shadow-xl"
>
	<div>
		<h1 class="h3">New task</h1>
		<p class="text-sm opacity-70">A task goes into the Request column and is visible to everyone.</p>
	</div>

	<aside class="card preset-tonal-primary flex flex-col gap-3 p-4 text-sm" aria-label="Bedanya bug, feature dan support">
		<p class="flex items-center gap-2 font-semibold"><InfoIcon class="size-4" /> Ini bug, feature, atau support?</p>
		<ul class="flex flex-col gap-2">
			<li class="flex gap-2">
				<BugIcon class="mt-0.5 size-4 shrink-0" />
				<span
					><strong>Bug</strong>: sesuatu yang sudah ada tapi rusak atau gak jalan sebagaimana mestinya.
					Contoh: banner gak muncul, tombol gak bisa diklik, ada salah ketik.</span
				>
			</li>
			<li class="flex gap-2">
				<SparklesIcon class="mt-0.5 size-4 shrink-0" />
				<span
					><strong>Feature</strong>: sesuatu yang belum ada dan kamu mau ditambah atau diubah. Contoh:
					filter baru di laporan, halaman baru, tombol export.</span
				>
			</li>
			<li class="flex gap-2">
				<LifeBuoyIcon class="mt-0.5 size-4 shrink-0" />
				<span
					><strong>Support</strong>: minta bantuan operasional, bukan ngubah aplikasi. Contoh: bikinin akun
					admin, reset password, atur akses. Langsung dari Request ke Done.</span
				>
			</li>
		</ul>
		<p>
			Patokan gampang: kalau dulu pernah jalan bener terus sekarang nggak, itu <strong>bug</strong>.
			Kalau belum pernah ada, itu <strong>feature</strong>.
		</p>
	</aside>

	<label class="label">
		<span class="label-text font-semibold">Title</span>
		<input
			class="input"
			type="text"
			name="title"
			maxlength="120"
			required
			placeholder="Summarize the problem or request"
			value={form?.values?.title ?? ''}
		/>
		{#if form?.errors?.title}<span class="text-error-500 text-sm">{form.errors.title}</span>{/if}
	</label>

	<fieldset class="flex flex-col gap-2">
		<legend class="label-text mb-2 font-semibold">Type</legend>
		<div class="flex flex-wrap gap-2">
			<label
				class="chip preset-outlined-surface-300-700 cursor-pointer has-[:checked]:preset-filled-error-500 has-[:focus-visible]:ring-2"
			>
				<input class="sr-only" type="radio" name="type" value="bug" required checked={form?.values?.type === 'bug'} />
				<BugIcon class="size-3.5" /> bug
			</label>
			<label
				class="chip preset-outlined-surface-300-700 cursor-pointer has-[:checked]:preset-filled-primary-500 has-[:focus-visible]:ring-2"
			>
				<input
					class="sr-only"
					type="radio"
					name="type"
					value="feature"
					checked={form?.values?.type === 'feature'}
				/>
				<SparklesIcon class="size-3.5" /> feature
			</label>
			<label
				class="chip preset-outlined-surface-300-700 cursor-pointer has-[:checked]:preset-filled-support has-[:focus-visible]:ring-2"
			>
				<input
					class="sr-only"
					type="radio"
					name="type"
					value="support"
					checked={form?.values?.type === 'support'}
				/>
				<LifeBuoyIcon class="size-3.5" /> support
			</label>
		</div>
		{#if form?.errors?.type}<span class="text-error-500 text-sm">{form.errors.type}</span>{/if}
	</fieldset>

	<fieldset class="flex flex-col gap-2">
		<legend class="label-text mb-2 font-semibold">Platform</legend>
		<div class="flex flex-wrap gap-2">
			{#each platforms as p (p)}
				{@const Icon = platformIcons[p]}
				{@const pc = platformColors[p]}
				<label
					class="chip preset-outlined-surface-300-700 cursor-pointer has-[:focus-visible]:ring-2"
					style={selectedPlatform === p ? `background-color:${pc.bg}; color:${pc.fg}; border-color:${pc.bg}` : ''}
				>
					<input
						class="sr-only"
						type="radio"
						name="platform"
						value={p}
						required
						checked={selectedPlatform === p}
						onchange={() => (selectedPlatform = p)}
					/>
					<Icon class="size-3.5" />
					{platformLabels[p]}
				</label>
			{/each}
		</div>
		{#if form?.errors?.platform}<span class="text-error-500 text-sm">{form.errors.platform}</span>{/if}
	</fieldset>

	<label class="label" for="description">
		<span class="label-text font-semibold">Description</span>
		<RichTextEditor
			name="description"
			value={form?.values?.description ?? ''}
			required
			placeholder="Describe the details: what happened, where, how often"
			invalid={Boolean(form?.errors?.description)}
		/>
		{#if form?.errors?.description}<span class="text-error-500 text-sm"
				>{form.errors.description}</span
			>{/if}
	</label>

	<div class="flex flex-col gap-2">
		<span class="label-text font-semibold">Attachments</span>
		<input
			bind:this={fileInput}
			class="input"
			type="file"
			name="attachments"
			multiple
			accept="image/png,image/jpeg,image/gif,image/webp,application/pdf"
			onchange={onPick}
		/>
		<p class="text-xs opacity-70">Up to {MAX_FILES} files, {formatSize(MAX_FILE_BYTES)} per file. PNG, JPG, GIF, WEBP or PDF.</p>
		{#if tooMany}<span class="text-error-500 text-sm">At most {MAX_FILES} attachments</span>{/if}
		{#if form?.errors?.attachments}<span class="text-error-500 text-sm"
				>{form.errors.attachments}</span
			>{/if}

		{#if previews.length > 0}
			<ul class="grid grid-cols-2 gap-4 sm:grid-cols-3">
				{#each previews as p (p.id)}
					<li class="flex flex-col gap-1">
						<div class="relative">
							{#if p.url}
								<img
									src={p.url}
									alt={p.name}
									class="rounded-container border-surface-300-700 aspect-video w-full border object-cover"
								/>
							{:else}
								<div
									class="preset-outlined-surface-300-700 rounded-container flex aspect-video w-full items-center justify-center"
								>
									<FileTextIcon class="size-8 opacity-60" />
								</div>
							{/if}
							<span class="bg-surface-50-950 absolute top-2 right-2 rounded-full">
								<button
									type="button"
									class="btn-icon btn-icon-sm btn-outline-error rounded-full"
									aria-label="Remove {p.name}"
									title="Remove this attachment"
									onclick={() => removeFile(p.id)}
								>
									<XIcon class="size-4" />
								</button>
							</span>
						</div>
						<span class="truncate text-xs opacity-70" title={p.name}>{p.name} · {kb(p.size)}</span>
						{#if p.error}<span class="text-error-500 text-xs">{p.error}</span>{/if}
					</li>
				{/each}
			</ul>
			<button type="button" class="btn btn-sm btn-outline-neutral self-start" onclick={clearFiles}>
				<XIcon class="size-4" /> Clear attachments
			</button>
		{/if}
	</div>

	{#if form?.errors?.form}
		<div class="card preset-filled-error-500 p-3 text-sm" role="alert">{form.errors.form}</div>
	{/if}

	<div class="flex justify-end gap-3 pt-2">
		<a href="/board" class="btn btn-outline-neutral">Cancel</a>
		<button type="submit" class="btn btn-outline-primary" disabled={hasFileError}>
			Submit request
		</button>
	</div>
</form>
