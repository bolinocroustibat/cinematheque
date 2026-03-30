export type PosterSize = "sm" | "lg"

// TMDB image base URLs (inlined to avoid circular dependency with tmdb.ts)
const TMDB_IMG_SM = "https://image.tmdb.org/t/p/w154"
const TMDB_IMG_LG = "https://image.tmdb.org/t/p/w300"

// Helper to get poster URL from TMDB poster path
export const getPosterUrl = (
	posterPath: string | null | undefined,
	size: PosterSize = "sm",
): string | null => {
	if (!posterPath) return null
	const base = size === "lg" ? TMDB_IMG_LG : TMDB_IMG_SM
	return base + posterPath
}

// Helper to get small poster URL for grid
export const getSmallPoster = (
	url: string | null | undefined,
): string | null => {
	if (!url) return null
	return url.replace("/w300/", "/w154/").replace("/w500/", "/w154/")
}

// Helper to get large poster URL for modal
export const getLargePoster = (
	url: string | null | undefined,
): string | null => {
	if (!url) return null
	return url.replace("/w154/", "/w300/").replace("/w92/", "/w300/")
}
