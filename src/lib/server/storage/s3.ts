import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { isAttachmentKey } from './keys.ts';
import type { StorageDriver } from './types.ts';

export type S3Config = {
	region: string;
	bucket: string;
	accessKeyId: string;
	secretAccessKey: string;
	endpoint: string;
	/** Path-style (`endpoint/bucket/key`). Perlu buat MinIO, Wasabi gak. */
	forcePathStyle: boolean;
	/**
	 * `default` = bawaan SDK (checksum ikut dikirim di tiap request). `when_required` = SDK cuma ngirim checksum
	 * kalau operasinya mewajibkan. Ini jalan keluar kalau provider nolak checksum bawaan.
	 */
	checksum: 'default' | 'when_required';
};

const isNotFound = (e: unknown): boolean => {
	const err = e as { name?: string; $metadata?: { httpStatusCode?: number } };
	return err?.name === 'NoSuchKey' || err?.name === 'NotFound' || err?.$metadata?.httpStatusCode === 404;
};

/** Simpan ke bucket S3-compatible (Wasabi, MinIO, AWS). Key objek = file_path di DB. */
export function createS3Storage(config: S3Config, client?: S3Client): StorageDriver {
	const s3 =
		client ??
		new S3Client({
			region: config.region,
			endpoint: config.endpoint,
			forcePathStyle: config.forcePathStyle,
			credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
			...(config.checksum === 'when_required'
				? { requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED' }
				: {})
		});
	const Bucket = config.bucket;

	return {
		name: 's3',

		async put(Key, bytes, contentType) {
			if (!isAttachmentKey(Key)) throw new Error(`Key lampiran tidak valid: ${Key}`);
			await s3.send(new PutObjectCommand({ Bucket, Key, Body: bytes, ContentType: contentType }));
		},

		async get(Key) {
			if (!isAttachmentKey(Key)) return null;
			try {
				const res = await s3.send(new GetObjectCommand({ Bucket, Key }));
				return res.Body ? await res.Body.transformToByteArray() : null;
			} catch (e) {
				if (isNotFound(e)) return null;
				throw e;
			}
		},

		async remove(keys) {
			// Satu-satu (maks 5 lampiran per task). Lanjut walau ada yang gagal, lalu lapor yang pertama gagal.
			let firstError: unknown;
			for (const Key of keys) {
				if (!isAttachmentKey(Key)) continue;
				try {
					await s3.send(new DeleteObjectCommand({ Bucket, Key }));
				} catch (e) {
					firstError ??= e;
				}
			}
			if (firstError) throw firstError;
		}
	};
}
