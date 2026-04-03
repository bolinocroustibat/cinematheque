// API client for backend (separate endpoints per resource)
const API_URL = import.meta.env.API_URL || "http://localhost:8000"

const toNum = (v: unknown): number =>
	typeof v === "number" && !Number.isNaN(v) ? v : parseInt(String(v), 10) || 0

/** Map backend item to frontend shape; fills missing fields. */
const mapConsumedAt = (item: {
	consumed_at?: string | null
	watched?: unknown
}): string | null => {
	if (item.consumed_at != null && item.consumed_at !== "")
		return item.consumed_at
	if (item.watched === "true" || item.watched === true)
		return new Date().toISOString()
	return null
}

export const loadFromAPI = async () => {
	const [moviesRes, seriesRes, booksRes] = await Promise.all([
		fetch(`${API_URL}/api/movies`),
		fetch(`${API_URL}/api/series`),
		fetch(`${API_URL}/api/books`),
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

	const mapFilmKind = (m: Record<string, unknown>): "movie" | "documentary" =>
		m.type === "documentary" ? "documentary" : "movie"

	const allFilms = (moviesData.movies ?? []).map(
		(m: Record<string, unknown>) => ({
			id: toNum(m.id),
			title: String(m.title ?? ""),
			director: m.director != null ? String(m.director) : undefined,
			year: toNum(m.year),
			type: mapFilmKind(m),
			consumed_at: mapConsumedAt(
				m as { consumed_at?: string | null; watched?: unknown },
			),
			poster: m.poster != null ? String(m.poster) : undefined,
			rating: m.rating != null ? toNum(m.rating) : undefined,
			recommendation_source:
				m.recommendation_source != null
					? String(m.recommendation_source)
					: undefined,
			country: m.country != null ? String(m.country) : undefined,
		}),
	)

	const loadedMovies = allFilms.filter(
		(f: { type: string }) => f.type !== "documentary",
	)
	const loadedDocumentaries = allFilms.filter(
		(f: { type: string }) => f.type === "documentary",
	)

	const loadedSeries = (seriesData.series ?? []).map(
		(s: Record<string, unknown>) => ({
			id: toNum(s.id),
			title: String(s.title ?? ""),
			creator: s.creator != null ? String(s.creator) : undefined,
			year: toNum(s.year),
			consumed_at: mapConsumedAt(
				s as { consumed_at?: string | null; watched?: unknown },
			),
			poster: s.poster != null ? String(s.poster) : undefined,
			rating: s.rating != null ? toNum(s.rating) : undefined,
			recommendation_source:
				s.recommendation_source != null
					? String(s.recommendation_source)
					: undefined,
			country: s.country != null ? String(s.country) : undefined,
			seasons: s.seasons != null ? toNum(s.seasons) : undefined,
		}),
	)

	const mapBookKind = (b: Record<string, unknown>): "book" | "comic" =>
		b.type === "comic" ? "comic" : "book"

	const allBooks = (booksData.books ?? []).map(
		(b: Record<string, unknown>) => ({
			id: toNum(b.id),
			title: String(b.title ?? ""),
			author: b.author != null ? String(b.author) : undefined,
			year: toNum(b.year),
			type: mapBookKind(b),
			consumed_at: mapConsumedAt(
				b as { consumed_at?: string | null; watched?: unknown },
			),
			poster: b.poster != null ? String(b.poster) : undefined,
			rating: b.rating != null ? toNum(b.rating) : undefined,
			recommendation_source:
				b.recommendation_source != null
					? String(b.recommendation_source)
					: undefined,
			country: b.country != null ? String(b.country) : undefined,
		}),
	)

	const loadedBooks = allBooks.filter(
		(b: { type: string }) => b.type === "book",
	)
	const loadedComics = allBooks.filter(
		(b: { type: string }) => b.type === "comic",
	)

	return {
		loadedMovies,
		loadedDocumentaries,
		loadedSeries,
		loadedBooks,
		loadedComics,
	}
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
				`${API_URL}/api/movies/fill-missing-posters?limit=${POSTER_FILL_BATCH}`,
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
		fetch(`${API_URL}/api/movies`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify([...movies, ...documentaries]),
		}),
		fetch(`${API_URL}/api/series`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(series),
		}),
		fetch(`${API_URL}/api/books`, {
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
