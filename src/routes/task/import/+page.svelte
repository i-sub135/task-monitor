<script lang="ts">
	import { enhance } from '$app/forms';
	import { FileUpIcon } from '@lucide/svelte';
	import { platformLabels } from '$lib/utils/tasks';

	let { data, form } = $props();

	let importing = $state(false);
	const rows = $derived(form?.rows ?? []);
	const newUsers = $derived([...new Set(rows.filter((r) => r.newUser).map((r) => r.createdBy))]);
	const duplicates = $derived(rows.filter((r) => r.duplicate).length);
	const maxMb = $derived(Math.round(data.maxBytes / 1024 / 1024));
</script>

<svelte:head>
	<title>Import tasks · Task Monitor</title>
</svelte:head>

<div class="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
	<h1 class="h3">Import tasks</h1>
	<p class="text-sm opacity-70">JSON file, max {maxMb} MB. All tasks go to Request.</p>
</div>

{#if form?.error}
	<div class="card preset-filled-error-500 mb-6 p-4 text-sm" role="alert">{form.error}</div>
{/if}
{#if form?.imported}
	<div class="card preset-filled-success-500 mb-6 flex flex-col gap-1 p-4 text-sm" role="status">
		<p>{form.imported} {form.imported === 1 ? 'task' : 'tasks'} imported to Request. <a href="/board" class="underline">Open board</a></p>
		{#if form.newUsers?.length}
			<p>New users (marketing): {form.newUsers.join(', ')}</p>
		{/if}
	</div>
{/if}

<form
	method="POST"
	action="?/preview"
	enctype="multipart/form-data"
	use:enhance
	class="card preset-filled-surface-50-950 border-surface-300-700 form-comfy mb-6 flex flex-col gap-4 border p-6 shadow-xl"
>
	<label class="label">
		<span class="label-text font-semibold">JSON file</span>
		<input class="input" type="file" name="file" accept=".json,application/json" required />
	</label>
	<div class="flex flex-wrap items-center gap-3">
		<button type="submit" class="btn btn-outline-primary"><FileUpIcon class="size-4" /> Preview</button>
		<p class="text-xs opacity-70">
			Format: an array of objects with exactly <code>title</code>, <code>description</code>, <code>type</code>,
			<code>platform</code>, <code>created_by</code>. Nothing is saved until you click Import.
		</p>
	</div>
</form>

{#if form?.errors?.length}
	<div class="card preset-tonal-error mb-6 flex flex-col gap-2 p-4 text-sm" role="alert">
		<p class="font-semibold">
			{form.fileName ? `${form.fileName}: ` : ''}{form.errors.length}
			{form.errors.length === 1 ? 'problem' : 'problems'}, nothing imported
		</p>
		<ul class="list-inside list-disc">
			{#each form.errors as e, i (i)}<li>{e}</li>{/each}
		</ul>
	</div>
{/if}

{#if rows.length}
	<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
		<div class="text-sm">
			<p class="font-semibold">{form?.fileName ? `${form.fileName}: ` : ''}{rows.length} {rows.length === 1 ? 'task' : 'tasks'} ready</p>
			{#if newUsers.length}
				<p class="opacity-70">New users will be created (marketing): {newUsers.join(', ')}</p>
			{/if}
			{#if duplicates}
				<p class="text-warning-600-400">
					{duplicates} {duplicates === 1 ? 'task looks' : 'tasks look'} like a duplicate (same title and platform). They will
					still be imported.
				</p>
			{/if}
		</div>
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
		>
			<input type="hidden" name="json" value={form?.json} />
			<button type="submit" class="btn preset-filled-primary-500" disabled={importing}>
				{importing ? 'Importing…' : `Import ${rows.length} ${rows.length === 1 ? 'task' : 'tasks'}`}
			</button>
		</form>
	</div>

	<ol class="flex flex-col gap-3">
		{#each rows as r, i (i)}
			<li
				class="card preset-filled-surface-50-950 border-surface-300-700 flex flex-col gap-2 border p-4 shadow {r.duplicate
					? 'border-warning-500'
					: ''}"
			>
				<div class="flex flex-wrap items-start justify-between gap-2">
					<p class="min-w-0 font-medium break-words"><span class="opacity-60">#{i + 1}</span> {r.title}</p>
					<div class="flex flex-wrap gap-1">
						<span class="badge preset-tonal">{r.type}</span>
						<span class="badge preset-tonal">{platformLabels[r.platform]}</span>
						{#if r.duplicate}
							<span class="badge preset-filled-warning-500">
								{r.duplicate === 'board' ? 'already on board' : 'duplicate in file'}
							</span>
						{/if}
					</div>
				</div>
				<p class="text-xs opacity-70">
					{r.createdBy}{#if r.newUser}<span class="badge preset-tonal-primary ml-2">new user</span>{/if}
				</p>
				<details class="text-sm">
					<summary class="cursor-pointer opacity-70">Description</summary>
					<!-- Lolos parseImport = description udah sama persis hasil sanitizeDescription, nol markup mentah. -->
					<div class="rich-text mt-2">{@html r.description}</div>
				</details>
			</li>
		{/each}
	</ol>
{/if}
