import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { sveltekit } from "@sveltejs/kit/vite"
import { defineConfig, loadEnv } from "vite"
import packageJson from "./package.json" with { type: "json" }

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, "..")
const envDir = fs.existsSync(path.join(repoRoot, "docker-compose.yaml"))
	? repoRoot
	: __dirname

export default defineConfig(({ mode }) => {
	const fileEnv = loadEnv(mode, envDir, "")
	const environment =
		(fileEnv.ENVIRONMENT || process.env.ENVIRONMENT || "").trim() || "unknown"

	return {
		envDir,
		plugins: [sveltekit()],
		define: {
			__APP_VERSION__: JSON.stringify(packageJson.version),
			"import.meta.env.VITE_TMDB_KEY": JSON.stringify(
				fileEnv.VITE_TMDB_KEY || process.env.VITE_TMDB_KEY || "",
			),
			"import.meta.env.VITE_OMDB_KEY": JSON.stringify(
				fileEnv.VITE_OMDB_KEY || process.env.VITE_OMDB_KEY || "",
			),
			"import.meta.env.ENVIRONMENT": JSON.stringify(environment),
		},
	}
})
