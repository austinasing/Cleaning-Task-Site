// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
//
// app.d.ts is where you define global TypeScript types for your SvelteKit app.
// The key one is App.Locals - this is data attached to every server-side request.
// When hooks.server.ts verifies the JWT cookie, it puts the user info here
// so every route handler can access it via event.locals.user
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: {
				userId: string;
				name: string;
				role: 'member' | 'admin' | 'accountant';
			} | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
