import { serve } from "bun"
import { getAllItems, saveAllItems, type StoredItem } from "./db"

// @ts-ignore - process.env is available at runtime in Bun
const PORT = parseInt(process.env.PORT || "8000", 10)
// @ts-ignore - process.env is available at runtime in Bun
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000"

const corsHeaders = {
	"Access-Control-Allow-Origin": CORS_ORIGIN,
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
}

function handleCORS(req: Request): Response | null {
	if (req.method === "OPTIONS") {
		return new Response(null, {
			status: 204,
			headers: corsHeaders,
		})
	}
	return null
}

serve({
	port: PORT,
	async fetch(req: Request): Promise<Response> {
		const url = new URL(req.url)

		// Handle CORS preflight
		const corsResponse = handleCORS(req)
		if (corsResponse) return corsResponse

		// Health check
		if (url.pathname === "/health") {
			return new Response(JSON.stringify({ status: "ok" }), {
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			})
		}

		// GET /api/items - Load all items
		if (url.pathname === "/api/items" && req.method === "GET") {
			try {
				const items = getAllItems()
				return new Response(JSON.stringify(items), {
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				})
			} catch (error) {
				console.error("Error loading items:", error)
				return new Response(
					JSON.stringify({ error: "Failed to load items" }),
					{
						status: 500,
						headers: { ...corsHeaders, "Content-Type": "application/json" },
					},
				)
			}
		}

		// POST /api/items - Save all items
		if (url.pathname === "/api/items" && req.method === "POST") {
			try {
				const body = await req.json()
				const items: StoredItem[] = Array.isArray(body) ? body : []

				// Validate items have required fields
				if (
					!items.every(
						(item) =>
							typeof item.id === "number" &&
							typeof item.type === "string" &&
							typeof item.title === "string" &&
							typeof item.year === "number",
					)
				) {
					return new Response(
						JSON.stringify({ error: "Invalid item data" }),
						{
							status: 400,
							headers: { ...corsHeaders, "Content-Type": "application/json" },
						},
					)
				}

				saveAllItems(items)

				return new Response(JSON.stringify({ success: true }), {
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				})
			} catch (error) {
				console.error("Error saving items:", error)
				return new Response(
					JSON.stringify({ error: "Failed to save items" }),
					{
						status: 500,
						headers: { ...corsHeaders, "Content-Type": "application/json" },
					},
				)
			}
		}

		// 404 for unknown routes
		return new Response(JSON.stringify({ error: "Not found" }), {
			status: 404,
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		})
	},
})

console.log(`Backend API server running at http://localhost:${PORT}`)
console.log(`CORS enabled for: ${CORS_ORIGIN}`)
