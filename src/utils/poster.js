import { TMDB_IMG_LG, TMDB_IMG_SM } from "@/api/tmdb.js"

// Helper to get poster URL from TMDB poster path
export const getPosterUrl = (posterPath, size = "sm") => {
	if (!posterPath) return null
	const base = size === "lg" ? TMDB_IMG_LG : TMDB_IMG_SM
	return base + posterPath
}

// Helper to get small poster URL for grid
export const getSmallPoster = (url) => {
	if (!url) return null
	return url.replace("/w300/", "/w154/").replace("/w500/", "/w154/")
}

// Helper to get large poster URL for modal
export const getLargePoster = (url) => {
	if (!url) return null
	return url.replace("/w154/", "/w300/").replace("/w92/", "/w300/")
}
