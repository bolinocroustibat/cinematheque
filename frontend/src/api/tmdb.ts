import { getPosterUrl } from "@/utils/poster"

// API Base URLs
export const TMDB_BASE_URL = "https://api.themoviedb.org/3"
export const TMDB_IMG_SM = "https://image.tmdb.org/t/p/w154"
export const TMDB_IMG_LG = "https://image.tmdb.org/t/p/w300"
export const OMDB_BASE_URL = "https://www.omdbapi.com"

// TMDB API types
export type MediaType = "movie" | "tv"

export interface TMDBSearchResult {
	id: number
	title?: string // movie
	name?: string // tv
	poster_path: string | null
	release_date?: string // movie
	first_air_date?: string // tv
	overview?: string
}

export interface TMDBDetails {
	id: number
	title?: string
	name?: string
	genres?: { id: number; name: string }[]
	production_countries?: { iso_3166_1: string; name: string }[]
	origin_country?: string[]
	created_by?: { id: number; name: string }[]
	number_of_seasons?: number
}

export interface TMDBCredits {
	cast?: { id: number; name: string; character: string }[]
	crew?: { id: number; name: string; job: string }[]
}

interface SearchOptions {
	year?: string | number
	language?: string
}

// Private helpers
const getApiKey = (): string => import.meta.env.VITE_TMDB_KEY || ""
const getOmdbKey = (): string => import.meta.env.VITE_OMDB_KEY || ""

const buildUrl = (
	endpoint: string,
	params: Record<string, string | number | undefined> = {},
): string => {
	const apiKey = getApiKey()
	const url = new URL(`${TMDB_BASE_URL}/${endpoint}`)
	url.searchParams.set("api_key", apiKey)
	Object.entries(params).forEach(([key, value]) => {
		if (value !== undefined && value !== null && value !== "") {
			url.searchParams.set(key, String(value))
		}
	})
	return url.toString()
}

// Search movies or TV shows
export const searchTMDB = async (
	query: string,
	type: MediaType = "movie",
	options: SearchOptions = {},
): Promise<TMDBSearchResult[]> => {
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
	} catch {
		return []
	}
}

// Get movie or TV details
export const getDetails = async (
	id: number,
	type: MediaType = "movie",
	options: SearchOptions = {},
): Promise<TMDBDetails | null> => {
	const endpoint = type === "movie" ? `movie/${id}` : `tv/${id}`
	try {
		const url = buildUrl(endpoint, {
			language: options.language || "fr-FR",
		})
		const res = await fetch(url)
		return await res.json()
	} catch {
		return null
	}
}

// Get credits for movie or TV
export const getCredits = async (
	id: number,
	type: MediaType = "movie",
): Promise<TMDBCredits | null> => {
	const endpoint = type === "movie" ? `movie/${id}/credits` : `tv/${id}/credits`
	try {
		const url = buildUrl(endpoint)
		const res = await fetch(url)
		return await res.json()
	} catch {
		return null
	}
}

// Get recommendations for movie or TV
export const getRecommendations = async (
	id: number,
	type: MediaType = "movie",
	options: SearchOptions = {},
): Promise<TMDBSearchResult[]> => {
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
	} catch {
		return []
	}
}

// Get movie/TV details and credits together
export const getDetailsWithCredits = async (
	id: number,
	type: MediaType = "movie",
	options: SearchOptions = {},
): Promise<{ details: TMDBDetails | null; credits: TMDBCredits | null }> => {
	const [details, credits] = await Promise.all([
		getDetails(id, type, options),
		getCredits(id, type),
	])
	return { details, credits }
}

// Fetch poster from TMDB then fallback to OMDb
export const fetchPoster = async (
	title: string,
	year: number,
	type: MediaType = "movie",
): Promise<string | null> => {
	try {
		const results = await searchTMDB(title, type, { year })
		if (results[0]?.poster_path) {
			return getPosterUrl(results[0].poster_path)
		}
	} catch {
		// Continue to fallback
	}

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
		} catch {
			// No fallback available
		}
	}

	return null
}
