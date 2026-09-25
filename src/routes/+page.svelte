<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let dialog = $state<HTMLDialogElement>();
	let downDialog = $state<HTMLDialogElement>();
	let password = $state('');
	let retrying = $state(false);

	// DB gak bisa dihubungi: dari ping pas halaman dibuka, atau dari submit yang gagal.
	const unavailable = $derived(data.dbUnavailable || form?.dbUnavailable === true);

	$effect(() => {
		if (unavailable && downDialog && !downDialog.open) downDialog.showModal();
	});

	// Muat ulang penuh: nge-reset state form dan nge-ping DB lagi. DB udah balik = modalnya hilang.
	function retry() {
		retrying = true;
		location.reload();
	}

	// Akun admin: setelah "Lanjut", server minta password. Buka dialognya (juga pas password salah).
	$effect(() => {
		if (form?.needsPassword && dialog && !dialog.open) dialog.showModal();
	});
</script>

<svelte:head>
	<title>Masuk · Task Monitor</title>
</svelte:head>

<div class="mx-auto flex min-h-[60vh] w-full max-w-md flex-col justify-center">
	<form
		method="POST"
		use:enhance={() =>
			async ({ update }) => {
				await update({ reset: false });
				password = '';
			}}
		class="form-comfy card preset-filled-surface-50-950 border-surface-300-700 flex flex-col gap-6 border p-6 shadow-xl"
	>
		<div class="flex flex-col gap-2">
			<h1 class="h3">Masuk</h1>
			<p class="text-sm opacity-70">Masukkan email kamu untuk lanjut.</p>
		</div>

		<label class="label">
			<span class="label-text font-semibold">Email</span>
			<input
				class="input"
				type="email"
				name="email"
				autocomplete="email"
				required
				value={form?.email ?? ''}
			/>
			{#if form?.error && !form?.needsPassword}
				<span class="text-error-500 text-sm" role="alert">{form.error}</span>
			{/if}
		</label>

		<button type="submit" class="btn preset-filled-primary-500">Lanjut</button>

		<dialog
			bind:this={dialog}
			class="card preset-filled-surface-50-950 border-surface-300-700 m-auto w-full max-w-sm border p-6 shadow-2xl backdrop:bg-black/40"
		>
			<div class="flex flex-col gap-4">
				<div class="flex flex-col gap-1">
					<h2 class="h4">Masukkan password</h2>
					<p class="text-sm opacity-70">Akun ini butuh password.</p>
				</div>
				<label class="label">
					<span class="label-text font-semibold">Password</span>
					<input
						class="input"
						type="password"
						name="password"
						autocomplete="current-password"
						bind:value={password}
					/>
					{#if form?.error}
						<span class="text-error-500 text-sm" role="alert">{form.error}</span>
					{/if}
				</label>
				<div class="flex justify-end gap-3">
					<button type="button" class="btn preset-tonal" onclick={() => dialog?.close()}>
						Batal
					</button>
					<button type="submit" class="btn preset-filled-primary-500">Masuk</button>
				</div>
			</div>
		</dialog>
	</form>
</div>

{#if unavailable}
	<dialog
		bind:this={downDialog}
		oncancel={(e) => e.preventDefault()}
		aria-labelledby="down-title"
		class="card preset-filled-surface-50-950 border-surface-300-700 m-auto w-full max-w-sm border p-6 shadow-2xl backdrop:bg-black/50"
	>
		<div class="flex flex-col gap-4">
			<div class="flex flex-col gap-1">
				<h2 id="down-title" class="h4">Layanan tidak tersedia</h2>
				<p class="text-sm opacity-70">
					Database sedang tidak bisa dihubungi, jadi kamu belum bisa masuk. Coba lagi beberapa saat
					lagi. Kalau terus begini, kabari admin.
				</p>
			</div>
			<div class="flex justify-end">
				<button type="button" class="btn preset-filled-primary-500" disabled={retrying} onclick={retry}>
					{retrying ? 'Memuat ulang…' : 'Coba lagi'}
				</button>
			</div>
		</div>
	</dialog>
{/if}
