import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import { loadFromAPI, saveToAPI } from "@/api/api"
import { fetchPoster } from "@/api/tmdb"
import ItemCard from "@/components/items/ItemCard"
import ItemListRow from "@/components/items/ItemListRow"
import Header from "@/components/layout/Header"
import AddModal from "@/components/modals/AddModal"
import EditModal from "@/components/modals/EditModal"
import FixPosterModal from "@/components/modals/FixPosterModal"
import ItemModal from "@/components/modals/ItemModal"
import type {
	Book,
	FilterType,
	Item,
	SortType,
	TabType,
	ViewType,
} from "@/types"
import { isConsumed } from "@/types"
import { getGroupKey, sortItems } from "@/utils/sorting"

const App = () => {
	const [tab, setTab] = useState<TabType>("films")

	const [movies, setMovies] = useState<Item[]>([])
	const [documentaries, setDocumentaries] = useState<Item[]>([])
	const [series, setSeries] = useState<Item[]>([])
	const [books, setBooks] = useState<Book[]>([])
	const [comics, setComics] = useState<Book[]>([])
	const [search, setSearch] = useState("")
	const [filter, setFilter] = useState<FilterType>("all")
	const [selected, setSelected] = useState<Item | null>(null)
	const [view, setView] = useState<ViewType>("grid")
	const [cardSize, setCardSize] = useState(120)
	const [showAdd, setShowAdd] = useState(false)
	const [showFix, setShowFix] = useState(false)
	const [loading, setLoading] = useState(true)
	const [syncing, setSyncing] = useState(false)
	const [_lastSync, setLastSync] = useState<Date | null>(null)

	const items =
		tab === "films"
			? movies
			: tab === "documentaries"
				? documentaries
				: tab === "series"
					? series
					: tab === "books"
						? books
						: comics
	const setItems: React.Dispatch<React.SetStateAction<Item[]>> =
		tab === "films"
			? setMovies
			: tab === "documentaries"
				? setDocumentaries
				: tab === "series"
					? setSeries
					: tab === "books"
						? setBooks
						: setComics

	const [posterProgress, setPosterProgress] = useState("")

	// Fetch missing posters after loading
	const fetchMissingPosters = useCallback(async (moviesList: Item[]) => {
		const needPoster = moviesList.filter((f) => !f.poster)
		if (needPoster.length === 0) return moviesList

		setPosterProgress(`0/${needPoster.length}`)
		const updated = [...moviesList]
		let count = 0

		for (const film of needPoster) {
			count++
			setPosterProgress(`${count}/${needPoster.length}`)

			const poster = await fetchPoster(film.title, film.year, "movie")
			if (poster) {
				const idx = updated.findIndex((f) => f.id === film.id)
				if (idx !== -1) {
					updated[idx] = { ...updated[idx], poster }
				}
			}
			await new Promise((r) => setTimeout(r, 200))
		}

		setPosterProgress("")
		return updated
	}, [])

	const loadFromBackend = useCallback(async () => {
		setSyncing(true)
		try {
			const {
				loadedMovies,
				loadedDocumentaries,
				loadedSeries,
				loadedBooks,
				loadedComics,
			} = await loadFromAPI()

			setMovies(loadedMovies)
			setDocumentaries(loadedDocumentaries)
			setSeries(loadedSeries)
			setBooks(loadedBooks)
			setComics(loadedComics)
			setLoading(false)
			setSyncing(false)
			setLastSync(new Date())

			let nextMovies = loadedMovies
			let nextDocumentaries = loadedDocumentaries
			let needPosterSave = false

			if (loadedMovies.some((f: Item) => !f.poster)) {
				nextMovies = await fetchMissingPosters(loadedMovies)
				setMovies(nextMovies)
				needPosterSave = true
			}
			if (loadedDocumentaries.some((f: Item) => !f.poster)) {
				nextDocumentaries = await fetchMissingPosters(loadedDocumentaries)
				setDocumentaries(nextDocumentaries)
				needPosterSave = true
			}
			if (needPosterSave) {
				await saveToAPI(
					nextMovies,
					loadedSeries,
					loadedBooks,
					loadedComics,
					nextDocumentaries,
				)
			}
		} catch (e) {
			console.error("Erreur chargement:", e)
			setSyncing(false)
			setLoading(false)
		}
	}, [fetchMissingPosters])

	// Load from API on mount (no localStorage seed — server is source of truth)
	useEffect(() => {
		setLoading(true)
		loadFromBackend()
	}, [loadFromBackend])

	// Save to cache whenever data changes
	useEffect(() => {
		if (movies.length > 0) {
			localStorage.setItem("cine_movies_cache", JSON.stringify(movies))
		}
	}, [movies])

	useEffect(() => {
		if (series.length > 0) {
			localStorage.setItem("cine_series_cache", JSON.stringify(series))
		}
	}, [series])

	useEffect(() => {
		if (books.length > 0) {
			localStorage.setItem("cine_books_cache", JSON.stringify(books))
		}
	}, [books])

	useEffect(() => {
		if (comics.length > 0) {
			localStorage.setItem("cine_comics_cache", JSON.stringify(comics))
		}
	}, [comics])

	useEffect(() => {
		if (documentaries.length > 0) {
			localStorage.setItem(
				"cine_documentaries_cache",
				JSON.stringify(documentaries),
			)
		}
	}, [documentaries])

	const saveToBackend = async (
		newMovies?: Item[],
		newSeries?: Item[],
		newBooks?: Book[],
		newComics?: Book[],
		newDocumentaries?: Item[],
	) => {
		setSyncing(true)
		try {
			await saveToAPI(
				newMovies !== undefined ? newMovies : movies,
				newSeries !== undefined ? newSeries : series,
				newBooks !== undefined ? newBooks : books,
				newComics !== undefined ? newComics : comics,
				newDocumentaries !== undefined ? newDocumentaries : documentaries,
			)
			setLastSync(new Date())
		} catch (e) {
			console.error("Erreur sauvegarde:", e)
		}
		setSyncing(false)
	}

	const [sort, setSort] = useState<SortType>("year-desc")
	const [showSeparators, setShowSeparators] = useState(true)
	const [showEdit, setShowEdit] = useState(false)

	const filtered = sortItems(
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
	)

	const groupedItems = useMemo(() => {
		if (sort === "added")
			return [{ key: null as string | null, items: filtered }]

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
	}, [filtered, sort, tab])

	const stats = {
		total: items.length,
		watched: items.filter((f) => isConsumed(f)).length,
	}

	const saveAll = (
		newMovies?: Item[],
		newSeries?: Item[],
		newBooks?: Book[],
		newComics?: Book[],
		newDocumentaries?: Item[],
	) => {
		saveToBackend(
			newMovies !== undefined ? newMovies : movies,
			newSeries !== undefined ? newSeries : series,
			newBooks !== undefined ? newBooks : books,
			newComics !== undefined ? newComics : comics,
			newDocumentaries !== undefined ? newDocumentaries : documentaries,
		)
	}

	const toggleWatch = (id: number, e?: React.MouseEvent) => {
		if (e) e.stopPropagation()
		const newItems = items.map((f) =>
			f.id === id
				? {
						...f,
						consumed_at: isConsumed(f) ? null : new Date().toISOString(),
					}
				: f,
		)
		setItems(newItems)
		if (selected?.id === id)
			setSelected({
				...selected,
				consumed_at: isConsumed(selected) ? null : new Date().toISOString(),
			})

		// Save to API
		if (tab === "films") saveAll(newItems)
		else if (tab === "documentaries")
			saveAll(undefined, undefined, undefined, undefined, newItems)
		else if (tab === "series") saveAll(undefined, newItems)
		else if (tab === "books") saveAll(undefined, undefined, newItems)
		else saveAll(undefined, undefined, undefined, newItems)
	}

	const addItem = (item: Item) => {
		const newItems = [item, ...items]
		setItems(newItems)

		if (tab === "films") saveAll(newItems)
		else if (tab === "documentaries")
			saveAll(undefined, undefined, undefined, undefined, newItems)
		else if (tab === "series") saveAll(undefined, newItems)
		else if (tab === "books") saveAll(undefined, undefined, newItems)
		else saveAll(undefined, undefined, undefined, newItems)
	}

	const deleteItem = (id: number) => {
		const newItems = items.filter((f) => f.id !== id)
		setItems(newItems)
		setSelected(null)

		if (tab === "films") saveAll(newItems)
		else if (tab === "documentaries")
			saveAll(undefined, undefined, undefined, undefined, newItems)
		else if (tab === "series") saveAll(undefined, newItems)
		else if (tab === "books") saveAll(undefined, undefined, newItems)
		else saveAll(undefined, undefined, undefined, newItems)
	}

	const updatePoster = (
		id: number,
		updates: { poster?: string; title?: string; year?: number },
	) => {
		// updates peut être {poster, title, year} ou juste {poster}
		const newItems = items.map((f) => {
			if (f.id === id) {
				return {
					...f,
					poster: updates.poster || f.poster,
					title: updates.title || f.title,
					year: updates.year || f.year,
				}
			}
			return f
		})
		setItems(newItems)
		if (selected?.id === id) {
			setSelected({
				...selected,
				poster: updates.poster || selected.poster,
				title: updates.title || selected.title,
				year: updates.year || selected.year,
			})
		}
		setShowFix(false)

		if (tab === "films") saveAll(newItems)
		else if (tab === "documentaries")
			saveAll(undefined, undefined, undefined, undefined, newItems)
		else if (tab === "series") saveAll(undefined, newItems)
		else if (tab === "books") saveAll(undefined, undefined, newItems)
		else saveAll(undefined, undefined, undefined, newItems)
	}

	const updateItem = (id: number, updates: Partial<Item>) => {
		const newItems = items.map((f) => (f.id === id ? { ...f, ...updates } : f))
		setItems(newItems)
		if (selected?.id === id) setSelected({ ...selected, ...updates } as Item)
		setShowEdit(false)

		if (tab === "films") saveAll(newItems)
		else if (tab === "documentaries")
			saveAll(undefined, undefined, undefined, undefined, newItems)
		else if (tab === "series") saveAll(undefined, newItems)
		else if (tab === "books") saveAll(undefined, undefined, newItems)
		else saveAll(undefined, undefined, undefined, newItems)
	}

	if (loading) {
		return (
			<div className="loading-screen">
				<div className="loading-spinner" />
				<div>Chargement de ta cinémathèque...</div>
			</div>
		)
	}

	return (
		<div>
			<Header
				stats={stats}
				syncing={syncing}
				posterProgress={posterProgress}
				onAddClick={() => setShowAdd(true)}
				tab={tab}
				onTabChange={setTab}
				counts={{
					movies: movies.length,
					documentaries: documentaries.length,
					series: series.length,
					books: books.length,
					comics: comics.length,
				}}
				search={search}
				onSearchChange={setSearch}
				filter={filter}
				onFilterChange={setFilter}
				sort={sort}
				onSortChange={setSort}
				view={view}
				onViewChange={setView}
				showSeparators={showSeparators}
				onShowSeparatorsChange={setShowSeparators}
				cardSize={cardSize}
				onCardSizeChange={setCardSize}
			/>

			<main className="main">
				<div className="count">
					{filtered.length} {tab}
				</div>
				{filtered.length > 0 ? (
					view === "grid" ? (
						<div className={showSeparators ? "grid-container" : ""}>
							{showSeparators ? (
								groupedItems.map((group) => (
									<Fragment key={group.key ?? "all"}>
										{group.key && (
											<div className="group-separator">{group.key}</div>
										)}
										<div
											className="grid"
											style={
												{
													"--card-size": `${cardSize}px`,
												} as React.CSSProperties
											}
										>
											{group.items.map((f) => (
												<ItemCard
													key={f.id}
													item={f}
													onSelect={setSelected}
													onToggleWatch={toggleWatch}
												/>
											))}
										</div>
									</Fragment>
								))
							) : (
								<div
									className="grid"
									style={
										{ "--card-size": `${cardSize}px` } as React.CSSProperties
									}
								>
									{filtered.map((f) => (
										<ItemCard
											key={f.id}
											item={f}
											onSelect={setSelected}
											onToggleWatch={toggleWatch}
										/>
									))}
								</div>
							)}
						</div>
					) : (
						<div className={showSeparators ? "list-container" : ""}>
							{showSeparators ? (
								groupedItems.map((group) => (
									<Fragment key={group.key ?? "all"}>
										{group.key && (
											<div className="group-separator">{group.key}</div>
										)}
										<div className="list">
											{group.items.map((f) => (
												<ItemListRow
													key={f.id}
													item={f}
													onSelect={setSelected}
													onToggleWatch={toggleWatch}
												/>
											))}
										</div>
									</Fragment>
								))
							) : (
								<div className="list">
									{filtered.map((f) => (
										<ItemListRow
											key={f.id}
											item={f}
											onSelect={setSelected}
											onToggleWatch={toggleWatch}
										/>
									))}
								</div>
							)}
						</div>
					)
				) : (
					<div className="empty">
						{items.length === 0
							? `Aucun ${tab === "films" ? "film" : tab === "documentaries" ? "documentaire" : tab === "series" ? "série" : tab === "books" ? "livre" : "BD"} ajouté. Clique sur "+ Ajouter" !`
							: "Aucun résultat"}
					</div>
				)}
			</main>

			{selected && (
				<ItemModal
					item={selected}
					tab={tab}
					onClose={() => setSelected(null)}
					onToggleWatch={(id) => toggleWatch(id)}
					onEdit={() => setShowEdit(true)}
					onFix={() => setShowFix(true)}
					onDelete={deleteItem}
					items={items}
					onAdd={addItem}
				/>
			)}

			{showAdd && (
				<AddModal
					type={tab}
					onClose={() => setShowAdd(false)}
					onAdd={addItem}
				/>
			)}
			{showFix && selected && (
				<FixPosterModal
					item={selected}
					type={tab}
					onClose={() => setShowFix(false)}
					onSelect={updatePoster}
				/>
			)}
			{showEdit && selected && (
				<EditModal
					item={selected}
					type={tab}
					onClose={() => setShowEdit(false)}
					onSave={updateItem}
				/>
			)}
		</div>
	)
}

export default App
