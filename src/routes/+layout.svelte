<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { AppBar } from '@skeletonlabs/skeleton-svelte';
	import { KanbanIcon, PlusIcon, UsersIcon, UserIcon } from '@lucide/svelte';

	let { children } = $props();

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
			<!-- Mock: session user belum ada, nyusul TM-3 -->
			<div class="flex items-center gap-2 text-sm">
				<UserIcon class="size-5" />
				<span>Sari</span>
				<span class="badge preset-tonal">marketing</span>
			</div>
		</AppBar.Trail>
	</AppBar.Toolbar>
</AppBar>

<main class="mx-auto w-full max-w-[1600px] p-4">
	{@render children()}
</main>
