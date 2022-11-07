import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
const production = process.env.NODE_ENV === 'production';
import sveltePreprocess from 'svelte-preprocess';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
		svelte({
			emitCss: production,
			preprocess: sveltePreprocess(),
			compilerOptions: {
				dev: !production,
			},

			// @ts-ignore This is temporary until the type definitions are fixed!
			hot: !production
		}),
	],
})
