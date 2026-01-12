import { serve } from "bun"
import { readdir, stat } from "fs/promises"
import { join, extname } from "path"
import { fileURLToPath } from "url"
import { dirname } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const PORT = process.env.PORT || 3000
const STATIC_DIR = join(__dirname, "dist")

console.log(`Static directory: ${STATIC_DIR}`)

const MIME_TYPES = {
	".html": "text/html",
	".js": "application/javascript",
	".css": "text/css",
	".json": "application/json",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".svg": "image/svg+xml",
	".ico": "image/x-icon",
	".woff": "font/woff",
	".woff2": "font/woff2",
	".ttf": "font/ttf",
	".eot": "application/vnd.ms-fontobject",
}

async function getFile(path) {
	try {
		const fullPath = join(STATIC_DIR, path)
		const file = Bun.file(fullPath)
		if (await file.exists()) {
			return file
		}
		return null
	} catch {
		return null
	}
}

serve({
	port: PORT,
	async fetch(req) {
		const url = new URL(req.url)
		let pathname = url.pathname

		// Default to index.html for root
		if (pathname === "/") {
			pathname = "/index.html"
		}

		// Try to serve the requested file
		let file = await getFile(pathname)
		
		// If file not found and it's not an asset, try index.html (SPA routing)
		if (!file && !pathname.includes(".")) {
			file = await getFile("/index.html")
		}

		if (file) {
			const ext = extname(pathname)
			const contentType = MIME_TYPES[ext] || "application/octet-stream"
			return new Response(file, {
				headers: {
					"Content-Type": contentType,
				},
			})
		}

		console.log(`404: ${pathname}`)
		return new Response("Not Found", { status: 404 })
	},
})

console.log(`Server running at http://localhost:${PORT}`)
