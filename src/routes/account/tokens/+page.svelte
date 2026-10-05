<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { CheckIcon, CopyIcon, KeyRoundIcon, TrashIcon } from '@lucide/svelte';
	import { statusLabels } from '$lib/tasks';
	import type { TokenActivity } from '$lib/server/tasks';

	// TM-17: token API milik user yang lagi login. Token asli cuma muncul sekali, persis setelah generate.
	let { data, form } = $props();

	const full = $derived(data.tokens.length >= data.max);

	// TM-18: aktivitas token. Nama yang udah gak ada di daftar token = token yang udah di-revoke.
	const activeNames = $derived(new Set(data.tokens.map((t) => t.name)));
	const filterNames = $derived([...new Set([...data.tokens.map((t) => t.name), ...data.activityNames])].sort());
	const fieldLabels = { title: 'title', description: 'description', type: 'type', platform: 'platform' };
	const activityLabel = (a: TokenActivity) =>
		a.kind === 'edit'
			? `Edited ${fieldLabels[a.field]}`
			: a.from === null
				? 'Created task'
				: a.from === 'done-live' && a.to === 'done'
					? 'Rollback: failed deploy'
					: `${statusLabels[a.from]} → ${statusLabels[a.to]}`;
	const filterVia = (via: string) =>
		goto(via ? `?via=${encodeURIComponent(via)}` : '?', { noScroll: true, keepFocus: true, replaceState: true });
	let copied = $state(false);

	async function copy(token: string) {
		await navigator.clipboard.writeText(token);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<svelte:head>
	<title>API tokens · Task Monitor</title>
</svelte:head>

<div class="mx-auto flex max-w-3xl flex-col gap-6">
	<div>
		<h1 class="h3 mb-1">API tokens</h1>
		<p class="text-sm opacity-70">
			A token acts as you: your kuli (or you) can create and update tasks through the API with exactly the
			same rights you have in the app. Max {data.max} tokens. Revoke one to free a slot or to refresh it.
		</p>
	</div>

	{#if form?.created}
		<div class="card preset-filled-success-500 flex flex-col gap-3 p-4 text-sm" role="status">
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
		<div class="card preset-filled-error-500 p-4 text-sm" role="alert">{form.error}</div>
	{/if}

	<section class="card preset-filled-surface-50-950 border-surface-300-700 flex flex-col gap-4 border p-6 shadow-xl">
		<div class="flex items-center justify-between">
			<h2 class="font-semibold">Your tokens</h2>
			<span class="badge preset-tonal">{data.tokens.length} / {data.max}</span>
		</div>

		{#if data.tokens.length === 0}
			<p class="text-sm opacity-60">No tokens yet.</p>
		{:else}
			<ul class="flex flex-col divide-y divide-surface-300-700">
				{#each data.tokens as t (t.id)}
					<li class="flex flex-wrap items-center justify-between gap-3 py-3">
						<div class="min-w-0">
							<p class="flex items-center gap-2 font-medium">
								<KeyRoundIcon class="size-4 shrink-0 opacity-60" />{t.name}
							</p>
							<p class="text-xs opacity-70">
								<span class="font-mono">{t.prefix}…</span> · created {t.createdAt} · {t.lastUsedAt
									? `last used ${t.lastUsedAt}`
									: 'never used'}
							</p>
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

	<form
		method="POST"
		action="?/create"
		use:enhance
		class="card preset-filled-surface-50-950 border-surface-300-700 form-comfy flex flex-col gap-4 border p-6 shadow-xl"
	>
		<h2 class="font-semibold">Generate token</h2>
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
			<span class="text-xs opacity-60">Shown in task history as "via &lt;name&gt;".</span>
		</label>
		<div class="flex items-center justify-end gap-3">
			{#if full}<span class="text-sm opacity-70">Limit reached. Revoke a token first.</span>{/if}
			<button type="submit" class="btn btn-outline-primary" disabled={full}>Generate</button>
		</div>
	</form>

	<section class="card preset-filled-surface-50-950 border-surface-300-700 flex flex-col gap-4 border p-6 shadow-xl">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div>
				<h2 class="font-semibold">Activity</h2>
				<p class="text-xs opacity-60">
					Last {data.activity.length} changes made through your tokens (create, edit, status). Reads are not logged.
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
			<p class="text-sm opacity-60">No activity yet.</p>
		{:else}
			<ul class="flex flex-col divide-y divide-surface-300-700 text-sm">
				{#each data.activity as a (a.kind + a.id)}
					<li class="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
						<span class="badge preset-tonal shrink-0">
							{a.via}{activeNames.has(a.via) ? '' : ' · revoked'}
						</span>
						<span class="font-medium">{activityLabel(a)}</span>
						<a href="/task/{a.taskId}" class="anchor min-w-0 flex-1 truncate">{a.taskTitle}</a>
						<span class="text-xs opacity-60">{a.at}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
