import { normalizeApiPayload } from "$lib/api/normalize"

const toNum = (v: unknown): number =>
	typeof v === "number" && !Number.isNaN(v) ? v : parseInt(String(v), 10) || 0

const LOAD_FETCH_TIMEOUT_MS = 45_000

function fetchWithTimeout(
	url: string,
	init: RequestInit = {},
	timeoutMs = LOAD_FETCH_TIMEOUT_MS,
): Promise<Response> {
	const controller = new AbortController()
	const id = setTimeout(() => controller.abort(), timeoutMs)
	return fetch(url, { ...init, signal: controller.signal }).finally(() =>
		clearTimeout(id),
	)
}

export const loadFromAPI = async () => {
	const [moviesRes, seriesRes, booksRes] = await Promise.all([
		fetchWithTimeout("/api/movies"),
		fetchWithTimeout("/api/series"),
		fetchWithTimeout("/api/books"),
	])

	if (!moviesRes.ok)
		throw new Error(`Failed to load movies: ${moviesRes.statusText}`)
	if (!seriesRes.ok)
		throw new Error(`Failed to load series: ${seriesRes.statusText}`)
	if (!booksRes.ok)
		throw new Error(`Failed to load books: ${booksRes.statusText}`)

	const [moviesData, seriesData, booksData] = await Promise.all([
		moviesRes.json(),
		seriesRes.json(),
		booksRes.json(),
	])

	return normalizeApiPayload(moviesData, seriesData, booksData)
}

const POSTER_FILL_BATCH = 25
const POSTER_FILL_FETCH_MS = 120_000
const POSTER_FILL_MAX_ROUNDS = 120

/**
 * Walks the server's missing-poster queue in small batches so each HTTP call stays bounded.
 */
export const fillMissingMoviePosters = async (
	onProgress?: (label: string) => void,
): Promise<{ updated: number; ids: number[] }> => {
	let totalUpdated = 0
	const allIds: number[] = []
	let zeroProgressFullBatches = 0

	for (let round = 1; round <= POSTER_FILL_MAX_ROUNDS; round++) {
		onProgress?.(String(round))
		const controller = new AbortController()
		const timeoutId = window.setTimeout(
			() => controller.abort(),
			POSTER_FILL_FETCH_MS,
		)
		try {
			const res = await fetch(
				`/api/movies/fill-missing-posters?limit=${POSTER_FILL_BATCH}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					signal: controller.signal,
				},
			)
			if (!res.ok) {
				throw new Error(`Failed to fill missing posters: ${res.statusText}`)
			}
			const data = (await res.json()) as {
				updated?: unknown
				ids?: unknown
				processed?: unknown
				more_pending?: unknown
			}
			const updated = toNum(data.updated)
			const processed = toNum(data.processed)
			const morePending = Boolean(data.more_pending)
			totalUpdated += updated
			if (Array.isArray(data.ids)) {
				allIds.push(...data.ids.map((id) => toNum(id)))
			}
			if (!morePending || processed === 0) {
				break
			}
			if (processed === POSTER_FILL_BATCH && updated === 0 && morePending) {
				zeroProgressFullBatches++
				if (zeroProgressFullBatches >= 2) {
					break
				}
			} else {
				zeroProgressFullBatches = 0
			}
		} finally {
			window.clearTimeout(timeoutId)
		}
	}

	return { updated: totalUpdated, ids: allIds }
}

export const saveToAPI = async (
	movies: unknown[],
	series: unknown[],
	books: unknown[],
	comics: unknown[],
	documentaries: unknown[],
) => {
	const [moviesRes, seriesRes, booksRes] = await Promise.all([
		fetch("/api/movies", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify([...movies, ...documentaries]),
		}),
		fetch("/api/series", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(series),
		}),
		fetch("/api/books", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify([...books, ...comics]),
		}),
	])

	if (!moviesRes.ok)
		throw new Error(`Failed to save movies: ${moviesRes.statusText}`)
	if (!seriesRes.ok)
		throw new Error(`Failed to save series: ${seriesRes.statusText}`)
	if (!booksRes.ok)
		throw new Error(`Failed to save books: ${booksRes.statusText}`)
}
