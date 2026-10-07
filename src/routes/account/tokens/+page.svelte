<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { CheckIcon, CopyIcon, KeyRoundIcon, PlusIcon, TrashIcon } from '@lucide/svelte';
	import { statusLabels } from '$lib/utils/tasks';
	import type { TokenActivity } from '$lib/server/tasks';

	// TM-17: token API milik user yang lagi login. Token asli cuma muncul sekali, persis setelah generate.
	let { data, form } = $props();

	const full = $derived(data.tokens.length >= data.max);

	// TM-18: aktivitas token. Nama yang udah gak ada di daftar token = token yang udah di-revoke.
	const activeNames = $derived(new Set(data.tokens.map((t) => t.name)));
	const filterNames = $derived([...new Set([...data.tokens.map((t) => t.name), ...data.activityNames])].sort());
	const fieldLabels = { title: 'title', description: 'description', type: 'type', platform: 'platform', recreate: 'recreate' };
	const activityLabel = (a: TokenActivity) =>
		a.kind === 'edit'
			? a.field === 'recreate'
				? 'Recreated task'
				: `Edited ${fieldLabels[a.field]}`
			: a.from === null
				? 'Created task'
				: a.from === 'done-live' && a.to === 'done'
					? 'Rollback: failed deploy'
					: `${statusLabels[a.from]} → ${statusLabels[a.to]}`;
	const filterVia = (via: string) =>
		goto(via ? `?via=${encodeURIComponent(via)}` : '?', { noScroll: true, keepFocus: true, replaceState: true });
	let copied = $state(false);

	// Sama kayak halaman Users: HP (di bawah 500px) form generate jadi modal dari tombol di header,
	// 500px ke atas jadi kartu di kolom kiri.
	let addOpen = $state(false);
	let addDialog = $state<HTMLDialogElement>();
	$effect(() => {
		if (addOpen && addDialog && !addDialog.open) addDialog.showModal();
	});

	const copy = async (token: string) => {
		await navigator.clipboard.writeText(token);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	};
</script>

<svelte:head>
	<title>API tokens · Task Monitor</title>
</svelte:head>

{#snippet generateFields()}
	<label class="label">
		<span class="label-text font-semibold">Name</span>
		<input
			class="input"
			name="name"
			required
			maxlength={data.nameMax}
			placeholder="e.g. Kuli Coding"
			value={form?.name ?? ''}
			disabled={full}
		/>
	</label>
	{#if full}<p class="text-sm opacity-70">Limit reached. Revoke a token first.</p>{/if}
{/snippet}

{#snippet generateHint()}
	<p class="text-xs opacity-70">
		A token acts as you: create and update tasks through the API with exactly your rights in the app. Shown in
		task history as "via &lt;name&gt;". Max {data.max}; revoke one to free a slot or refresh it.
	</p>
{/snippet}

{#snippet activityLine(a: TokenActivity)}
	<span class="badge preset-tonal">{a.via}{activeNames.has(a.via) ? '' : ' · revoked'}</span>
{/snippet}

<div class="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
	<h1 class="h3">API tokens</h1>
	<div class="flex items-center gap-3">
		<p class="text-sm opacity-70">{data.tokens.length} / {data.max} tokens</p>
		<button
			type="button"
			class="btn btn-sm btn-outline-primary xs:hidden"
			disabled={full}
			onclick={() => (addOpen = true)}
		>
			<PlusIcon class="size-4" /> Generate
		</button>
	</div>
</div>

{#if form?.created}
	<div class="card preset-filled-success-500 mb-6 flex flex-col gap-3 p-4 text-sm" role="status">
		<p class="font-semibold">Token "{form.created.name}" created. Copy it now, it will not be shown again.</p>
		<div class="flex gap-2">
			<input class="input font-mono text-xs" readonly value={form.created.token} aria-label="New API token" />
			<button
				type="button"
				class="btn btn-sm preset-filled-surface-50-950 shrink-0"
				onclick={() => copy(form.created.token)}
			>
				{#if copied}<CheckIcon class="size-4" /> Copied{:else}<CopyIcon class="size-4" /> Copy{/if}
			</button>
		</div>
	</div>
{/if}
{#if form?.error}
	<div class="card preset-filled-error-500 mb-6 p-4 text-sm" role="alert">{form.error}</div>
{/if}

<div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_2fr]">
	<!-- Kolom kiri: generate + daftar token. -->
	<div class="flex min-w-0 flex-col gap-6">
		<form
			method="POST"
			action="?/create"
			use:enhance
			class="card preset-filled-surface-50-950 border-surface-300-700 form-comfy hidden h-fit flex-col gap-5 border p-6 shadow-xl xs:flex"
		>
			<h2 class="h5 flex items-center gap-2"><KeyRoundIcon class="size-5" /> Generate token</h2>
			{@render generateFields()}
			<button type="submit" class="btn btn-outline-primary" disabled={full}>Generate</button>
			{@render generateHint()}
		</form>

		<section class="card preset-filled-surface-50-950 border-surface-300-700 flex flex-col gap-3 border p-6 shadow-xl">
			<h2 class="font-semibold">Your tokens</h2>
			{#if data.tokens.length === 0}
				<p class="text-sm opacity-60">No tokens yet.</p>
			{:else}
				<ul class="flex flex-col divide-y divide-surface-300-700">
					{#each data.tokens as t (t.id)}
						<li class="flex flex-wrap items-center justify-between gap-3 py-3">
							<div class="min-w-0">
								<p class="font-medium">{t.name}</p>
								<p class="text-xs opacity-70">
									<span class="font-mono">{t.prefix}…</span> · {t.lastUsedAt
										? `last used ${t.lastUsedAt}`
										: 'never used'}
								</p>
								<p class="text-xs opacity-60">Created {t.createdAt}</p>
							</div>
							<form
								method="POST"
								action="?/revoke"
								use:enhance={({ cancel }) => {
									if (!confirm(`Revoke token "${t.name}"? Anything using it stops working right away.`)) cancel();
								}}
							>
								<input type="hidden" name="id" value={t.id} />
								<button type="submit" class="btn btn-sm btn-outline-error">
									<TrashIcon class="size-4" /> Revoke
								</button>
							</form>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>

	<!-- Kolom kanan: aktivitas token (TM-18). -->
	<section class="min-w-0">
		<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
			<div>
				<h2 class="font-semibold">Activity</h2>
				<p class="text-xs opacity-60">
					Last {data.activity.length} changes through your tokens (create, edit, status). Reads are not logged.
				</p>
			</div>
			<select
				class="select w-48"
				aria-label="Filter by token"
				value={data.via}
				onchange={(e) => filterVia(e.currentTarget.value)}
			>
				<option value="">All tokens</option>
				{#each filterNames as name (name)}
					<option value={name}>{name}{activeNames.has(name) ? '' : ' (revoked)'}</option>
				{/each}
			</select>
		</div>

		{#if data.activity.length === 0}
			<div class="card preset-filled-surface-50-950 border-surface-300-700 border p-6 text-sm opacity-70 shadow-xl">
				No activity yet.
			</div>
		{:else}
			<!-- HP: satu kartu per aksi. -->
			<ul class="flex flex-col gap-3 md:hidden">
				{#each data.activity as a (a.kind + a.id)}
					<li class="card preset-filled-surface-50-950 border-surface-300-700 flex flex-col gap-2 border p-4 shadow-xl">
						<div class="flex items-start justify-between gap-3">
							<p class="font-medium">{activityLabel(a)}</p>
							{@render activityLine(a)}
						</div>
						<a href="/task/{a.taskId}" class="anchor text-sm break-words">{a.taskTitle}</a>
						<p class="text-xs opacity-60">{a.at}</p>
					</li>
				{/each}
			</ul>

			<!-- Tablet ke atas: tabel. -->
			<div
				class="card preset-filled-surface-50-950 border-surface-300-700 hidden h-fit overflow-x-auto border shadow-xl md:block"
			>
				<table class="table w-full [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3">
					<thead>
						<tr>
							<th>Token</th>
							<th>Action</th>
							<th>Task</th>
							<th>When</th>
						</tr>
					</thead>
					<tbody>
						{#each data.activity as a (a.kind + a.id)}
							<tr>
								<td>{@render activityLine(a)}</td>
								<td class="font-medium whitespace-nowrap">{activityLabel(a)}</td>
								<td class="break-words"><a href="/task/{a.taskId}" class="anchor">{a.taskTitle}</a></td>
								<td class="text-xs whitespace-nowrap opacity-70">{a.at}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</div>

{#if addOpen}
	<!-- Klik di luar kotak (backdrop) menutup; Esc ditangani dialog bawaan. Sukses generate = modal menutup sendiri. -->
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
	<dialog
		bind:this={addDialog}
		onclose={() => (addOpen = false)}
		onclick={(e) => {
			if (e.target === addDialog) addDialog?.close();
		}}
		aria-labelledby="generate-title"
		class="card preset-filled-surface-50-950 border-surface-300-700 m-auto w-[min(94vw,28rem)] max-w-none overflow-hidden border p-0 shadow-2xl backdrop:bg-black/60"
	>
		<form
			method="POST"
			action="?/create"
			use:enhance={() =>
				async ({ result, update }) => {
					await update();
					if (result.type === 'success') addOpen = false;
				}}
			class="form-comfy flex max-h-[92vh] flex-col gap-5 overflow-y-auto p-5"
		>
			<h2 id="generate-title" class="h5 flex items-center gap-2"><KeyRoundIcon class="size-5" /> Generate token</h2>
			{@render generateFields()}
			<div class="flex justify-end gap-3">
				<button type="button" class="btn btn-outline-neutral" onclick={() => addDialog?.close()}>Cancel</button>
				<button type="submit" class="btn btn-outline-primary" disabled={full}>Generate</button>
			</div>
			{@render generateHint()}
		</form>
	</dialog>
{/if}
