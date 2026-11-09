<script lang="ts">
	import { enhance } from '$app/forms';
	import { CheckIcon, CircleAlertIcon, CircleCheckIcon, CopyIcon, FileUpIcon, Trash2Icon } from '@lucide/svelte';
	import { copyText } from '$lib/utils/clipboard';
	import { platformLabels, platforms, taskTypes } from '$lib/utils/tasks';
	import { typeFilledClass, typeIcons } from '$lib/utils/type-styles';
	import { platformColors, platformIcons } from '$lib/utils/platform-icons';

	let { data, form } = $props();

	type PreviewRow = NonNullable<NonNullable<typeof form>['rows']>[number];
	type Row = PreviewRow & { n: number };

	// Baris hasil preview. $derived yang bisa ditimpa: hapus baris = assign ulang, preview baru = dihitung ulang dari form.
	// (Bukan $state + $effect: $effect gak jalan di server, jadi render pertama tabelnya kosong.)
	let rows = $derived<Row[]>(form?.rows ? form.rows.map((r, i) => ({ ...r, n: i + 1 })) : []);
	let importing = $state(false);

	// Dobel di file dihitung ulang tiap ada baris dihapus: yang ditandai cuma kemunculan kedua dst.
	const dupInFile = $derived.by(() => {
		const seen = new Set<string>();
		const dup = new Set<number>();
		for (const r of rows) {
			if (!r.key) continue;
			if (seen.has(r.key)) dup.add(r.n);
			seen.add(r.key);
		}
		return dup;
	});
	const invalid = $derived(rows.filter((r) => r.errors.length).length);
	const warned = $derived(rows.filter((r) => r.onBoard || dupInFile.has(r.n)).length);
	const newUsers = $derived([...new Set(rows.filter((r) => r.newUser && r.task).map((r) => r.task!.createdBy))]);
	const payload = $derived(JSON.stringify(rows.map((r) => r.raw)));
	const maxMb = $derived(Math.round(data.maxBytes / 1024 / 1024));

	const remove = (n: number) => {
		rows = rows.filter((r) => r.n !== n);
	};

	// Contoh bentuk file (docs/task-import-format.md), buat disalin terus diisi.
	const TEMPLATE = JSON.stringify(
		[
			{
				title: 'Checkout button does not respond on Android 12',
				description: '<p>The <strong>Pay</strong> button cannot be tapped.</p><ul><li>Device: Samsung A52</li></ul>',
				type: 'bug',
				platform: 'mobile',
				created_by: 'budi.santoso@maal.id'
			},
			{
				title: 'Export sales report to Excel',
				description: '<p>Store admins need a daily .xlsx export.</p>',
				type: 'feature',
				platform: 'web',
				created_by: 'siti.rahma@maal.id'
			}
		],
		null,
		2
	);
	let templateCopied = $state(false);
	const copyTemplate = async () => {
		if ((await copyText(TEMPLATE, 'Copy this JSON:')) !== 'copied') return;
		templateCopied = true;
		setTimeout(() => (templateCopied = false), 2000);
	};
</script>

<svelte:head>
	<title>Import tasks · Task Monitor</title>
</svelte:head>

{#snippet typeBadge(r: Row)}
	{#if r.task}
		{@const TypeIcon = typeIcons[r.task.type]}
		<span class="badge {typeFilledClass[r.task.type]}"><TypeIcon class="size-3" /> {r.task.type}</span>
	{/if}
{/snippet}

{#snippet platformBadge(r: Row)}
	{#if r.task}
		{@const PlatformIcon = platformIcons[r.task.platform]}
		<span
			class="badge"
			style="background-color: {platformColors[r.task.platform].bg}; color: {platformColors[r.task.platform].fg}"
			><PlatformIcon class="size-3" /> {platformLabels[r.task.platform]}</span
		>
	{/if}
{/snippet}

{#snippet check(r: Row)}
	{#if r.errors.length}
		<ul class="text-error-600-400 flex flex-col gap-0.5 text-xs">
			{#each r.errors as e, i (i)}
				<li class="flex items-start gap-1"><CircleAlertIcon class="mt-px size-3.5 shrink-0" /> {e}</li>
			{/each}
		</ul>
	{:else}
		<div class="flex flex-wrap items-center gap-1">
			<span class="text-success-600-400 flex items-center gap-1 text-xs"><CircleCheckIcon class="size-3.5" /> OK</span>
			{#if r.onBoard}<span class="badge preset-filled-warning-500">already on board</span>{/if}
			{#if dupInFile.has(r.n)}<span class="badge preset-filled-warning-500">duplicate in file</span>{/if}
			{#if r.newUser}<span class="badge preset-tonal-primary">new user</span>{/if}
		</div>
	{/if}
{/snippet}

{#snippet title(r: Row)}
	{#if r.task}
		<p class="font-medium break-words">{r.task.title}</p>
		<details class="text-sm">
			<summary class="cursor-pointer text-xs opacity-60">Description</summary>
			<!-- Lolos cek = description udah sama persis hasil sanitizeDescription, nol markup mentah. -->
			<div class="rich-text mt-1">{@html r.task.description}</div>
		</details>
	{:else}
		<!-- Baris yang gak lolos cek: tampilin judul mentahnya sebagai teks biasa (auto-escape), kalau ada. -->
		<p class="font-medium break-words opacity-70">
			{typeof r.raw === 'object' && r.raw && 'title' in r.raw ? String(r.raw.title) : '(no title)'}
		</p>
	{/if}
{/snippet}

{#snippet removeButton(r: Row)}
	<button
		type="button"
		class="btn-icon btn-icon-sm hover:preset-tonal-error"
		title="Remove row #{r.n}"
		aria-label="Remove row #{r.n}"
		onclick={() => remove(r.n)}
	>
		<Trash2Icon class="size-4" />
	</button>
{/snippet}

<div class="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
	<h1 class="h3">Import tasks</h1>
	<p class="text-sm opacity-70">All tasks go to Request, in file order.</p>
</div>

{#if form?.imported}
	<div class="card preset-filled-success-500 mb-6 flex flex-col gap-1 p-4 text-sm" role="status">
		<p>
			{form.imported}
			{form.imported === 1 ? 'task' : 'tasks'} imported to Request{form.fileName ? ` from ${form.fileName}` : ''}.
			<a href="/board" class="underline">Open board</a>
		</p>
		{#if form.newUsers?.length}<p>New users (marketing): {form.newUsers.join(', ')}</p>{/if}
	</div>
{/if}

<div class="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_2fr]">
	<!-- Kiri: upload. -->
	<form
		method="POST"
		action="?/preview"
		enctype="multipart/form-data"
		use:enhance
		class="card preset-filled-surface-50-950 border-surface-300-700 form-comfy flex h-fit min-w-0 flex-col gap-5 border p-6 shadow-xl"
	>
		<h2 class="h5 flex items-center gap-2"><FileUpIcon class="size-5" /> Upload JSON</h2>
		<label class="label">
			<span class="label-text font-semibold">JSON file</span>
			<input class="input" type="file" name="file" accept=".json,application/json" required />
			<span class="text-xs opacity-60">Max {maxMb} MB</span>
		</label>
		{#if form?.error}
			<div class="card preset-tonal-error p-3 text-sm" role="alert">
				{form.fileName ? `${form.fileName}: ` : ''}{form.error}
			</div>
		{/if}
		<button type="submit" class="btn btn-outline-primary">Preview</button>
		<p class="text-xs opacity-70">Nothing is saved until you click Import.</p>

		<div class="border-surface-300-700 flex flex-col gap-2 border-t pt-4">
			<div class="flex items-center justify-between gap-2">
				<span class="text-sm font-semibold">JSON format</span>
				<button type="button" class="btn btn-xs btn-outline-neutral" onclick={copyTemplate}>
					{#if templateCopied}<CheckIcon class="size-3" /> Copied{:else}<CopyIcon class="size-3" /> Copy{/if}
				</button>
			</div>
			<pre
				class="bg-surface-100-900 border-surface-300-700 max-h-72 w-full overflow-auto rounded-[0.5rem]! border p-3 whitespace-pre text-[11px] leading-snug">{TEMPLATE}</pre>
			<ul class="flex flex-col gap-0.5 text-xs opacity-70">
				<li><code>type</code>: {taskTypes.join(' | ')}</li>
				<li><code>platform</code>: {platforms.join(' | ')}</li>
				<li><code>created_by</code>: lowercase email; unknown emails become new marketing users</li>
				<li>
					<code>description</code>: plain text or HTML with only
					{data.allowedTags.map((t) => `<${t}>`).join(' ')}
				</li>
			</ul>
		</div>
	</form>

	<!-- Kanan: review per baris + submit di bawah. -->
	<div class="flex min-w-0 flex-col gap-4">
		<div
			class="card preset-filled-surface-50-950 border-surface-300-700 flex min-w-0 flex-col border shadow-xl"
		>
			<div class="border-surface-300-700 flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
				<h2 class="h5">Review{form?.fileName && rows.length ? ` · ${form.fileName}` : ''}</h2>
				{#if rows.length}
					<p class="text-xs opacity-70">
						{rows.length} {rows.length === 1 ? 'row' : 'rows'}
						{#if invalid}· <span class="text-error-600-400">{invalid} with problems</span>{/if}
						{#if warned}· <span class="text-warning-600-400">{warned} possible duplicate</span>{/if}
						{#if newUsers.length}· {newUsers.length} new {newUsers.length === 1 ? 'user' : 'users'}{/if}
					</p>
				{/if}
			</div>

			{#if !rows.length}
				<p class="p-6 text-center text-sm opacity-60">
					{form?.rows ? 'All rows removed. Upload the file again to start over.' : 'Upload a JSON file to review its tasks here.'}
				</p>
			{:else}
				<!-- HP: satu kartu per baris. -->
				<ul class="flex flex-col md:hidden">
					{#each rows as r (r.n)}
						<li
							class="border-surface-300-700 flex flex-col gap-2 border-b p-4 last:border-b-0 {r.errors.length
								? 'bg-error-500/5'
								: ''}"
						>
							<div class="flex items-start justify-between gap-2">
								<div class="min-w-0"><span class="text-xs opacity-60">#{r.n}</span> {@render title(r)}</div>
								{@render removeButton(r)}
							</div>
							<div class="flex flex-wrap gap-1">{@render typeBadge(r)} {@render platformBadge(r)}</div>
							{#if r.task}<p class="text-xs break-all opacity-70">{r.task.createdBy}</p>{/if}
							{@render check(r)}
						</li>
					{/each}
				</ul>

				<!-- Tablet ke atas: tabel. -->
				<div class="hidden overflow-x-auto md:block">
					<table class="table w-full [&_td]:px-3 [&_td]:py-2.5 [&_td]:align-top [&_th]:px-3 [&_th]:py-2.5">
						<thead>
							<tr>
								<th class="w-10">#</th>
								<th>Title</th>
								<th>Type</th>
								<th>Platform</th>
								<th>Created by</th>
								<th>Check</th>
								<th class="w-10"><span class="sr-only">Remove</span></th>
							</tr>
						</thead>
						<tbody>
							{#each rows as r (r.n)}
								<tr class={r.errors.length ? 'bg-error-500/5' : ''}>
									<td class="text-xs opacity-60">{r.n}</td>
									<td class="min-w-48">{@render title(r)}</td>
									<td>{@render typeBadge(r)}</td>
									<td>{@render platformBadge(r)}</td>
									<td class="text-xs break-all">{r.task?.createdBy ?? ''}</td>
									<td class="min-w-40">{@render check(r)}</td>
									<td class="text-right">{@render removeButton(r)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>

		{#if rows.length}
			<form
				method="POST"
				action="?/import"
				use:enhance={() => {
					importing = true;
					return async ({ update }) => {
						await update();
						importing = false;
					};
				}}
				class="flex flex-wrap items-center justify-end gap-3"
			>
				<input type="hidden" name="json" value={payload} />
				<input type="hidden" name="fileName" value={form?.fileName ?? ''} />
				{#if invalid}
					<p class="text-error-600-400 text-sm">
						Remove {invalid} {invalid === 1 ? 'row' : 'rows'} with problems, or fix the file and upload it again.
					</p>
				{:else if warned}
					<p class="text-warning-600-400 text-sm">Possible duplicates will still be imported.</p>
				{/if}
				<button type="submit" class="btn preset-filled-primary-500" disabled={importing || invalid > 0}>
					{importing ? 'Importing…' : `Import ${rows.length} ${rows.length === 1 ? 'task' : 'tasks'}`}
				</button>
			</form>
		{/if}
	</div>
</div>
