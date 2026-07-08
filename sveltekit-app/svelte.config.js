import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// Self-hosted Node server, run inside Docker on the rented server.
		adapter: adapter()
	}
};

export default config;
