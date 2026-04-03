<script lang="ts">
import { getPosterUrl } from "$lib/poster"
import { getDetailsWithCredits, searchTMDB, TMDB_IMG_SM } from "$lib/tmdb"
import type { Item, TabType } from "$lib/types"

let {
	type,
	onClose,
	onAdd,
}: {
	type: TabType
	onClose: () => void
	onAdd: (item: Item) => void
} = $props()

interface FormState {
	title: string
	director: string
	creator: string
	author: string
	year: string
	recommendation_source: string
	owned: boolean
	watched: boolean
	poster: string
	seasons: string
	country: string
}

interface SearchResult {
	id: string | number
	title?: string
	name?: string
	poster_path?: string | null
	poster?: string | null
	release_date?: string
	first_air_date?: string
	year?: string
	author?: string
}

let query = $state("")
let results = $state<SearchResult[]>([])
let searching = $state(false)
let form = $state<FormState>({
	title: "",
	director: "",
	creator: "",
	author: "",
	year: "",
	recommendation_source: "",
	owned: false,
	watched: false,
	poster: "",
	seasons: "",
	country: "",
})
let mode = $state<"search" | "manual">("search")

const isFilmTab = $derived(type === "films")
const isDocumentaryTab = $derived(type === "documentaries")
const isSeries = $derived(type === "series")
const isBook = $derived(type === "books")
const isMedia = $derived(isFilmTab || isSeries || isDocumentaryTab)

let debounceId: ReturnType<typeof setTimeout> | undefined

$effect(() => {
	const q = query
	if (debounceId) clearTimeout(debounceId)
	if (!q || q.length < 2) {
		results = []
		return
	}
	debounceId = setTimeout(async () => {
		searching = true
		try {
			if (isMedia) {
				const searchResults = await searchTMDB(q, isSeries ? "tv" : "movie", {
					language: "en-US",
				})
				results = searchResults.slice(0, 8)
			} else {
				const res = await fetch(
					`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=8&langRestrict=en`,
				)
				const data = await res.json()
				results =
					data.items?.map(
						(item: {
							id: string
							volumeInfo: {
								title: string
								authors?: string[]
								publishedDate?: string
								imageLinks?: { thumbnail?: string }
							}
						}) => ({
							id: item.id,
							title: item.volumeInfo.title,
							author: item.volumeInfo.authors?.join(", ") || "",
							year: item.volumeInfo.publishedDate?.split("-")[0] || "",
							poster:
								item.volumeInfo.imageLinks?.thumbnail?.replace(
									"http:",
									"https:",
								) || null,
						}),
					) || []
			}
		} catch {
			results = []
		}
		searching = false
	}, 400)
	return () => {
		if (debounceId) clearTimeout(debounceId)
	}
})

async function selectItem(item: SearchResult) {
	if (isMedia) {
		try {
			const { details, credits } = await getDetailsWithCredits(
				Number(item.id),
				isSeries ? "tv" : "movie",
				{ language: "en-US" },
			)

			if (!details || !credits) {
				form = {
					...form,
					title: item.title || item.name || "",
					year: (item.release_date || item.first_air_date)?.split("-")[0] || "",
				}
				mode = "manual"
				results = []
				query = ""
				return
			}

			if (isFilmTab || isDocumentaryTab) {
				form = {
					title: item.title || "",
					director: credits.crew?.find((c) => c.job === "Director")?.name || "",
					creator: "",
					author: "",
					year: item.release_date?.split("-")[0] || "",
					country: details.production_countries?.[0]?.name || "",
					recommendation_source: "",
					owned: false,
					watched: false,
					poster: getPosterUrl(item.poster_path) || "",
					seasons: "",
				}
			} else {
				form = {
					title: item.name || "",
					director: "",
					creator: details.created_by?.[0]?.name || "",
					author: "",
					year: item.first_air_date?.split("-")[0] || "",
					country: details.origin_country?.[0] || "",
					seasons: String(details.number_of_seasons || ""),
					recommendation_source: "",
					owned: false,
					watched: false,
					poster: getPosterUrl(item.poster_path) || "",
				}
			}
		} catch {
			form = {
				...form,
				title: item.title || item.name || "",
				year: (item.release_date || item.first_air_date)?.split("-")[0] || "",
			}
		}
	} else {
		form = {
			title: item.title || "",
			director: "",
			creator: "",
			author: item.author || "",
			year: item.year || "",
			recommendation_source: "",
			owned: false,
			watched: false,
			poster: item.poster || "",
			seasons: "",
			country: "",
		}
	}
	mode = "manual"
	results = []
	query = ""
}

function handleSubmit(e: SubmitEvent) {
	e.preventDefault()
	if (!form.title) return
	const { owned, watched, ...rest } = form
	const base: Record<string, unknown> = {
		...rest,
		id: Date.now(),
		year: parseInt(form.year, 10) || new Date().getFullYear(),
		seasons: form.seasons ? parseInt(form.seasons, 10) : undefined,
		acquired_at: owned ? new Date().toISOString() : null,
		consumed_at: watched ? new Date().toISOString() : null,
	}
	if (isBook || type === "comics") {
		base.type = type === "books" ? "book" : "comic"
	}
	if (isFilmTab) base.type = "movie"
	if (isDocumentaryTab) base.type = "documentary"
	onAdd(base as unknown as Item)
	onClose()
}

function getTypeLabel() {
	if (isFilmTab) return "a movie"
	if (isDocumentaryTab) return "a documentary"
	if (isSeries) return "a series"
	if (isBook) return "a book"
	return "a comic"
}

function getIcon() {
	if (isFilmTab) return "🎬"
	if (isDocumentaryTab) return "🎥"
	if (isSeries) return "📺"
	if (isBook) return "📚"
	return "📖"
}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-bg" onclick={onClose} onkeydown={() => {}} role="presentation">
	<div
		class="modal add-modal"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
		role="dialog"
		aria-modal="true"
	>
		<div class="modal-head">
			<div class="modal-title">Add {getTypeLabel()}</div>
			<button type="button" class="modal-close" onclick={onClose}>×</button>
		</div>
		<div class="modal-body">
			{#if mode === "search"}
				<div class="search-input-wrap">
					<input
						type="text"
						class="search-box full"
						placeholder="Search for {getTypeLabel()}..."
						bind:value={query}
					/>
					{#if searching}<div class="spinner"></div>{/if}
				</div>

				{#if results.length > 0}
					<div class="search-results">
						{#each results as m (m.id)}
							<button
								type="button"
								class="search-result"
								onclick={() => selectItem(m)}
							>
								{#if (isMedia ? m.poster_path : m.poster)}
									<img
										src={isMedia ? TMDB_IMG_SM + m.poster_path : (m.poster ?? "")}
										alt=""
									/>
								{:else}
									<div class="no-poster">{getIcon()}</div>
								{/if}
								<div>
									<div class="result-title">{m.title || m.name}</div>
									<div class="result-year">
										{isMedia
											? (m.release_date || m.first_air_date)?.split("-")[0]
											: m.year}
										{#if !isMedia && m.author}
											· {m.author}
										{/if}
									</div>
								</div>
							</button>
						{/each}
					</div>
				{/if}

				<button type="button" class="link-btn" onclick={() => (mode = "manual")}>
					Or add manually →
				</button>
			{:else}
				<form onsubmit={handleSubmit}>
					{#if form.poster}
						<div class="form-poster">
							<img src={form.poster} alt="" />
							<button
								type="button"
								onclick={() => {
									form = { ...form, poster: "" }
									mode = "search"
								}}
							>
								Change
							</button>
						</div>
					{/if}

					<div class="form-grid">
						<label class="full">
							<span>Title *</span>
							<input type="text" bind:value={form.title} required />
						</label>
						<label>
							<span>
								{isFilmTab || isDocumentaryTab
									? "Director"
									: isSeries
										? "Creator"
										: "Author"}
							</span>
							{#if isFilmTab || isDocumentaryTab}
								<input type="text" bind:value={form.director} />
							{:else if isSeries}
								<input type="text" bind:value={form.creator} />
							{:else}
								<input type="text" bind:value={form.author} />
							{/if}
						</label>
						<label>
							<span>Year</span>
							<input type="number" bind:value={form.year} />
						</label>
						{#if isSeries}
							<label>
								<span>Seasons</span>
								<input type="number" bind:value={form.seasons} />
							</label>
						{/if}
						{#if isMedia}
							<label class="full">
								<span>Country</span>
								<input type="text" bind:value={form.country} />
							</label>
						{/if}
						{#if isBook || type === "comics"}
							<label class="full">
								<span>Country</span>
								<input type="text" bind:value={form.country} />
							</label>
						{/if}
						<label class="full">
							<span>Source / recommendation</span>
							<input
								type="text"
								bind:value={form.recommendation_source}
								placeholder="Friend tip..."
							/>
						</label>
						<label class="checkbox">
							<input type="checkbox" bind:checked={form.owned} />
							<span>Already in my collection</span>
						</label>
						<label class="checkbox">
							<input type="checkbox" bind:checked={form.watched} />
							<span>{isMedia ? "Already watched" : "Already read"}</span>
						</label>
					</div>

					<div class="form-actions">
						<button type="button" class="btn btn-secondary" onclick={onClose}>
							Cancel
						</button>
						<button type="submit" class="btn btn-primary">Add</button>
					</div>
				</form>
			{/if}
		</div>
	</div>
</div>
