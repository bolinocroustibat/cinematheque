<script lang="ts">
import { onMount } from "svelte"
import {
	fillMissingMoviePosters,
	loadFromAPI,
	saveToAPI,
} from "$lib/api/client"
import AddModal from "$lib/components/AddModal.svelte"
import EditModal from "$lib/components/EditModal.svelte"
import Header from "$lib/components/Header.svelte"
import ItemCard from "$lib/components/ItemCard.svelte"
import ItemListRow from "$lib/components/ItemListRow.svelte"
import ItemModal from "$lib/components/ItemModal.svelte"
import { getGroupKey, sortItems } from "$lib/sorting"
import type {
	Book,
	FilterType,
	Item,
	SortType,
	TabType,
	ViewType,
} from "$lib/types"
import { isAcquired, isConsumed, tabLabelEn } from "$lib/types"

let { data } = $props()

let tab = $state<TabType>("films")
let movies = $state<Item[]>([])
let documentaries = $state<Item[]>([])
let series = $state<Item[]>([])
let books = $state<Book[]>([])
let comics = $state<Book[]>([])
let search = $state("")
let filter = $state<FilterType>("all")
let selected = $state<Item | null>(null)
let view = $state<ViewType>("grid")
let cardSize = $state(120)
let showAdd = $state(false)
let syncing = $state(false)
let posterProgress = $state("")
let sort = $state<SortType>("year-desc")
let showSeparators = $state(true)
let showEdit = $state(false)

const items = $derived.by(() => {
	if (tab === "films") return movies
	if (tab === "documentaries") return documentaries
	if (tab === "series") return series
	if (tab === "books") return books
	return comics
})

function setItemsForTab(newItems: Item[]) {
	if (tab === "films") movies = newItems as Item[]
	else if (tab === "documentaries") documentaries = newItems as Item[]
	else if (tab === "series") series = newItems as Item[]
	else if (tab === "books") books = newItems as Book[]
	else comics = newItems as Book[]
}

/** Fetch collections from the API only (no poster backfill). */
async function loadCollectionsFromApi() {
	syncing = true
	try {
		const {
			loadedMovies,
			loadedDocumentaries,
			loadedSeries,
			loadedBooks,
			loadedComics,
		} = await loadFromAPI()

		movies = loadedMovies
		documentaries = loadedDocumentaries
		series = loadedSeries
		books = loadedBooks
		comics = loadedComics
	} catch (e) {
		console.error("Load error:", e)
	} finally {
		syncing = false
	}
}

/** Same as the old React app: backfill runs after the main UI is shown. */
async function maybeBackfillMoviePosters() {
	if (
		!movies.some((f: Item) => !f.poster) &&
		!documentaries.some((f: Item) => !f.poster)
	) {
		return
	}
	posterProgress = "…"
	syncing = true
	try {
		await fillMissingMoviePosters((round) => {
			posterProgress = round
		})
		const refreshed = await loadFromAPI()
		movies = refreshed.loadedMovies
		documentaries = refreshed.loadedDocumentaries
	} catch (e) {
		console.error("Poster fill failed", e)
	} finally {
		posterProgress = ""
		syncing = false
	}
}

function applyInitial(payload: NonNullable<typeof data.initial>) {
	movies = payload.loadedMovies
	documentaries = payload.loadedDocumentaries
	series = payload.loadedSeries
	books = payload.loadedBooks
	comics = payload.loadedComics
}

if (data.initial) {
	applyInitial(data.initial)
}

/** False when SSR (or future load) already provided data; true only when client must fetch. */
let loading = $state(data.initial === null)

onMount(() => {
	void (async () => {
		if (data.initial === null) {
			try {
				await loadCollectionsFromApi()
			} finally {
				loading = false
			}
		}
		await maybeBackfillMoviePosters()
	})()
})

$effect(() => {
	if (movies.length > 0) {
		localStorage.setItem("cine_movies_cache", JSON.stringify(movies))
	}
})

$effect(() => {
	if (series.length > 0) {
		localStorage.setItem("cine_series_cache", JSON.stringify(series))
	}
})

$effect(() => {
	if (books.length > 0) {
		localStorage.setItem("cine_books_cache", JSON.stringify(books))
	}
})

$effect(() => {
	if (comics.length > 0) {
		localStorage.setItem("cine_comics_cache", JSON.stringify(comics))
	}
})

$effect(() => {
	if (documentaries.length > 0) {
		localStorage.setItem(
			"cine_documentaries_cache",
			JSON.stringify(documentaries),
		)
	}
})

async function saveToBackend(
	newMovies?: Item[],
	newSeries?: Item[],
	newBooks?: Item[],
	newComics?: Item[],
	newDocumentaries?: Item[],
) {
	syncing = true
	try {
		await saveToAPI(
			newMovies !== undefined ? newMovies : movies,
			newSeries !== undefined ? newSeries : series,
			newBooks !== undefined ? newBooks : books,
			newComics !== undefined ? newComics : comics,
			newDocumentaries !== undefined ? newDocumentaries : documentaries,
		)
	} catch (e) {
		console.error("Save error:", e)
	}
	syncing = false
}

const filtered = $derived.by(() =>
	sortItems(
		items.filter((f) => {
			if (
				search &&
				!f.title?.toLowerCase().includes(search.toLowerCase()) &&
				!(
					"director" in f &&
					f.director?.toLowerCase().includes(search.toLowerCase())
				) &&
				!(
					"author" in f &&
					f.author?.toLowerCase().includes(search.toLowerCase())
				)
			)
				return false
			if (filter === "watched" && !isConsumed(f)) return false
			if (filter === "unwatched" && isConsumed(f)) return false
			return true
		}),
		sort,
	),
)

const groupedItems = $derived.by(() => {
	if (sort === "added") return [{ key: null as string | null, items: filtered }]

	const groups: { key: string | null; items: Item[] }[] = []
	let currentKey: string | null = null

	for (const item of filtered) {
		const key = getGroupKey(item, sort, tab)
		if (key !== currentKey) {
			groups.push({ key, items: [item] })
			currentKey = key
		} else {
			groups[groups.length - 1].items.push(item)
		}
	}

	return groups
})

const stats = $derived({
	total: items.length,
	watched: items.filter((f) => isConsumed(f)).length,
})

function saveAll(
	newMovies?: Item[],
	newSeries?: Item[],
	newBooks?: Item[],
	newComics?: Item[],
	newDocumentaries?: Item[],
) {
	saveToBackend(
		newMovies !== undefined ? newMovies : movies,
		newSeries !== undefined ? newSeries : series,
		newBooks !== undefined ? newBooks : books,
		newComics !== undefined ? newComics : comics,
		newDocumentaries !== undefined ? newDocumentaries : documentaries,
	)
}

function toggleAcquired(id: number) {
	const newItems = items.map((f) =>
		f.id === id
			? {
					...f,
					acquired_at: isAcquired(f) ? null : new Date().toISOString(),
				}
			: f,
	)
	setItemsForTab(newItems)
	if (selected?.id === id)
		selected = {
			...selected,
			acquired_at: isAcquired(selected) ? null : new Date().toISOString(),
		} as Item

	if (tab === "films") saveAll(newItems)
	else if (tab === "documentaries")
		saveAll(undefined, undefined, undefined, undefined, newItems)
	else if (tab === "series") saveAll(undefined, newItems)
	else if (tab === "books") saveAll(undefined, undefined, newItems)
	else saveAll(undefined, undefined, undefined, newItems)
}

function toggleWatch(id: number, e?: MouseEvent) {
	if (e) e.stopPropagation()
	const newItems = items.map((f) =>
		f.id === id
			? {
					...f,
					consumed_at: isConsumed(f) ? null : new Date().toISOString(),
				}
			: f,
	)
	setItemsForTab(newItems)
	if (selected?.id === id)
		selected = {
			...selected,
			consumed_at: isConsumed(selected) ? null : new Date().toISOString(),
		} as Item

	if (tab === "films") saveAll(newItems)
	else if (tab === "documentaries")
		saveAll(undefined, undefined, undefined, undefined, newItems)
	else if (tab === "series") saveAll(undefined, newItems)
	else if (tab === "books") saveAll(undefined, undefined, newItems)
	else saveAll(undefined, undefined, undefined, newItems)
}

function addItem(entry: Item) {
	const newItems = [entry, ...items]
	setItemsForTab(newItems)

	if (tab === "films") saveAll(newItems)
	else if (tab === "documentaries")
		saveAll(undefined, undefined, undefined, undefined, newItems)
	else if (tab === "series") saveAll(undefined, newItems)
	else if (tab === "books") saveAll(undefined, undefined, newItems)
	else saveAll(undefined, undefined, undefined, newItems)
}

function deleteItem(id: number) {
	const newItems = items.filter((f) => f.id !== id)
	setItemsForTab(newItems)
	selected = null

	if (tab === "films") saveAll(newItems)
	else if (tab === "documentaries")
		saveAll(undefined, undefined, undefined, undefined, newItems)
	else if (tab === "series") saveAll(undefined, newItems)
	else if (tab === "books") saveAll(undefined, undefined, newItems)
	else saveAll(undefined, undefined, undefined, newItems)
}

function updateItem(id: number, updates: Partial<Item>) {
	const newItems = items.map((f) => (f.id === id ? { ...f, ...updates } : f))
	setItemsForTab(newItems)
	if (selected?.id === id) selected = { ...selected, ...updates } as Item
	showEdit = false

	if (tab === "films") saveAll(newItems)
	else if (tab === "documentaries")
		saveAll(undefined, undefined, undefined, undefined, newItems)
	else if (tab === "series") saveAll(undefined, newItems)
	else if (tab === "books") saveAll(undefined, undefined, newItems)
	else saveAll(undefined, undefined, undefined, newItems)
}
</script>

{#if loading}
	<div class="loading-screen">
		<div class="loading-spinner"></div>
		<div>Loading your collection...</div>
	</div>
{:else}
	<div>
		<Header
			stats={stats}
			{syncing}
			{posterProgress}
			onAddClick={() => (showAdd = true)}
			{tab}
			onTabChange={(t) => (tab = t)}
			counts={{
				movies: movies.length,
				documentaries: documentaries.length,
				series: series.length,
				books: books.length,
				comics: comics.length,
			}}
			{search}
			onSearchChange={(v) => (search = v)}
			{filter}
			onFilterChange={(f) => (filter = f)}
			{sort}
			onSortChange={(s) => (sort = s)}
			{view}
			onViewChange={(v) => (view = v)}
			{showSeparators}
			onShowSeparatorsChange={(v) => (showSeparators = v)}
			{cardSize}
			onCardSizeChange={(n) => (cardSize = n)}
		/>

		<main class="main">
			<div class="count">
				{filtered.length}
				{tabLabelEn(tab)}
			</div>
			{#if filtered.length > 0}
				{#if view === "grid"}
					<div class={showSeparators ? "grid-container" : ""}>
						{#if showSeparators}
							{#each groupedItems as group, gi (`${group.key ?? "all"}-${gi}`)}
								{#if group.key}
									<div class="group-separator">{group.key}</div>
								{/if}
								<div
									class="grid"
									style="--card-size: {cardSize}px;"
								>
									{#each group.items as f (f.id)}
										<ItemCard
											item={f}
											onSelect={(it) => (selected = it)}
											onToggleWatch={toggleWatch}
										/>
									{/each}
								</div>
							{/each}
						{:else}
							<div class="grid" style="--card-size: {cardSize}px;">
								{#each filtered as f (f.id)}
									<ItemCard
										item={f}
										onSelect={(it) => (selected = it)}
										onToggleWatch={toggleWatch}
									/>
								{/each}
							</div>
						{/if}
					</div>
				{:else}
					<div class={showSeparators ? "list-container" : ""}>
						{#if showSeparators}
							{#each groupedItems as group, gi (`${group.key ?? "all"}-${gi}`)}
								{#if group.key}
									<div class="group-separator">{group.key}</div>
								{/if}
								<div class="list">
									{#each group.items as f (f.id)}
										<ItemListRow
											item={f}
											onSelect={(it) => (selected = it)}
											onToggleWatch={toggleWatch}
										/>
									{/each}
								</div>
							{/each}
						{:else}
							<div class="list">
								{#each filtered as f (f.id)}
									<ItemListRow
										item={f}
										onSelect={(it) => (selected = it)}
										onToggleWatch={toggleWatch}
									/>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			{:else}
				<div class="empty">
					{items.length === 0
						? `No ${tabLabelEn(tab)} yet. Click "+ Add" to get started.`
						: "No results"}
				</div>
			{/if}
		</main>

		{#if selected}
			<ItemModal
				item={selected}
				tab={tab}
				onClose={() => (selected = null)}
				onToggleWatch={(id) => toggleWatch(id)}
				onToggleAcquired={(id) => toggleAcquired(id)}
				onEdit={() => (showEdit = true)}
				onDelete={deleteItem}
				items={items}
				onAdd={addItem}
			/>
		{/if}

		{#if showAdd}
			<AddModal type={tab} onClose={() => (showAdd = false)} onAdd={addItem} />
		{/if}
		{#if showEdit && selected}
			{#key selected.id}
				<EditModal
					item={selected}
					type={tab}
					onClose={() => (showEdit = false)}
					onSave={updateItem}
				/>
			{/key}
		{/if}
	</div>
{/if}
