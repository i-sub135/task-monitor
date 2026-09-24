<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { AppBar } from '@skeletonlabs/skeleton-svelte';
	import { KanbanIcon, LogOutIcon, PlusIcon, UsersIcon, UserIcon } from '@lucide/svelte';

	let { children, data } = $props();

	const allNavItems = [
		{ href: '/board', label: 'Board', icon: KanbanIcon, adminOnly: false },
		{ href: '/task/new', label: 'Task baru', icon: PlusIcon, adminOnly: false },
		{ href: '/users', label: 'Users', icon: UsersIcon, adminOnly: true }
	];
	// Board dilebarin penuh biar 6 kolom gak sempit di layar lebar. Halaman lain tetap dibatasi.
	const wide = $derived(page.url.pathname === '/board');
	// Kelola users cuma buat admin, jadi link-nya disembunyiin buat role lain.
	const navItems = $derived(
		data.user ? allNavItems.filter((i) => !i.adminOnly || data.user?.role === 'admin') : []
	);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Task Monitor</title>
</svelte:head>

<AppBar>
	<AppBar.Toolbar class="grid-cols-[auto_1fr_auto]">
		<AppBar.Lead>
			<a href={data.user ? '/board' : '/'} class="flex items-center gap-2">
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
			{#if data.user}
				<div class="flex items-center gap-3 text-sm">
					<span class="flex items-center gap-2">
						<UserIcon class="size-5" />
						<span>{data.user.name}</span>
						<span class="badge preset-tonal">{data.user.role}</span>
					</span>
					<form method="POST" action="/logout">
						<button type="submit" class="btn btn-sm hover:preset-tonal">
							<LogOutIcon class="size-4" />
							<span>Keluar</span>
						</button>
					</form>
				</div>
			{/if}
		</AppBar.Trail>
	</AppBar.Toolbar>
</AppBar>

<main class="mx-auto w-full px-4 py-6 sm:px-6 lg:px-8 {wide ? '' : 'max-w-[1600px]'}">
	{@render children()}
</main>
