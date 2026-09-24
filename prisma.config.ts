import { defineConfig } from 'prisma/config';

// Prisma CLI gak baca .env sendiri. Node bisa, tapi loadEnvFile lempar error kalau .env gak ada.
try {
	process.loadEnvFile();
} catch {
	// Gak ada .env, ambil dari environment proses.
}

// DATABASE_URL sengaja opsional di sini: `prisma generate` gak butuh koneksi (mis. pas build image).
// Perintah yang butuh DB (migrate) bakal gagal sendiri dengan pesan yang jelas kalau kosong.
const url = process.env.DATABASE_URL;

export default defineConfig({
	schema: 'prisma/schema.prisma',
	migrations: { path: 'prisma/migrations' },
	...(url ? { datasource: { url } } : {})
});
