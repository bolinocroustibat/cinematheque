import { OMDB_KEY, TMDB_IMG_SM, TMDB_KEY } from "@/constants.js"

// Fetch poster from TMDB then fallback to OMDb
export const fetchPoster = async (title, year, type = "movie") => {
	const endpoint = type === "movie" ? "search/movie" : "search/tv"
	try {
		const res = await fetch(
			`https://api.themoviedb.org/3/${endpoint}?api_key=${TMDB_KEY}&query=${encodeURIComponent(title)}&year=${year}`,
		)
		const data = await res.json()
		if (data.results?.[0]?.poster_path) {
			return TMDB_IMG_SM + data.results[0].poster_path
		}
	} catch (_e) {}

	if (type === "movie") {
		try {
			const res = await fetch(
				`https://www.omdbapi.com/?apikey=${OMDB_KEY}&t=${encodeURIComponent(title)}&y=${year}&type=movie`,
			)
			const data = await res.json()
			if (data.Poster && data.Poster !== "N/A") {
				return data.Poster
			}
		} catch (_e) {}
	}

	return null
}
