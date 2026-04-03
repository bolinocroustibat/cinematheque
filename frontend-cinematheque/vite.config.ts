import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import packageJson from "./package.json"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
	const appEnv = loadEnv(mode, __dirname, "")
	const repoRoot = path.resolve(__dirname, "..")
	const rootEnv = fs.existsSync(path.join(repoRoot, "docker-compose.yaml"))
		? loadEnv(mode, repoRoot, "")
		: {}
	const fileEnv = { ...rootEnv, ...appEnv }
	const apiPort = (fileEnv.API_PORT || process.env.API_PORT || "8000").trim()
	const apiUrl =
		(fileEnv.API_URL || process.env.API_URL || "").trim() ||
		`http://localhost:${apiPort}`
	const environment =
		(fileEnv.ENVIRONMENT || process.env.ENVIRONMENT || "").trim() || "unknown"

	const envDir = fs.existsSync(path.join(repoRoot, "docker-compose.yaml"))
		? repoRoot
		: __dirname

	return {
		envDir,
		plugins: [react()],
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "./src"),
			},
		},
		build: {
			outDir: "dist",
			assetsDir: "assets",
			minify: "esbuild",
			rollupOptions: {
				output: {
					manualChunks: undefined,
				},
			},
		},
		publicDir: "public",
		root: ".",
		define: {
			__APP_VERSION__: JSON.stringify(packageJson.version),
			"import.meta.env.API_URL": JSON.stringify(apiUrl),
			"import.meta.env.ENVIRONMENT": JSON.stringify(environment),
		},
	}
})
