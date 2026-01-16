// API client for backend
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

export const loadFromAPI = async () => {
	const res = await fetch(`${API_URL}/api/items`)
	if (!res.ok) {
		throw new Error(`Failed to load items: ${res.statusText}`)
	}
	const data = await res.json()

	const loadedFilms = data
		.filter((item) => item.type === "film" || !item.type)
		.map((item) => ({
			...item,
			id: parseInt(item.id, 10) || item.id,
			year: parseInt(item.year, 10) || 0,
			watched: item.watched === "true" || item.watched === true,
		}))

	const loadedSeries = data
		.filter((item) => item.type === "series")
		.map((item) => ({
			...item,
			id: parseInt(item.id, 10) || item.id,
			year: parseInt(item.year, 10) || 0,
			seasons: parseInt(item.seasons, 10) || 0,
			watched: item.watched === "true" || item.watched === true,
		}))

	const loadedBooks = data
		.filter((item) => item.type === "book")
		.map((item) => ({
			...item,
			id: parseInt(item.id, 10) || item.id,
			year: parseInt(item.year, 10) || 0,
			watched: item.watched === "true" || item.watched === true,
		}))

	const loadedComics = data
		.filter((item) => item.type === "comic")
		.map((item) => ({
			...item,
			id: parseInt(item.id, 10) || item.id,
			year: parseInt(item.year, 10) || 0,
			watched: item.watched === "true" || item.watched === true,
		}))

	return { loadedFilms, loadedSeries, loadedBooks, loadedComics }
}

export const saveToAPI = async (films, series, books, comics) => {
	const allData = [
		...films.map((f) => ({ ...f, type: "film" })),
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