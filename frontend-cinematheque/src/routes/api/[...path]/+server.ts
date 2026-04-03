import { resolveBackendBaseUrl } from "$lib/server/backendUrl"
import type { RequestHandler } from "./$types"

const proxy: RequestHandler = async ({ request, url, params }) => {
	const base = resolveBackendBaseUrl()
	const path = params.path ?? ""
	const target = new URL(`/api/${path}${url.search}`, base)

	const headers = new Headers()
	const contentType = request.headers.get("content-type")
	if (contentType) headers.set("content-type", contentType)

	const init: RequestInit = {
		method: request.method,
		headers,
	}

	if (request.method !== "GET" && request.method !== "HEAD") {
		init.body = await request.arrayBuffer()
	}

	const res = await fetch(target, init)

	const outHeaders = new Headers(res.headers)
	// Avoid encoding issues when forwarding
	outHeaders.delete("content-encoding")
	outHeaders.delete("transfer-encoding")

	return new Response(res.body, {
		status: res.status,
		statusText: res.statusText,
		headers: outHeaders,
	})
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
