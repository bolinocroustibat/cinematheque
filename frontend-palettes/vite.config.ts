import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { sveltekit } from "@sveltejs/kit/vite"
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
		plugins: [sveltekit(), tailwindcss()],
		define: {
			__APP_VERSION__: JSON.stringify(packageJson.version),
		},
		// Same-origin /api in dev and preview when PUBLIC_API_URL is unset
		server: { proxy: { "/api": apiUrl } },
		preview: { proxy: { "/api": apiUrl } },
	}
})
