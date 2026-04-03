import { env } from "$env/dynamic/private"
import { sortColorsByProximity } from "$lib/utils"
import type { PageServerLoad } from "./$types"

function resolveApiBaseUrl(): string {
	const explicit = (env.API_URL || "").trim()
	if (explicit) return explicit
	const port = (env.API_PORT || "8000").trim()
	return `http://localhost:${port}`
}

export const load: PageServerLoad = async ({ fetch }) => {
	const apiUrl = resolveApiBaseUrl()

	try {
		const res = await fetch(`${apiUrl}/api/movies`)
		if (!res.ok) {
			console.error(`[Server] API error: ${res.status} ${res.statusText}`)
			return { movies: [] }
		}

		const { movies } = await res.json()

		const fictionOnly = (movies as Record<string, unknown>[]).filter(
			(m) => (m.type as string | undefined) !== "documentary",
		)

		return {
			movies: fictionOnly.map((movie: Record<string, unknown>) => ({
				...movie,
				palettes: (movie.palettes as Record<string, unknown>[])?.map(
					(palette) => ({
						...palette,
						colors: sortColorsByProximity((palette.colors as string[]) || []),
					}),
				),
			})),
		}
	} catch (error) {
		console.error("[Server] API fetch error:", error)
		return { movies: [] }
	}
}
