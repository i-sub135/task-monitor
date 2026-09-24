<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();
</script>

<svelte:head>
	<title>Masuk · Task Monitor</title>
</svelte:head>

<div class="mx-auto flex min-h-[60vh] w-full max-w-md flex-col justify-center">
	<form
		method="POST"
		use:enhance
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
			{#if form?.error}
				<span class="text-error-500 text-sm" role="alert">{form.error}</span>
			{/if}
		</label>

		<button type="submit" class="btn preset-filled-primary-500">Lanjut</button>
	</form>
</div>
