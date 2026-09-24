<script lang="ts">
	import { BugIcon, SparklesIcon, PaperclipIcon } from '@lucide/svelte';

	type Status = 'request' | 'queue' | 'in-progress' | 'done' | 'rejected';
	type MockTask = {
		id: string;
		title: string;
		type: 'bug' | 'feature';
		status: Status;
		createdBy: string;
		attachments: number;
	};

	// Mock data, diganti query Prisma di TM-2+.
	const tasks: MockTask[] = [
		{ id: 'a1', title: 'Banner promo gak muncul di halaman checkout', type: 'bug', status: 'request', createdBy: 'Sari', attachments: 2 },
		{ id: 'a2', title: 'Tambah filter tanggal di laporan kampanye', type: 'feature', status: 'request', createdBy: 'Dimas', attachments: 0 },
		{ id: 'b1', title: 'Export leads ke CSV', type: 'feature', status: 'queue', createdBy: 'Sari', attachments: 1 },
		{ id: 'b2', title: 'Link unsubscribe di email salah domain', type: 'bug', status: 'queue', createdBy: 'Rina', attachments: 0 },
		{ id: 'c1', title: 'Landing page campaign Oktober', type: 'feature', status: 'in-progress', createdBy: 'Dimas', attachments: 4 },
		{ id: 'd1', title: 'Fix typo di footer website', type: 'bug', status: 'done', createdBy: 'Rina', attachments: 1 },
		{ id: 'e1', title: 'Ganti seluruh brand color', type: 'feature', status: 'rejected', createdBy: 'Sari', attachments: 0 }
	];

	const columns: { status: Status; label: string }[] = [
		{ status: 'request', label: 'Request' },
		{ status: 'queue', label: 'Queue' },
		{ status: 'in-progress', label: 'In progress' },
		{ status: 'done', label: 'Done' },
		{ status: 'rejected', label: 'Rejected' }
	];
</script>

<div class="mb-4 flex items-baseline justify-between">
	<h1 class="h3">Papan task</h1>
	<p class="text-sm opacity-70">{tasks.length} task (data mock)</p>
</div>

<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
	{#each columns as col (col.status)}
		{@const items = tasks.filter((t) => t.status === col.status)}
		<section class="card preset-filled-surface-100-900 flex flex-col gap-3 p-3">
			<header class="flex items-center justify-between">
				<h2 class="font-semibold">{col.label}</h2>
				<span class="badge preset-tonal">{items.length}</span>
			</header>

			{#each items as task (task.id)}
				<article
					class="card preset-filled-surface-50-950 border-surface-300-700 flex flex-col gap-2 border p-3 shadow-xl transition-shadow hover:shadow-2xl"
				>
					<div class="flex items-center gap-2 text-xs">
						{#if task.type === 'bug'}
							<span class="badge preset-filled-error-500"><BugIcon class="size-3" /> bug</span>
						{:else}
							<span class="badge preset-filled-primary-500"><SparklesIcon class="size-3" /> feature</span>
						{/if}
					</div>
					<p class="font-medium">{task.title}</p>
					<footer class="flex items-center justify-between text-xs opacity-70">
						<span>oleh {task.createdBy}</span>
						{#if task.attachments > 0}
							<span class="flex items-center gap-1"><PaperclipIcon class="size-3" />{task.attachments}</span>
						{/if}
					</footer>
				</article>
			{:else}
				<p class="py-4 text-center text-sm opacity-50">Kosong</p>
			{/each}
		</section>
	{/each}
</div>
