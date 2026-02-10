// API client for backend
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

export const loadFromAPI = async () => {
	const res = await fetch(`${API_URL}/api/items`)
	if (!res.ok) {
		throw new Error(`Failed to load items: ${res.statusText}`)
	}
	const data = await res.json()

	const toConsumedAt = (item: { consumed_at?: string | null; watched?: unknown }) =>
		item.consumed_at != null && item.consumed_at !== ""
			? item.consumed_at
			: item.watched === "true" || item.watched === true
				? new Date().toISOString()
				: null

	const loadedMovies = data
		.filter((item) => item.type === "film" || !item.type)
		.map((item) => ({
			...item,
			id: parseInt(item.id, 10) || item.id,
			year: parseInt(item.year, 10) || 0,
			consumed_at: toConsumedAt(item),
		}))

	const loadedSeries = data
		.filter((item) => item.type === "series")
		.map((item) => ({
			...item,
			id: parseInt(item.id, 10) || item.id,
			year: parseInt(item.year, 10) || 0,
			seasons: parseInt(item.seasons, 10) || 0,
			consumed_at: toConsumedAt(item),
		}))

	const loadedBooks = data
		.filter((item) => item.type === "book")
		.map((item) => ({
			...item,
			type: "book" as const,
			id: parseInt(item.id, 10) || item.id,
			year: parseInt(item.year, 10) || 0,
			consumed_at: toConsumedAt(item),
		}))

	const loadedComics = data
		.filter((item) => item.type === "comic")
		.map((item) => ({
			...item,
			type: "comic" as const,
			id: parseInt(item.id, 10) || item.id,
			year: parseInt(item.year, 10) || 0,
			consumed_at: toConsumedAt(item),
		}))

	return { loadedMovies, loadedSeries, loadedBooks, loadedComics }
}

export const saveToAPI = async (movies, series, books, comics) => {
	const allData = [
		...movies.map((f) => ({ ...f, type: "film" })),
		...series.map((s) => ({ ...s, type: "series" })),
		...(books || []).map((b) => ({ ...b, type: "book" })),
		...(comics || []).map((c) => ({ ...c, type: "comic" })),
	]

	const res = await fetch(`${API_URL}/api/items`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(allData),
	})

	if (!res.ok) {
		throw new Error(`Failed to save items: ${res.statusText}`)
	}

	return res.json()
}