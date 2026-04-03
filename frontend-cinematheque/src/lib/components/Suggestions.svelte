<script lang="ts">
import { getPosterUrl } from "$lib/poster"
import {
	getDetailsWithCredits,
	getRecommendations,
	searchTMDB,
} from "$lib/tmdb"
import type { Item, TabType } from "$lib/types"

let {
	item,
	type,
	items,
	onAdd,
}: {
	item: Item
	type: TabType
	items: Item[]
	onAdd: (item: Item) => void
} = $props()

const itemsFingerprint = $derived(
	items.map((i) => `${i.id}:${i.title}`).join("|"),
)

interface Suggestion {
	id: string | number
	title: string
	year: string
	poster: string | null
	author?: string
	source: "tmdb" | "google"
}

let suggestions = $state<Suggestion[]>([])
let loading = $state(false)

const isMedia = $derived(
	type === "films" || type === "documentaries" || type === "series",
)
const itemAuthor = $derived("author" in item ? item.author : undefined)

$effect(() => {
	const title = item.title
	const year = item.year
	const t = type
	const media = isMedia
	const author = itemAuthor
	void itemsFingerprint
	const ids = items.map((i) => i.title.toLowerCase())

	if (!title) return

	let cancelled = false

	;(async () => {
		loading = true
		suggestions = []

		try {
			if (media) {
				const searchResults = await searchTMDB(
					title,
					t === "series" ? "tv" : "movie",
					{ year },
				)

				if (searchResults[0]) {
					const id = searchResults[0].id
					const recommendations = await getRecommendations(
						id,
						t === "series" ? "tv" : "movie",
						{ language: "en-US" },
					)

					if (cancelled) return

					const filtered = recommendations
						.filter(
							(r) => !ids.includes((r.title || r.name || "").toLowerCase()),
						)
						.slice(0, 6)
						.map((r) => ({
							id: r.id,
							title: r.title || r.name || "",
							year: (r.release_date || r.first_air_date)?.split("-")[0] || "",
							poster: getPosterUrl(r.poster_path),
							source: "tmdb" as const,
						}))

					suggestions = filtered
				}
			} else {
				const searchRes = await fetch(
					`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(`${title} ${author || ""}`)}&maxResults=1`,
				)
				const searchData = await searchRes.json()

				if (cancelled) return

				if (searchData.items?.[0]) {
					const bookAuthor =
						author || searchData.items[0].volumeInfo?.authors?.[0] || ""
					const category = searchData.items[0].volumeInfo?.categories?.[0] || ""

					let q = ""
					if (bookAuthor) q = `inauthor:${bookAuthor}`
					else if (category) q = `subject:${category}`
					else q = title.split(" ")[0]

					const recRes = await fetch(
						`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=12&langRestrict=en`,
					)
					const recData = await recRes.json()

					if (cancelled) return

					const filtered = (recData.items || [])
						.filter((r: { volumeInfo?: { title?: string } }) => {
							const tit = r.volumeInfo?.title || ""
							return (
								tit.toLowerCase() !== title.toLowerCase() &&
								!ids.includes(tit.toLowerCase())
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

					suggestions = filtered
				}
			}
		} catch (e) {
			console.error("Suggestions error:", e)
		}
		if (!cancelled) loading = false
	})()

	return () => {
		cancelled = true
		loading = false
	}
})

async function addSuggestion(sug: Suggestion) {
	try {
		if (sug.source === "tmdb") {
			const { details, credits } = await getDetailsWithCredits(
				Number(sug.id),
				type === "series" ? "tv" : "movie",
				{ language: "en-US" },
			)

			if (!details || !credits) return

			const newItem: Record<string, unknown> = {
				id: Date.now(),
				title: sug.title,
				year: parseInt(sug.year, 10) || 0,
				poster: sug.poster,
				acquired_at: null,
				consumed_at: null,
			}

			if (type === "films" || type === "documentaries") {
				newItem.director =
					credits.crew?.find((c) => c.job === "Director")?.name || ""
				newItem.country = details.production_countries?.[0]?.name || ""
				newItem.type = type === "documentaries" ? "documentary" : "movie"
			} else {
				newItem.creator = details.created_by?.[0]?.name || ""
				newItem.country = details.origin_country?.[0] || ""
				newItem.seasons = details.number_of_seasons || 0
			}

			onAdd(newItem as unknown as Item)
		} else {
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
				type: type === "comics" ? ("comic" as const) : ("book" as const),
				poster:
					info.imageLinks?.thumbnail?.replace("http:", "https:") || sug.poster,
				acquired_at: null,
				consumed_at: null,
			}

			onAdd(newItem as unknown as Item)
		}

		suggestions = suggestions.filter((s) => s.id !== sug.id)
	} catch (e) {
		console.error("Add suggestion error:", e)
	}
}
</script>

{#if loading}
	<div class="suggestions">
		<div class="suggestions-title">Suggestions</div>
		<div class="suggestions-loading">Loading...</div>
	</div>
{:else if suggestions.length > 0}
	<div class="suggestions">
		<div class="suggestions-title">
			{isMedia
				? "Because you liked this..."
				: "More from the same author or theme..."}
		</div>
		<div class="suggestions-grid">
			{#each suggestions as sug (sug.id)}
				<button
					type="button"
					class="suggestion-card"
					onclick={() => addSuggestion(sug)}
				>
					{#if sug.poster}
						<img src={sug.poster} alt={sug.title} />
					{:else}
						<div class="suggestion-noimg">?</div>
					{/if}
					<div class="suggestion-info">
						<div class="suggestion-title">{sug.title}</div>
						<div class="suggestion-year">{sug.author || sug.year}</div>
					</div>
					<div class="suggestion-add">+</div>
				</button>
			{/each}
		</div>
	</div>
{/if}
