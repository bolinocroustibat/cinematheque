export const TMDB_BASE_URL = "https://api.themoviedb.org/3"
export const TMDB_IMG_SM = "https://image.tmdb.org/t/p/w154"
export const TMDB_IMG_LG = "https://image.tmdb.org/t/p/w300"
export const OMDB_BASE_URL = "https://www.omdbapi.com"

import { getPosterUrl } from "@/utils/poster.js"

const getApiKey = () => import.meta.env.VITE_TMDB_KEY || ""
const getOmdbKey = () => import.meta.env.VITE_OMDB_KEY || ""

// Helper to build TMDB API URL
const buildUrl = (endpoint, params = {}) => {
	const apiKey = getApiKey()
	const url = new URL(`${TMDB_BASE_URL}/${endpoint}`)
	url.searchParams.set("api_key", apiKey)
	Object.entries(params).forEach(([key, value]) => {
		if (value !== undefined && value !== null && value !== "") {
			url.searchParams.set(key, value)
		}
	})
	return url.toString()
}

// Search movies or TV shows
export const searchTMDB = async (query, type = "movie", options = {}) => {
	const endpoint = type === "movie" ? "search/movie" : "search/tv"
	try {
		const url = buildUrl(endpoint, {
			query,
			year: options.year,
			language: options.language || "fr-FR",
		})
		const res = await fetch(url)
		const data = await res.json()
		return data.results || []
	} catch (_e) {
		return []
	}
}

// Get movie or TV details
export const getDetails = async (id, type = "movie", options = {}) => {
	const endpoint = type === "movie" ? `movie/${id}` : `tv/${id}`
	try {
		const url = buildUrl(endpoint, {
			language: options.language || "fr-FR",
		})
		const res = await fetch(url)
		return await res.json()
	} catch (_e) {
		return null
	}
}

// Get credits for movie or TV
export const getCredits = async (id, type = "movie") => {
	const endpoint = type === "movie" ? `movie/${id}/credits` : `tv/${id}/credits`
	try {
		const url = buildUrl(endpoint)
		const res = await fetch(url)
		return await res.json()
	} catch (_e) {
		return null
	}
}

// Get recommendations for movie or TV
export const getRecommendations = async (id, type = "movie", options = {}) => {
	const endpoint =
		type === "movie"
			? `movie/${id}/recommendations`
			: `tv/${id}/recommendations`
	try {
		const url = buildUrl(endpoint, {
			language: options.language || "fr-FR",
		})
		const res = await fetch(url)
		const data = await res.json()
		return data.results || []
	} catch (_e) {
		return []
	}
}

// Get movie/TV details and credits together
export const getDetailsWithCredits = async (
	id,
	type = "movie",
	options = {},
) => {
	const [details, credits] = await Promise.all([
		getDetails(id, type, options),
		getCredits(id, type),
	])
	return { details, credits }
}

// Fetch poster from TMDB then fallback to OMDb
export const fetchPoster = async (title, year, type = "movie") => {
	try {
		const results = await searchTMDB(title, type, { year })
		if (results[0]?.poster_path) {
			return getPosterUrl(results[0].poster_path)
		}
	} catch (_e) {}

	if (type === "movie") {
		const OMDB_KEY = getOmdbKey()
		try {
			const res = await fetch(
				`${OMDB_BASE_URL}/?apikey=${OMDB_KEY}&t=${encodeURIComponent(title)}&y=${year}&type=movie`,
			)
			const data = await res.json()
			if (data.Poster && data.Poster !== "N/A") {
				return data.Poster
			}
		} catch (_e) {}
	}

	return null
}
