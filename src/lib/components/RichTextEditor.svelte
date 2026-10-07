<script lang="ts">
	// TM-10: wrapper Svelte 5 tipis di atas Tiptap (vanilla @tiptap/core, bukan paket React).
	// Editor cuma nulis ke elemen DOM yang di-bind, jadi gak butuh binding framework resmi.
	import { onDestroy, type Snippet } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Placeholder from '@tiptap/extension-placeholder';
	import { BoldIcon, ItalicIcon, UnderlineIcon, ListIcon, ListOrderedIcon, QuoteIcon } from '@lucide/svelte';

	let {
		name,
		value = '',
		required = false,
		placeholder = '',
		invalid = false,
		compact = false,
		actions
	}: {
		name: string;
		value?: string;
		required?: boolean;
		placeholder?: string;
		invalid?: boolean;
		/** TM-23: kotak isi mulai setinggi 1 baris (buat komentar), melar sendiri pas isinya nambah. */
		compact?: boolean;
		/** TM-23: tombol (mis. kirim) di baris bawah sebelah kanan, sejajar toolbar. Cuma dipakai pas `compact`. */
		actions?: Snippet;
	} = $props();

	let mount = $state<HTMLDivElement>();
	let hiddenInput = $state<HTMLInputElement>();
	let editor: Editor | undefined;
	// Dipakai buat nyalain/matiin tombol toolbar sesuai posisi kursor (mis. Bold aktif pas di dalam teks tebal).
	let active = $state({ bold: false, italic: false, underline: false, bulletList: false, orderedList: false, blockquote: false });

	const syncActive = () => {
		if (!editor) return;
		active = {
			bold: editor.isActive('bold'),
			italic: editor.isActive('italic'),
			underline: editor.isActive('underline'),
			bulletList: editor.isActive('bulletList'),
			orderedList: editor.isActive('orderedList'),
			blockquote: editor.isActive('blockquote')
		};
	};

	$effect(() => {
		if (!mount || editor) return;
		editor = new Editor({
			element: mount,
			extensions: [
				StarterKit.configure({
					heading: false,
					code: false,
					codeBlock: false,
					strike: false,
					horizontalRule: false,
					link: false
				}),
				Placeholder.configure({ placeholder })
			],
			content: value,
			editorProps: {
				attributes: {
					class: `rich-text rich-text-input focus:outline-none ${compact ? '' : 'min-h-[8rem]'} px-3 py-2 text-sm`
				}
			},
			onUpdate: ({ editor: e }) => {
				if (hiddenInput) hiddenInput.value = e.getHTML();
				// ProseMirror "sticky marks": abis semua isi dihapus, mark terakhir (mis. bold) masih
				// nempel di storedMarks dan ke-warisin ke karakter berikutnya walau gak keliatan apa-apa
				// di layar. Reset begitu dokumen kosong biar toolbar/format gak nyala sendiri pas mulai
				// ngetik ulang.
				if (e.isEmpty && e.state.storedMarks?.length) e.commands.unsetAllMarks();
				syncActive();
			},
			onSelectionUpdate: syncActive,
			onTransaction: syncActive
		});
		if (hiddenInput) hiddenInput.value = editor.getHTML();
	});

	onDestroy(() => editor?.destroy());

	const toolbar = [
		{ key: 'bold' as const, label: 'Bold', Icon: BoldIcon, run: () => editor?.chain().focus().toggleBold().run() },
		{ key: 'italic' as const, label: 'Italic', Icon: ItalicIcon, run: () => editor?.chain().focus().toggleItalic().run() },
		{ key: 'underline' as const, label: 'Underline', Icon: UnderlineIcon, run: () => editor?.chain().focus().toggleUnderline().run() },
		{ key: 'bulletList' as const, label: 'Bullet list', Icon: ListIcon, run: () => editor?.chain().focus().toggleBulletList().run() },
		{ key: 'orderedList' as const, label: 'Numbered list', Icon: ListOrderedIcon, run: () => editor?.chain().focus().toggleOrderedList().run() },
		{ key: 'blockquote' as const, label: 'Indent', Icon: QuoteIcon, run: () => editor?.chain().focus().toggleBlockquote().run() }
	];
</script>

{#snippet toolbarButtons()}
	{#each toolbar as tool (tool.key)}
		<button
			type="button"
			class="btn-icon btn-icon-sm"
			class:preset-filled-primary-500={active[tool.key]}
			class:btn-outline-neutral={!active[tool.key]}
			aria-label={tool.label}
			aria-pressed={active[tool.key]}
			title={tool.label}
			onclick={tool.run}
		>
			<tool.Icon class="size-4" />
		</button>
	{/each}
{/snippet}

<!-- compact (komentar): panelnya kotak sudut tumpul, bukan sudut bulet gede kayak card. -->
<div
	class="rich-text-editor border-surface-300-700 border {compact ? 'rounded-md' : 'rounded-container'}"
	class:border-error-500={invalid}
>
	{#if !compact}
		<div class="border-surface-300-700 flex justify-end gap-1 border-b p-1 pr-3">
			{@render toolbarButtons()}
		</div>
	{/if}
	<div bind:this={mount}></div>
	{#if compact}
		<!-- TM-23: toolbar kiri bawah, tombol aksi (kirim/simpan) kanan bawah, satu baris. -->
		<div class="border-surface-300-700 flex flex-wrap items-center gap-1 border-t p-1.5">
			{@render toolbarButtons()}
			{#if actions}<div class="ml-auto flex items-center gap-2">{@render actions()}</div>{/if}
		</div>
	{/if}
	<!-- Isi editor disinkron ke sini tiap update, jadi form action server tetap baca FormData biasa. -->
	<input bind:this={hiddenInput} id={name} type="hidden" {name} {required} />
</div>

<style>
	/* Styling list/blockquote/paragraf (.rich-text) ada di app.css, dipakai bareng sama halaman
	   detail task. Di sini cuma yang spesifik buat mode edit: placeholder pas kosong. */
	/* Placeholder resmi Tiptap (@tiptap/extension-placeholder): nandain node kosong lewat
	   is-empty + data-placeholder, kita tinggal render-nya. */
	.rich-text-editor :global(.rich-text-input p.is-editor-empty:first-child::before) {
		content: attr(data-placeholder);
		float: left;
		height: 0;
		opacity: 0.5;
		pointer-events: none;
	}
</style>
