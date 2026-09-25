/** Tempat nyimpen file lampiran. Key-nya string, sama persis dengan task_attachment.file_path di DB. */
export interface StorageDriver {
	readonly name: 'local' | 's3';
	put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
	/** null kalau objeknya gak ada. Error lain (izin, jaringan) dilempar, bukan diam-diam jadi null. */
	get(key: string): Promise<Uint8Array | null>;
	/** Hapus objek yang ada; yang gak ada dilewat. */
	remove(keys: string[]): Promise<void>;
}
