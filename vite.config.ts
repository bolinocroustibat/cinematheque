import path from "path"
import { fileURLToPath } from "url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import packageJson from "./package.json"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
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
	},
})
