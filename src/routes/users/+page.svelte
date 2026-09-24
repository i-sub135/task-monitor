<script lang="ts">
	import { enhance } from '$app/forms';
	import { UserPlusIcon } from '@lucide/svelte';
	import { roles } from '$lib/mock/session';
	import type { ManagedUser } from '$lib/mock/users';

	// Tipe ditulis manual, lihat catatan di src/routes/+page.svelte.
	type FormResult = {
		errors?: Record<string, string>;
		values?: { name: string; email: string; role: string };
		created?: string;
		updated?: boolean;
		rowError?: string;
	} | null;
	let { data, form }: { data: { users: ManagedUser[] }; form?: FormResult } = $props();

	const users = $derived(data.users);
	const activeCount = $derived(users.filter((u) => u.status === 'active').length);

	const roleBadge = {
		marketing: 'preset-tonal',
		developer: 'preset-filled-primary-500',
		admin: 'preset-filled-warning-500'
	} as const;
</script>

<svelte:head>
	<title>Users · Task Monitor</title>
</svelte:head>

<div class="mb-4 flex items-baseline justify-between">
	<h1 class="h3">Users</h1>
	<p class="text-sm opacity-70">{users.length} user, {activeCount} aktif (data mock)</p>
</div>

{#if form?.rowError}
	<div class="card preset-filled-error-500 mb-4 p-3 text-sm" role="alert">{form.rowError}</div>
{/if}
{#if form?.created}
	<div class="card preset-filled-success-500 mb-4 p-3 text-sm" role="status">
		User "{form.created}" ditambahkan.
	</div>
{/if}

<div class="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr]">
	<form
		method="POST"
		action="?/create"
		use:enhance
		class="card preset-filled-surface-50-950 border-surface-300-700 flex h-fit flex-col gap-4 border p-5 shadow-xl"
	>
		<h2 class="h5 flex items-center gap-2"><UserPlusIcon class="size-5" /> Tambah user</h2>

		<label class="label">
			<span class="label-text font-semibold">Nama</span>
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

		<button type="submit" class="btn preset-filled-primary-500">Tambah</button>
		<p class="text-xs opacity-70">
			Login cuma cek email, jadi user baru langsung bisa masuk begitu ditambah. Gak ada pendaftaran
			sendiri.
		</p>
	</form>

	<div class="card preset-filled-surface-50-950 border-surface-300-700 h-fit overflow-x-auto border shadow-xl">
		<table class="table w-full [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3">
			<thead>
				<tr>
					<th>Nama</th>
					<th>Email</th>
					<th>Role</th>
					<th>Status</th>
					<th>Dibuat</th>
					<th class="text-right">Aksi</th>
				</tr>
			</thead>
			<tbody>
				{#each users as u (u.id)}
					<tr class={u.status === 'non-active' ? 'opacity-60' : ''}>
						<td class="font-medium">{u.name}</td>
						<td class="break-all">{u.email}</td>
						<td>
							<form method="POST" action="?/setRole" use:enhance class="flex items-center gap-2">
								<input type="hidden" name="id" value={u.id} />
								<span class="badge {roleBadge[u.role]}">{u.role}</span>
								<select
									name="role"
									class="select w-auto py-1 text-xs"
									aria-label="Ganti role {u.name}"
									value={u.role}
									onchange={(e) => e.currentTarget.form?.requestSubmit()}
								>
									{#each roles as r (r)}
										<option value={r}>{r}</option>
									{/each}
								</select>
								<noscript><button type="submit" class="btn btn-sm hover:preset-tonal">Simpan</button></noscript>
							</form>
						</td>
						<td>
							<span class="badge {u.status === 'active' ? 'preset-filled-success-500' : 'preset-tonal'}">
								{u.status}
							</span>
						</td>
						<td class="text-xs opacity-70">{u.createdAt}</td>
						<td class="text-right">
							<form method="POST" action="?/setStatus" use:enhance>
								<input type="hidden" name="id" value={u.id} />
								<input
									type="hidden"
									name="status"
									value={u.status === 'active' ? 'non-active' : 'active'}
								/>
								<button type="submit" class="btn btn-sm hover:preset-tonal">
									{u.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
								</button>
							</form>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
