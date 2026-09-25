<script lang="ts">
	import { enhance } from '$app/forms';
	import { UserPlusIcon } from '@lucide/svelte';
	import { roles } from '$lib/roles';

	let { data, form } = $props();

	// HP (di bawah 500px): form tambah user jadi modal, dibuka dari tombol di header. 500px ke atas: kartu di samping.
	let addOpen = $state(false);
	let addDialog = $state<HTMLDialogElement>();
	$effect(() => {
		if (addOpen && addDialog && !addDialog.open) addDialog.showModal();
	});

	const users = $derived(data.users);
	const activeCount = $derived(users.filter((u) => u.status === 'active').length);
</script>

{#snippet addUserFields()}
	<label class="label">
		<span class="label-text font-semibold">Name</span>
		<input class="input" type="text" name="name" maxlength="100" required value={form?.values?.name ?? ''} />
		{#if form?.errors?.name}<span class="text-error-500 text-sm">{form.errors.name}</span>{/if}
	</label>

	<label class="label">
		<span class="label-text font-semibold">Email</span>
		<input class="input" type="email" name="email" required value={form?.values?.email ?? ''} />
		{#if form?.errors?.email}<span class="text-error-500 text-sm">{form.errors.email}</span>{/if}
	</label>

	<label class="label">
		<span class="label-text font-semibold">Role</span>
		<select class="select" name="role" required>
			{#each roles as r (r)}
				<option value={r} selected={(form?.values?.role ?? 'marketing') === r}>{r}</option>
			{/each}
		</select>
		{#if form?.errors?.role}<span class="text-error-500 text-sm">{form.errors.role}</span>{/if}
	</label>
{/snippet}

{#snippet addUserHint()}
	<p class="text-xs opacity-70">
		Developers and marketing log in with just their email. Admins need a password. There is no self-registration.
	</p>
{/snippet}

{#snippet roleControl(u: (typeof users)[number])}
	<form method="POST" action="?/setRole" use:enhance class="flex items-center gap-2">
		<input type="hidden" name="id" value={u.id} />
		<!-- Lebar tetap: w-auto bikin lebar select ngikutin opsi terpanjang, jadi "admin" longgar dan "developer" mepet panah. -->
		<select
			name="role"
			class="select w-40"
			aria-label="Change role of {u.name}"
			value={u.role}
			onchange={(e) => e.currentTarget.form?.requestSubmit()}
		>
			{#each roles as r (r)}
				<option value={r}>{r}</option>
			{/each}
		</select>
		<noscript><button type="submit" class="btn btn-sm btn-outline-neutral">Save</button></noscript>
	</form>
{/snippet}

{#snippet statusBadge(u: (typeof users)[number])}
	<span class="badge {u.status === 'active' ? 'preset-filled-success-500' : 'preset-tonal'}">
		{u.status}
	</span>
{/snippet}

{#snippet statusToggle(u: (typeof users)[number])}
	<form method="POST" action="?/setStatus" use:enhance>
		<input type="hidden" name="id" value={u.id} />
		<input type="hidden" name="status" value={u.status === 'active' ? 'non-active' : 'active'} />
		<button
			type="submit"
			class="btn btn-sm {u.status === 'active' ? 'btn-outline-error' : 'btn-outline-success'}"
		>
			{u.status === 'active' ? 'Deactivate' : 'Activate'}
		</button>
	</form>
{/snippet}

<svelte:head>
	<title>Users · Task Monitor</title>
</svelte:head>

<div class="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
	<h1 class="h3">Users</h1>
	<div class="flex items-center gap-3">
		<p class="text-sm opacity-70">{users.length} {users.length === 1 ? 'user' : 'users'}, {activeCount} active</p>
		<button type="button" class="btn btn-sm btn-outline-primary xs:hidden" onclick={() => (addOpen = true)}>
			<UserPlusIcon class="size-4" /> Add user
		</button>
	</div>
</div>

{#if form?.rowError}
	<div class="card preset-filled-error-500 mb-6 p-4 text-sm" role="alert">{form.rowError}</div>
{/if}
{#if form?.created}
	<div class="card preset-filled-success-500 mb-6 p-4 text-sm" role="status">
		User "{form.created}" added.
	</div>
{/if}

<div class="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_2fr]">
	<form
		method="POST"
		action="?/create"
		use:enhance
		class="card preset-filled-surface-50-950 border-surface-300-700 form-comfy hidden h-fit flex-col gap-5 border p-6 shadow-xl xs:flex"
	>
		<h2 class="h5 flex items-center gap-2"><UserPlusIcon class="size-5" /> Add user</h2>
		{@render addUserFields()}
		<button type="submit" class="btn btn-outline-primary">Add</button>
		{@render addUserHint()}
	</form>

	<div class="min-w-0">
		<!-- HP: satu kartu per user. Tabel 6 kolom gak muat di 393px, kolomnya kejepit dan email kepotong-potong. -->
		<ul class="flex flex-col gap-3 md:hidden">
			{#each users as u (u.id)}
				<li
					class="card preset-filled-surface-50-950 border-surface-300-700 flex flex-col gap-3 border p-4 shadow-xl {u.status ===
					'non-active'
						? 'opacity-60'
						: ''}"
				>
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<p class="font-medium">{u.name}</p>
							<p class="text-sm break-all opacity-70">{u.email}</p>
						</div>
						{@render statusBadge(u)}
					</div>
					<div class="flex flex-wrap items-center justify-between gap-2">
						{@render roleControl(u)}
						{@render statusToggle(u)}
					</div>
					<p class="text-xs opacity-60">Created {u.createdAt}</p>
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
						<th>Name</th>
						<th>Email</th>
						<th>Role</th>
						<th>Status</th>
						<th>Created</th>
						<th class="text-right">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each users as u (u.id)}
						<tr class={u.status === 'non-active' ? 'opacity-60' : ''}>
							<td class="font-medium">{u.name}</td>
							<td class="break-words">{u.email}</td>
							<td>{@render roleControl(u)}</td>
							<td>{@render statusBadge(u)}</td>
							<td class="text-xs whitespace-nowrap opacity-70">{u.createdAt}</td>
							<td class="text-right">{@render statusToggle(u)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>

{#if addOpen}
	<!-- Klik di luar kotak (backdrop) menutup; Esc ditangani dialog bawaan. Sukses tambah = modal menutup sendiri. -->
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
	<dialog
		bind:this={addDialog}
		onclose={() => (addOpen = false)}
		onclick={(e) => {
			if (e.target === addDialog) addDialog?.close();
		}}
		aria-labelledby="add-user-title"
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
			<h2 id="add-user-title" class="h5 flex items-center gap-2">
				<UserPlusIcon class="size-5" /> Add user
			</h2>
			{@render addUserFields()}
			<div class="flex justify-end gap-3">
				<button type="button" class="btn btn-outline-neutral" onclick={() => addDialog?.close()}>Cancel</button>
				<button type="submit" class="btn btn-outline-primary">Add</button>
			</div>
			{@render addUserHint()}
		</form>
	</dialog>
{/if}
