export const loadFromSheets = async () => {
	const SHEETS_API = import.meta.env.VITE_SHEETS_API || ""
	const res = await fetch(SHEETS_API)
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

export const saveToSheets = async (films, series, books, comics) => {
	const allData = [
		...films.map((f) => ({ ...f, type: "film" })),
		...series.map((s) => ({ ...s, type: "series" })),
		...(books || []).map((b) => ({ ...b, type: "book" })),
		...(comics || []).map((c) => ({ ...c, type: "comic" })),
	]

	await fetch(SHEETS_API, {
		method: "POST",
		mode: "no-cors",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(allData),
	})
}
