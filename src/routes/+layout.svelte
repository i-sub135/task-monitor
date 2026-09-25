<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { AppBar, Navigation } from '@skeletonlabs/skeleton-svelte';
	import { KanbanIcon, LogOutIcon, PlusIcon, UsersIcon, UserIcon } from '@lucide/svelte';

	let { children, data } = $props();

	const allNavItems = [
		{ href: '/board', label: 'Board', icon: KanbanIcon, adminOnly: false },
		{ href: '/task/new', label: 'Task baru', icon: PlusIcon, adminOnly: false },
		{ href: '/users', label: 'Users', icon: UsersIcon, adminOnly: true }
	];
	// Board dilebarin penuh biar 6 kolom gak sempit di layar lebar. Halaman lain tetap dibatasi.
	const wide = $derived(page.url.pathname === '/board');
	// "0.0.83" tampil "v0.0.83"; nilai bukan angka (mis. "dev") tampil apa adanya.
	const versionLabel = $derived(data.version ? (/^\d/.test(data.version) ? `v${data.version}` : data.version) : '');
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
		Kolom pakai minmax(0, ...) supaya gak ada isi yang melebihi lebar layar; kalau melebihi, browser HP
		ngecilin seluruh halaman. HP (di bawah 500px): brand | user. 500px ke atas: brand | nav | user;
		label nav baru muncul dari md (768px), di antaranya nav berupa ikon doang biar muat.
		Nav di HP pindah ke bar bawah (Navigation layout="bar", di bawah).
	-->
	<AppBar.Toolbar class="grid-cols-[minmax(0,1fr)_auto] xs:grid-cols-[auto_minmax(0,1fr)_auto]">
		<AppBar.Lead class="col-start-1 row-start-1 min-w-0">
			<a href={data.user ? '/board' : '/'} class="flex items-center gap-2">
				<KanbanIcon class="size-6 shrink-0" />
				<!-- Satu baris, versi sejajar di garis dasar teks brand. -->
				<span class="flex items-baseline gap-2 whitespace-nowrap">
					<span class="text-lg font-bold sm:text-xl">Task Monitor</span>
					{#if data.version}
						<span class="text-[11px] font-normal opacity-60" title="Versi app">{versionLabel}</span>
					{/if}
				</span>
			</a>
		</AppBar.Lead>
		{#if data.user}
			<AppBar.Headline class="hidden min-w-0 xs:col-start-2 xs:row-start-1 xs:block">
				<nav class="flex items-center gap-1 overflow-x-auto" aria-label="Navigasi utama">
					{#each navItems as item (item.href)}
						{@const active = page.url.pathname === item.href}
						<a
							href={item.href}
							class="btn btn-sm {active ? 'preset-filled-primary-500' : 'btn-outline-neutral'}"
							aria-current={active ? 'page' : undefined}
							aria-label={item.label}
							title={item.label}
						>
							<item.icon class="size-4" />
							<span class="hidden md:inline">{item.label}</span>
						</a>
					{/each}
				</nav>
			</AppBar.Headline>
			<AppBar.Trail class="col-start-2 row-start-1 items-center xs:col-start-3">
				<div class="flex items-center gap-3 text-sm">
					<span class="flex items-center gap-2">
						<UserIcon class="size-5 shrink-0" />
						<span class="hidden md:inline">{data.user.name}</span>
						<span class="badge preset-tonal">{data.user.role}</span>
					</span>
					<form method="POST" action="/logout">
						<button type="submit" class="btn btn-sm btn-outline-neutral" aria-label="Keluar">
							<LogOutIcon class="size-4" />
							<span class="hidden md:inline">Keluar</span>
						</button>
					</form>
				</div>
			</AppBar.Trail>
		{/if}
	</AppBar.Toolbar>
</AppBar>

<main
	class="mx-auto w-full px-4 pt-6 sm:px-6 lg:px-8 {wide ? '' : 'max-w-[1600px]'} {data.user
		? 'pb-14 xs:pb-6'
		: 'pb-6'}"
>
	{@render children()}
</main>

<!-- HP: navigasi utama jadi bar di dasar layar (pola Skeleton "bar": 3 sampai 5 tile, nempel di bawah). -->
{#if data.user}
	<Navigation
		layout="bar"
		class="border-surface-300-700 fixed inset-x-0 bottom-0 z-40 border-t pt-0.5! pb-[max(0.125rem,env(safe-area-inset-bottom))]! xs:hidden"
		aria-label="Navigasi utama"
	>
		<Navigation.Menu>
			{#each navItems as item (item.href)}
				{@const active = page.url.pathname === item.href}
				<Navigation.TriggerAnchor
					href={item.href}
					class="min-w-0 flex-1 gap-0! py-px! {active ? 'preset-filled-primary-500' : ''}"
					aria-current={active ? 'page' : undefined}
				>
					<item.icon class="size-4" />
					<Navigation.TriggerText class="leading-3">{item.label}</Navigation.TriggerText>
				</Navigation.TriggerAnchor>
			{/each}
		</Navigation.Menu>
	</Navigation>
{/if}
