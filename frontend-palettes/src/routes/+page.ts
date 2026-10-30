import type { Movie } from "#lib/types.js"
import { sortColorsByProximity } from "#lib/utils.js"
import type { PageLoad } from "./$types"

// Static build: data is fetched by the browser from the backend
// on the same origin (Vite proxies /api in dev)
export const ssr = false

export const load: PageLoad = async ({ fetch }) => {
	try {
		const res = await fetch("/api/movies")
		if (!res.ok) {
			console.error(`API error: ${res.status} ${res.statusText}`)
			return { movies: [] as Movie[] }
		}

		const { movies }: { movies: Movie[] } = await res.json()

		return {
			movies: movies
				.filter((movie) => movie.type !== "documentary")
				.map((movie) => ({
					...movie,
					palettes: movie.palettes?.map((palette) => ({
						...palette,
						colors: sortColorsByProximity(palette.colors || []),
					})),
				})),
		}
	} catch (error) {
		console.error("API fetch error:", error)
		return { movies: [] as Movie[] }
	}
}
