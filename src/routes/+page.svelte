<script lang="ts">
	import { BugIcon, SparklesIcon, PaperclipIcon } from '@lucide/svelte';
	import { tasks, statusLabels, type Status } from '$lib/mock/tasks';

	const columns = Object.keys(statusLabels) as Status[];
</script>

<div class="mb-4 flex items-baseline justify-between">
	<h1 class="h3">Board task</h1>
	<p class="text-sm opacity-70">{tasks.length} task (data mock)</p>
</div>

<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
	{#each columns as status (status)}
		{@const items = tasks.filter((t) => t.status === status)}
		<section class="card preset-filled-surface-100-900 flex flex-col gap-3 p-3">
			<header class="flex items-center justify-between">
				<h2 class="font-semibold">{statusLabels[status]}</h2>
				<span class="badge preset-tonal">{items.length}</span>
			</header>

			{#each items as task (task.id)}
				<a
					href="/task/{task.id}"
					class="card preset-filled-surface-50-950 border-surface-300-700 hover:border-primary-500 focus-visible:outline-primary-500 flex cursor-pointer flex-col gap-2 border p-3 shadow-xl transition duration-150 hover:-translate-y-1 hover:shadow-2xl focus-visible:outline-2"
				>
					<div class="flex items-center gap-2 text-xs">
						{#if task.type === 'bug'}
							<span class="badge preset-filled-error-500"><BugIcon class="size-3" /> bug</span>
						{:else}
							<span class="badge preset-filled-primary-500"
								><SparklesIcon class="size-3" /> feature</span
							>
						{/if}
					</div>
					<p class="font-medium">{task.title}</p>
					<footer class="flex items-center justify-between text-xs opacity-70">
						<span>oleh {task.createdBy}</span>
						{#if task.attachments.length > 0}
							<span class="flex items-center gap-1"
								><PaperclipIcon class="size-3" />{task.attachments.length}</span
							>
						{/if}
					</footer>
				</a>
			{:else}
				<p class="py-4 text-center text-sm opacity-50">Kosong</p>
			{/each}
		</section>
	{/each}
</div>
