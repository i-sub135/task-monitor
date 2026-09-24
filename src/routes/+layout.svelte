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
	<!--
		HP: baris 1 = brand + user, baris 2 = nav (bisa digeser ke samping). Kolom pakai minmax(0, ...)
		supaya gak ada isi yang melebihi lebar layar; kalau melebihi, browser HP ngecilin seluruh halaman.
		Desktop: satu baris, brand | nav | user.
	-->
	<AppBar.Toolbar class="grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[auto_minmax(0,1fr)_auto]">
		<AppBar.Lead class="col-start-1 row-start-1 min-w-0">
			<a href={data.user ? '/board' : '/'} class="flex items-center gap-2">
				<KanbanIcon class="size-6 shrink-0" />
				<span class="text-lg font-bold whitespace-nowrap sm:text-xl">Task Monitor</span>
			</a>
		</AppBar.Lead>
		{#if data.user}
			<AppBar.Headline class="col-span-2 row-start-2 min-w-0 md:col-span-1 md:col-start-2 md:row-start-1">
				<nav class="flex items-center gap-1 overflow-x-auto" aria-label="Navigasi utama">
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
			<AppBar.Trail class="col-start-2 row-start-1 items-center md:col-start-3">
				<div class="flex items-center gap-3 text-sm">
					<span class="flex items-center gap-2">
						<UserIcon class="size-5 shrink-0" />
						<span class="hidden sm:inline">{data.user.name}</span>
						<span class="badge preset-tonal">{data.user.role}</span>
					</span>
					<form method="POST" action="/logout">
						<button type="submit" class="btn btn-sm hover:preset-tonal" aria-label="Keluar">
							<LogOutIcon class="size-4" />
							<span class="hidden sm:inline">Keluar</span>
						</button>
					</form>
				</div>
			</AppBar.Trail>
		{/if}
	</AppBar.Toolbar>
</AppBar>

<main class="mx-auto w-full px-4 py-6 sm:px-6 lg:px-8 {wide ? '' : 'max-w-[1600px]'}">
	{@render children()}
</main>
