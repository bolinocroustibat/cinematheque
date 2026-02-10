import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import { loadFromAPI, saveToAPI } from "@/api/api"
import { fetchPoster } from "@/api/tmdb"
import AddModal from "@/components/modals/AddModal"
import EditModal from "@/components/modals/EditModal"
import FixPosterModal from "@/components/modals/FixPosterModal"
import Header from "@/components/layout/Header"
import ItemCard from "@/components/items/ItemCard"
import ItemListRow from "@/components/items/ItemListRow"
import ItemModal from "@/components/modals/ItemModal"
import type {
	Book,
	BookType,
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
	const normalizeConsumedAt = <T extends { consumed_at?: string | null; watched?: boolean }>(
		item: T,
	): Omit<T, "watched"> & { consumed_at: string | null } => {
		const { watched, ...rest } = item
		return {
			...rest,
			consumed_at:
				rest.consumed_at != null && rest.consumed_at !== ""
					? rest.consumed_at
					: watched
						? new Date().toISOString()
						: null,
		} as Omit<T, "watched"> & { consumed_at: string | null }
	}

	const [movies, setMovies] = useState<Item[]>(() => {
		const cached = localStorage.getItem("cine_movies_cache")
		const raw = cached ? JSON.parse(cached) : []
		return raw.map((m: Item & { watched?: boolean }) => normalizeConsumedAt(m))
	})
	const [series, setSeries] = useState<Item[]>(() => {
		const cached = localStorage.getItem("cine_series_cache")
		const raw = cached ? JSON.parse(cached) : []
		return raw.map((s: Item & { watched?: boolean }) => normalizeConsumedAt(s))
	})
	const [books, setBooks] = useState<Book[]>(() => {
		const cached = localStorage.getItem("cine_books_cache")
		const raw = cached ? JSON.parse(cached) : []
		return raw.map((p: Book & { type?: BookType; watched?: boolean }) =>
			normalizeConsumedAt({ ...p, type: p.type ?? "book" }),
		)
	})
	const [comics, setComics] = useState<Book[]>(() => {
		const cached = localStorage.getItem("cine_comics_cache")
		const raw = cached ? JSON.parse(cached) : []
		return raw.map((p: Book & { type?: BookType; watched?: boolean }) =>
			normalizeConsumedAt({ ...p, type: p.type ?? "comic" }),
		)
	})
	const [search, setSearch] = useState("")
	const [filter, setFilter] = useState<FilterType>("all")
	const [genre, setGenre] = useState("")
	const [selected, setSelected] = useState<Item | null>(null)
	const [view, setView] = useState<ViewType>("grid")
	const [cardSize, setCardSize] = useState(120)
	const [showAdd, setShowAdd] = useState(false)
	const [showFix, setShowFix] = useState(false)
	const [loading, setLoading] = useState(false)
	const [syncing, setSyncing] = useState(false)
	const [_lastSync, setLastSync] = useState<Date | null>(null)

	const items =
		tab === "films"
			? movies
			: tab === "series"
				? series
				: tab === "books"
					? books
					: comics
	const setItems: React.Dispatch<React.SetStateAction<Item[]>> =
		tab === "films"
			? setMovies
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
			const { loadedMovies, loadedSeries, loadedBooks, loadedComics } =
				await loadFromAPI()

			setMovies(loadedMovies)
			setSeries(loadedSeries)
			setBooks(loadedBooks)
			setComics(loadedComics)
			setLoading(false)
			setSyncing(false)
			setLastSync(new Date())

			const missingPosters = loadedMovies.filter((f: Item) => !f.poster).length
			if (missingPosters > 0) {
				const updatedMovies = await fetchMissingPosters(loadedMovies)
				setMovies(updatedMovies)
				await saveToAPI(
					updatedMovies,
					loadedSeries,
					loadedBooks,
					loadedComics,
				)
			}
		} catch (e) {
			console.error("Erreur chargement:", e)
			setSyncing(false)
			setLoading(false)
		}
	}, [fetchMissingPosters])

	// Load from API on mount
	useEffect(() => {
		const cached = localStorage.getItem("cine_movies_cache")
		if (!cached) setLoading(true)
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

	const saveToBackend = async (
		newMovies?: Item[],
		newSeries?: Item[],
		newBooks?: Book[],
		newComics?: Book[],
	) => {
		setSyncing(true)
		try {
			await saveToAPI(
				newMovies !== undefined ? newMovies : movies,
				newSeries !== undefined ? newSeries : series,
				newBooks !== undefined ? newBooks : books,
				newComics !== undefined ? newComics : comics,
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

	const genres = [
		...new Set(
			items.flatMap((f) =>
				f.genre ? f.genre.split(",").map((g) => g.trim()) : [],
			),
		),
	].sort()

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
			if (genre && !f.genre?.toLowerCase().includes(genre.toLowerCase()))
				return false
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
	) => {
		saveToBackend(
			newMovies !== undefined ? newMovies : movies,
			newSeries !== undefined ? newSeries : series,
			newBooks !== undefined ? newBooks : books,
			newComics !== undefined ? newComics : comics,
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
				consumed_at: isConsumed(selected)
					? null
					: new Date().toISOString(),
			})

		// Save to API
		if (tab === "films") saveAll(newItems, undefined, undefined, undefined)
		else if (tab === "series")
			saveAll(undefined, newItems, undefined, undefined)
		else if (tab === "books") saveAll(undefined, undefined, newItems, undefined)
		else saveAll(undefined, undefined, undefined, newItems)
	}

	const addItem = (item: Item) => {
		const newItems = [item, ...items]
		setItems(newItems)

		if (tab === "films") saveAll(newItems, undefined, undefined, undefined)
		else if (tab === "series")
			saveAll(undefined, newItems, undefined, undefined)
		else if (tab === "books") saveAll(undefined, undefined, newItems, undefined)
		else saveAll(undefined, undefined, undefined, newItems)
	}

	const deleteItem = (id: number) => {
		const newItems = items.filter((f) => f.id !== id)
		setItems(newItems)
		setSelected(null)

		if (tab === "films") saveAll(newItems, undefined, undefined, undefined)
		else if (tab === "series")
			saveAll(undefined, newItems, undefined, undefined)
		else if (tab === "books") saveAll(undefined, undefined, newItems, undefined)
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

		if (tab === "films") saveAll(newItems, undefined, undefined, undefined)
		else if (tab === "series")
			saveAll(undefined, newItems, undefined, undefined)
		else if (tab === "books") saveAll(undefined, undefined, newItems, undefined)
		else saveAll(undefined, undefined, undefined, newItems)
	}

	const updateItem = (id: number, updates: Partial<Item>) => {
		const newItems = items.map((f) => (f.id === id ? { ...f, ...updates } : f))
		setItems(newItems)
		if (selected?.id === id) setSelected({ ...selected, ...updates } as Item)
		setShowEdit(false)

		if (tab === "films") saveAll(newItems, undefined, undefined, undefined)
		else if (tab === "series")
			saveAll(undefined, newItems, undefined, undefined)
		else if (tab === "books") saveAll(undefined, undefined, newItems, undefined)
		else saveAll(undefined, undefined, undefined, newItems)
	}

	if (loading && movies.length === 0) {
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
					series: series.length,
					books: books.length,
					comics: comics.length,
				}}
				search={search}
				onSearchChange={setSearch}
				filter={filter}
				onFilterChange={setFilter}
				genre={genre}
				onGenreChange={setGenre}
				genres={genres}
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
							? `Aucun ${tab === "films" ? "film" : tab === "series" ? "série" : tab === "books" ? "livre" : "BD"} ajouté. Clique sur "+ Ajouter" !`
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
