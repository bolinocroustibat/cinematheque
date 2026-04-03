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

	const loadedMovies = (moviesData.movies ?? []).map(
		(m: Record<string, unknown>) => ({
			id: toNum(m.id),
			title: String(m.title ?? ""),
			director: m.director != null ? String(m.director) : undefined,
			year: toNum(m.year),
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

	return { loadedMovies, loadedSeries, loadedBooks, loadedComics }
}

export const saveToAPI = async (
	movies: unknown[],
	series: unknown[],
	books: unknown[],
	comics: unknown[],
) => {
	const [moviesRes, seriesRes, booksRes] = await Promise.all([
		fetch(`${API_URL}/api/movies`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(movies),
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
