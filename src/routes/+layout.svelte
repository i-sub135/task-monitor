<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { AppBar } from '@skeletonlabs/skeleton-svelte';
	import { KanbanIcon, PlusIcon, UsersIcon, UserIcon } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import { roles, type MockUser } from '$lib/mock/session';

	// Tipe ditulis manual, lihat catatan di src/routes/+page.svelte.
	let { children, data }: { children: Snippet; data: { user: MockUser } } = $props();

	const navItems = [
		{ href: '/', label: 'Board', icon: KanbanIcon },
		{ href: '/task/new', label: 'Task baru', icon: PlusIcon },
		{ href: '/users', label: 'Users', icon: UsersIcon }
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Task Monitor</title>
</svelte:head>

<AppBar>
	<AppBar.Toolbar class="grid-cols-[auto_1fr_auto]">
		<AppBar.Lead>
			<a href="/" class="flex items-center gap-2">
				<KanbanIcon class="size-6" />
				<span class="text-xl font-bold">Task Monitor</span>
			</a>
		</AppBar.Lead>
		<AppBar.Headline>
			<nav class="flex items-center gap-1" aria-label="Navigasi utama">
				{#each navItems as item (item.href)}
					{@const active = page.url.pathname === item.href}
					<a
						href={item.href}
						class="btn btn-sm {active ? 'preset-filled-primary-500' : 'hover:preset-tonal'}"
						aria-current={active ? 'page' : undefined}
					>
						<item.icon class="size-4" />
						<span>{item.label}</span>
					</a>
				{/each}
			</nav>
		</AppBar.Headline>
		<AppBar.Trail>
			<!-- Mock: ganti role buat ngetes hak akses, diganti login beneran di TM-3 -->
			<form method="POST" action="/mock-role" class="flex items-center gap-2 text-sm">
				<input type="hidden" name="redirectTo" value={page.url.pathname + page.url.search} />
				<UserIcon class="size-5" />
				<span>{data.user.name}</span>
				<select
					name="role"
					class="select w-auto py-1 text-sm"
					aria-label="Ganti role (mock)"
					value={data.user.role}
					onchange={(e) => e.currentTarget.form?.requestSubmit()}
				>
					{#each roles as r (r)}
						<option value={r}>{r}</option>
					{/each}
				</select>
				<noscript><button type="submit" class="btn btn-sm hover:preset-tonal">Ganti</button></noscript>
			</form>
		</AppBar.Trail>
	</AppBar.Toolbar>
</AppBar>

<main class="mx-auto w-full max-w-[1600px] p-4">
	{@render children()}
</main>
