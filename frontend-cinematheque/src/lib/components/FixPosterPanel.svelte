<script lang="ts">
import { getPosterUrl } from "$lib/poster"
import { OMDB_BASE_URL, searchTMDB } from "$lib/tmdb"
import type { Item, TabType } from "$lib/types"

let {
	item,
	type,
	onPick,
}: {
	item: Item
	type: TabType
	onPick: (updates: { poster: string; title?: string; year?: number }) => void
} = $props()

interface SearchResult {
	id: string | number
	title: string
	year: string
	poster: string | null
	source: string
}

let query = $state(item.title)
let year = $state<string | number>(item.year || "")
let results = $state<SearchResult[]>([])
let searching = $state(false)
let source = $state<"tmdb" | "omdb">("tmdb")
let manualUrl = $state("")
let showManual = $state(false)

async function doSearch() {
	if (!query) return
	searching = true
	results = []

	const OMDB_KEY = import.meta.env.VITE_OMDB_KEY || ""

	if (source === "tmdb") {
		try {
			const searchResults = await searchTMDB(
				query,
				type === "series" ? "tv" : "movie",
				{ year },
			)
			results = searchResults.slice(0, 12).map((m) => ({
				id: m.id,
				title: m.title || m.name || "",
				year: (m.release_date || m.first_air_date)?.split("-")[0] || "",
				poster: getPosterUrl(m.poster_path),
				source: "TMDB",
			}))
		} catch {
			/* keep empty */
		}
	} else {
		const omdbType = type === "series" ? "series" : "movie"
		const yearParam = year ? `&y=${year}` : ""
		try {
			const res = await fetch(
				`${OMDB_BASE_URL}/?apikey=${OMDB_KEY}&s=${encodeURIComponent(query)}&type=${omdbType}${yearParam}`,
			)
			const data = await res.json()
			if (data.Search) {
				results = data.Search.slice(0, 12).map(
					(m: {
						imdbID: string
						Title: string
						Year: string
						Poster: string
					}) => ({
						id: m.imdbID,
						title: m.Title,
						year: m.Year,
						poster: m.Poster !== "N/A" ? m.Poster : null,
						source: "OMDb",
					}),
				)
			}
		} catch {
			/* keep empty */
		}
	}
	searching = false
}

$effect(() => {
	void query
	void year
	void source
	void type
	void doSearch()
})

function applyManualUrl() {
	if (manualUrl?.startsWith("http")) {
		onPick({ poster: manualUrl })
	}
}

function selectResult(r: SearchResult) {
	if (!r.poster) return
	onPick({
		poster: r.poster,
		title: r.title,
		year: parseInt(r.year, 10) || item.year,
	})
}
</script>

<div class="fix-poster-panel">
	<div class="fix-search">
		<input
			type="text"
			class="search-box"
			bind:value={query}
			onkeydown={(e) => e.key === "Enter" && doSearch()}
			placeholder="Title"
			style="flex: 1"
		/>
		<input
			type="number"
			class="search-box year-input"
			bind:value={year}
			placeholder="Year"
		/>
		<button type="button" class="btn btn-primary" onclick={doSearch}>🔍</button>
	</div>

	<div class="source-toggle">
		<button
			type="button"
			class="source-btn"
			class:active={source === "tmdb"}
			onclick={() => (source = "tmdb")}
		>
			TMDB
		</button>
		<button
			type="button"
			class="source-btn"
			class:active={source === "omdb"}
			onclick={() => (source = "omdb")}
		>
			OMDb/IMDb
		</button>
	</div>

	{#if searching}<div class="searching">Searching...</div>{/if}

	<div class="fix-results">
		{#each results as r (r.id)}
			<button
				type="button"
				class="fix-result"
				class:no-poster={!r.poster}
				onclick={() => selectResult(r)}
			>
				{#if r.poster}
					<img src={r.poster} alt="" />
				{:else}
					<div class="fix-no-poster">No poster</div>
				{/if}
				<div class="fix-result-info">
					<div class="fix-result-title">{r.title}</div>
					<div class="fix-result-year">
						{r.year} · {r.source}
					</div>
				</div>
			</button>
		{/each}
	</div>

	{#if results.length === 0 && !searching}
		<div class="empty-small">No results. Try the original title.</div>
	{/if}

	<div class="manual-section">
		<button
			type="button"
			class="link-btn"
			onclick={() => (showManual = !showManual)}
		>
			{showManual ? "▼ Hide" : "▶ Paste image URL"}
		</button>
		{#if showManual}
			<div class="manual-url">
				<input
					type="text"
					class="search-box"
					bind:value={manualUrl}
					placeholder="https://..."
					style="flex: 1"
				/>
				<button type="button" class="btn btn-primary" onclick={applyManualUrl}>
					OK
				</button>
			</div>
		{/if}
	</div>
</div>
