// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: import('$lib/roles').SessionUser | null;
			/** true kalau DB gak bisa dihubungi pas request ini masuk (diisi di hooks). */
			dbDown: boolean;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
