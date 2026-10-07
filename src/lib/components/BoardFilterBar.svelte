<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { SearchIcon, XIcon } from '@lucide/svelte';
	import { filterQuery, isFilterActive, parseBoardFilter, type BoardFilter } from '$lib/utils/board-filter';
	import { platformLabels, platforms, taskTypes } from '$lib/utils/tasks';

	// TM-16: baris filter /board dan /board/list/[status]. Gak ada tombol Apply: ganti dropdown langsung
	// nyaring, ketik judul nyaring setelah jeda sebentar. Filter ditaruh di URL lewat goto (bukan submit GET
	// biasa) biar field kosong gak ikut jadi `?type=&platform=`.
	let { filter, creators }: { filter: BoardFilter; creators: { id: string; name: string }[] } = $props();

	let form = $state<HTMLFormElement>();
	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	const apply = () => {
		clearTimeout(searchTimer);
		if (!form) return;
		const params = new URLSearchParams();
		for (const [key, value] of new FormData(form)) if (typeof value === 'string') params.set(key, value);
		const next = parseBoardFilter(params);
		void goto(`${page.url.pathname}${filterQuery(next)}`, { keepFocus: true, noScroll: true, replaceState: true });
	};

	const onSearchInput = () => {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(apply, 300);
	};
</script>

<form
	bind:this={form}
	onsubmit={(e) => {
		e.preventDefault();
		apply();
	}}
	class="mb-6 flex flex-wrap items-center gap-2"
	role="search"
	aria-label="Filter tasks"
>
	<div class="relative min-w-48 flex-1">
		<SearchIcon class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 opacity-50" />
		<input
			type="search"
			name="q"
			class="input pl-9"
			placeholder="Search title"
			aria-label="Search title"
			value={filter.q}
			oninput={onSearchInput}
		/>
	</div>
	<select name="type" class="select w-36" aria-label="Type" value={filter.type ?? ''} onchange={apply}>
		<option value="">All types</option>
		{#each taskTypes as t (t)}
			<option value={t}>{t}</option>
		{/each}
	</select>
	<select name="platform" class="select w-40" aria-label="Platform" value={filter.platform ?? ''} onchange={apply}>
		<option value="">All platforms</option>
		{#each platforms as p (p)}
			<option value={p}>{platformLabels[p]}</option>
		{/each}
	</select>
	<select name="by" class="select w-48" aria-label="Created by" value={filter.by ?? ''} onchange={apply}>
		<option value="">Anyone</option>
		{#each creators as c (c.id)}
			<option value={c.id}>{c.name}</option>
		{/each}
	</select>
	{#if isFilterActive(filter)}
		<a
			href={page.url.pathname}
			data-sveltekit-replacestate
			data-sveltekit-noscroll
			class="btn btn-sm btn-outline-neutral inline-flex items-center gap-1"
		>
			<XIcon class="size-4" /> Reset
		</a>
	{/if}
</form>
