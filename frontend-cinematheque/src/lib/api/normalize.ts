import type { Book, Item } from "$lib/types"

const toNum = (v: unknown): number =>
	typeof v === "number" && !Number.isNaN(v) ? v : parseInt(String(v), 10) || 0

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

export interface LoadedCollections {
	loadedMovies: Item[]
	loadedDocumentaries: Item[]
	loadedSeries: Item[]
	loadedBooks: Book[]
	loadedComics: Book[]
}

export function normalizeApiPayload(
	moviesData: { movies?: unknown[] },
	seriesData: { series?: unknown[] },
	booksData: { books?: unknown[] },
): LoadedCollections {
	const mapFilmKind = (m: Record<string, unknown>): "movie" | "documentary" =>
		m.type === "documentary" ? "documentary" : "movie"

	const rawMovies = (moviesData.movies ?? []) as Record<string, unknown>[]
	const allFilms = rawMovies.map((m) => ({
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
	}))

	const loadedMovies = allFilms.filter(
		(f: { type: string }) => f.type !== "documentary",
	)
	const loadedDocumentaries = allFilms.filter(
		(f: { type: string }) => f.type === "documentary",
	)

	const rawSeries = (seriesData.series ?? []) as Record<string, unknown>[]
	const loadedSeries = rawSeries.map((s) => ({
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
	}))

	const mapBookKind = (b: Record<string, unknown>): "book" | "comic" =>
		b.type === "comic" ? "comic" : "book"

	const rawBooks = (booksData.books ?? []) as Record<string, unknown>[]
	const allBooks = rawBooks.map((b) => ({
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
	}))

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
