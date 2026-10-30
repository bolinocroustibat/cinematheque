import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import adapter from "@sveltejs/adapter-static"
import { sveltekit } from "@sveltejs/kit/vite"
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig, loadEnv } from "vite"
import packageJson from "./package.json" with { type: "json" }

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, "..")
const envDir = fs.existsSync(path.join(repoRoot, "docker-compose.yaml"))
	? repoRoot
	: __dirname

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, envDir, "")
	const apiUrl = env.API_URL || `http://localhost:${env.API_PORT || "8000"}`

	return {
		envDir,
		plugins: [
			sveltekit({
				preprocess: vitePreprocess(),
				adapter: adapter({ fallback: "index.html" }),
				paths: { base: "/palettes" },
			}),
			tailwindcss(),
		],
		define: { __APP_VERSION__: JSON.stringify(packageJson.version) },
		// Same-origin /api in dev and preview
		server: { proxy: { "/api": apiUrl } },
		preview: { proxy: { "/api": apiUrl } },
	}
})
