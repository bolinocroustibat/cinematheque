import { env } from "$env/dynamic/private"

export function resolveBackendBaseUrl(): string {
	const explicit = (env.API_URL || "").trim()
	if (explicit) return explicit.replace(/\/$/, "")
	const port = (env.API_PORT || "8000").trim()
	return `http://localhost:${port}`
}
