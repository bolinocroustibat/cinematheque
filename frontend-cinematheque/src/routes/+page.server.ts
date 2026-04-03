import { normalizeApiPayload } from "$lib/api/normalize"
import { resolveBackendBaseUrl } from "$lib/server/backendUrl"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async () => {
	const base = resolveBackendBaseUrl()

	try {
		const [moviesRes, seriesRes, booksRes] = await Promise.all([
			fetch(`${base}/api/movies`),
			fetch(`${base}/api/series`),
			fetch(`${base}/api/books`),
		])

		if (!moviesRes.ok || !seriesRes.ok || !booksRes.ok) {
			return { initial: null }
		}

		const [moviesData, seriesData, booksData] = await Promise.all([
			moviesRes.json(),
			seriesRes.json(),
			booksRes.json(),
		])

		return {
			initial: normalizeApiPayload(moviesData, seriesData, booksData),
		}
	} catch {
		return { initial: null }
	}
}
