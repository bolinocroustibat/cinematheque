import { useEffect, useState } from "react"
import {
	getDetailsWithCredits,
	getRecommendations,
	searchTMDB,
} from "@/api/tmdb"
import type { Item, TabType } from "@/types"
import { getPosterUrl } from "@/utils/poster"

interface SuggestionsProps {
	item: Item
	type: TabType
	existingIds: string[]
	onAdd: (item: Item) => void
}

interface Suggestion {
	id: string | number
	title: string
	year: string
	poster: string | null
	author?: string
	source: "tmdb" | "google"
}

const Suggestions = ({ item, type, existingIds, onAdd }: SuggestionsProps) => {
	const [suggestions, setSuggestions] = useState<Suggestion[]>([])
	const [loading, setLoading] = useState(false)

	const isMedia = type === "films" || type === "series"

	// Get author from item if it exists
	const itemAuthor = "author" in item ? item.author : undefined

	useEffect(() => {
		const fetchSuggestions = async () => {
			setLoading(true)
			setSuggestions([])

			try {
				if (isMedia) {
					// TMDB pour films/séries
					const searchResults = await searchTMDB(
						item.title,
						type === "films" ? "movie" : "tv",
						{ year: item.year },
					)

					if (searchResults[0]) {
						const id = searchResults[0].id
						const recommendations = await getRecommendations(
							id,
							type === "films" ? "movie" : "tv",
							{ language: "fr-FR" },
						)

						const filtered = recommendations
							.filter(
								(r) =>
									!existingIds.includes(
										(r.title || r.name || "").toLowerCase(),
									),
							)
							.slice(0, 6)
							.map((r) => ({
								id: r.id,
								title: r.title || r.name || "",
								year: (r.release_date || r.first_air_date)?.split("-")[0] || "",
								poster: getPosterUrl(r.poster_path),
								source: "tmdb" as const,
							}))

						setSuggestions(filtered)
					}
				} else {
					// Google Books pour livres/BD
					const searchRes = await fetch(
						`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(`${item.title} ${itemAuthor || ""}`)}&maxResults=1`,
					)
					const searchData = await searchRes.json()

					if (searchData.items?.[0]) {
						// Chercher des livres similaires par auteur ou catégorie
						const author =
							itemAuthor || searchData.items[0].volumeInfo?.authors?.[0] || ""
						const category =
							searchData.items[0].volumeInfo?.categories?.[0] || ""

						let query = ""
						if (author) query = `inauthor:${author}`
						else if (category) query = `subject:${category}`
						else query = item.title.split(" ")[0] // Premier mot du titre

						const recRes = await fetch(
							`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=12&langRestrict=fr`,
						)
						const recData = await recRes.json()

						const filtered = (recData.items || [])
							.filter((r: { volumeInfo?: { title?: string } }) => {
								const title = r.volumeInfo?.title || ""
								return (
									title.toLowerCase() !== item.title.toLowerCase() &&
									!existingIds.includes(title.toLowerCase())
								)
							})
							.slice(0, 6)
							.map(
								(r: {
									id: string
									volumeInfo?: {
										title?: string
										publishedDate?: string
										imageLinks?: { thumbnail?: string }
										authors?: string[]
									}
								}) => ({
									id: r.id,
									title: r.volumeInfo?.title || "",
									year: r.volumeInfo?.publishedDate?.split("-")[0] || "",
									poster:
										r.volumeInfo?.imageLinks?.thumbnail?.replace(
											"http:",
											"https:",
										) || null,
									author: r.volumeInfo?.authors?.[0] || "",
									source: "google" as const,
								}),
							)

						setSuggestions(filtered)
					}
				}
			} catch (e) {
				console.error("Erreur suggestions:", e)
			}
			setLoading(false)
		}

		if (item?.title) {
			fetchSuggestions()
		}
	}, [existingIds, isMedia, itemAuthor, item.title, item.year, type])

	const addSuggestion = async (sug: Suggestion) => {
		try {
			if (sug.source === "tmdb") {
				// Ajout film/série depuis TMDB
				const { details, credits } = await getDetailsWithCredits(
					Number(sug.id),
					type === "films" ? "movie" : "tv",
					{ language: "fr-FR" },
				)

				if (!details || !credits) return

				const newItem: Record<string, unknown> = {
					id: Date.now(),
					title: sug.title,
					year: parseInt(sug.year, 10) || 0,
					poster: sug.poster,
					genre: details.genres?.map((g) => g.name).join(", ") || "",
					watched: false,
				}

				if (type === "films") {
					newItem.director =
						credits.crew?.find((c) => c.job === "Director")?.name || ""
					newItem.actors =
						credits.cast
							?.slice(0, 4)
							.map((a) => a.name)
							.join(", ") || ""
					newItem.country = details.production_countries?.[0]?.name || ""
				} else {
					newItem.creator = details.created_by?.[0]?.name || ""
					newItem.actors =
						credits.cast
							?.slice(0, 4)
							.map((a) => a.name)
							.join(", ") || ""
					newItem.seasons = details.number_of_seasons || 0
				}

				onAdd(newItem as Item)
			} else {
				// Ajout livre/BD depuis Google Books
				const res = await fetch(
					`https://www.googleapis.com/books/v1/volumes/${sug.id}`,
				)
				const data = await res.json()
				const info = data.volumeInfo || {}

				const newItem = {
					id: Date.now(),
					title: info.title || sug.title,
					author: info.authors?.join(", ") || "",
					year: parseInt(info.publishedDate?.split("-")[0], 10) || 0,
					genre: info.categories?.join(", ") || "",
					poster:
						info.imageLinks?.thumbnail?.replace("http:", "https:") ||
						sug.poster,
					watched: false,
				}

				onAdd(newItem as Item)
			}

			setSuggestions(suggestions.filter((s) => s.id !== sug.id))
		} catch (e) {
			console.error("Erreur ajout suggestion:", e)
		}
	}

	if (loading) {
		return (
			<div className="suggestions">
				<div className="suggestions-title">Suggestions</div>
				<div className="suggestions-loading">Chargement...</div>
			</div>
		)
	}

	if (suggestions.length === 0) return null

	return (
		<div className="suggestions">
			<div className="suggestions-title">
				{isMedia
					? "Si vous avez aimé, vous aimerez peut-être..."
					: "Du même auteur ou genre..."}
			</div>
			<div className="suggestions-grid">
				{suggestions.map((sug) => (
					<button
						type="button"
						key={sug.id}
						className="suggestion-card"
						onClick={() => addSuggestion(sug)}
					>
						{sug.poster ? (
							<img src={sug.poster} alt={sug.title} />
						) : (
							<div className="suggestion-noimg">?</div>
						)}
						<div className="suggestion-info">
							<div className="suggestion-title">{sug.title}</div>
							<div className="suggestion-year">{sug.author || sug.year}</div>
						</div>
						<div className="suggestion-add">+</div>
					</button>
				))}
			</div>
		</div>
	)
}

export default Suggestions
