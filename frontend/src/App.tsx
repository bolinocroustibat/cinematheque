import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import {
	loadFromSheets as loadFromSheetsAPI,
	saveToSheets as saveToSheetsAPI,
} from "@/api/sheets.js"
import { fetchPoster } from "@/api/tmdb"
import AddModal from "@/components/modals/AddModal"
import EditModal from "@/components/modals/EditModal"
import FixPosterModal from "@/components/modals/FixPosterModal"
import Header from "@/components/layout/Header"
import ItemCard from "@/components/items/ItemCard"
import ItemListRow from "@/components/items/ItemListRow"
import ItemModal from "@/components/modals/ItemModal"
import type { FilterType, Item, SortType, TabType, ViewType } from "@/types"
import { getGroupKey, sortItems } from "@/utils/sorting"

const App = () => {
	const [tab, setTab] = useState<TabType>("films")
	const [films, setFilms] = useState<Item[]>(() => {
		const cached = localStorage.getItem("cine_films_cache")
		return cached ? JSON.parse(cached) : []
	})
	const [series, setSeries] = useState<Item[]>(() => {
		const cached = localStorage.getItem("cine_series_cache")
		return cached ? JSON.parse(cached) : []
	})
	const [books, setBooks] = useState<Item[]>(() => {
		const cached = localStorage.getItem("cine_books_cache")
		return cached ? JSON.parse(cached) : []
	})
	const [comics, setComics] = useState<Item[]>(() => {
		const cached = localStorage.getItem("cine_comics_cache")
		return cached ? JSON.parse(cached) : []
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
			? films
			: tab === "series"
				? series
				: tab === "books"
					? books
					: comics
	const setItems: React.Dispatch<React.SetStateAction<Item[]>> =
		tab === "films"
			? setFilms
			: tab === "series"
				? setSeries
				: tab === "books"
					? setBooks
					: setComics

	const [posterProgress, setPosterProgress] = useState("")

	// Fetch missing posters after loading
	const fetchMissingPosters = useCallback(async (filmsList: Item[]) => {
		const needPoster = filmsList.filter((f) => !f.poster)
		if (needPoster.length === 0) return filmsList

		setPosterProgress(`0/${needPoster.length}`)
		const updated = [...filmsList]
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

	const loadFromSheets = useCallback(async () => {
		setSyncing(true)
		try {
			const { loadedFilms, loadedSeries, loadedBooks, loadedComics } =
				await loadFromSheetsAPI()

			// Mettre à jour immédiatement avec les données du serveur
			setFilms(loadedFilms)
			setSeries(loadedSeries)
			setBooks(loadedBooks)
			setComics(loadedComics)
			setLoading(false)
			setSyncing(false)
			setLastSync(new Date())

			// Check if we need to fetch posters (en arrière-plan)
			const missingPosters = loadedFilms.filter((f: Item) => !f.poster).length

			if (missingPosters > 0) {
				const updatedFilms = await fetchMissingPosters(loadedFilms)
				setFilms(updatedFilms)
				// Save updated films with posters to Sheets
				await saveToSheetsAPI(
					updatedFilms,
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

	// Load from Google Sheets on mount
	useEffect(() => {
		const cached = localStorage.getItem("cine_films_cache")
		if (!cached) setLoading(true)
		loadFromSheets()
	}, [loadFromSheets])

	// Save to cache whenever data changes
	useEffect(() => {
		if (films.length > 0) {
			localStorage.setItem("cine_films_cache", JSON.stringify(films))
		}
	}, [films])

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

	const saveToSheets = async (
		newFilms?: Item[],
		newSeries?: Item[],
		newBooks?: Item[],
		newComics?: Item[],
	) => {
		setSyncing(true)
		try {
			await saveToSheetsAPI(
				newFilms !== undefined ? newFilms : films,
				newSeries !== undefined ? newSeries : series,
				newBooks !== undefined ? newBooks : books,
				newComics !== undefined ? newComics : comics,
			)
			setLastSync(new Date())

			// Also save to localStorage as backup
			localStorage.setItem("cine_films", JSON.stringify(newFilms || films))
			localStorage.setItem("cine_series", JSON.stringify(newSeries || series))
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
			if (filter === "watched" && !f.watched) return false
			if (filter === "unwatched" && f.watched) return false
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
		watched: items.filter((f) => f.watched).length,
	}

	const saveAll = (
		newFilms?: Item[],
		newSeries?: Item[],
		newBooks?: Item[],
		newComics?: Item[],
	) => {
		saveToSheets(
			newFilms !== undefined ? newFilms : films,
			newSeries !== undefined ? newSeries : series,
			newBooks !== undefined ? newBooks : books,
			newComics !== undefined ? newComics : comics,
		)
	}

	const toggleWatch = (id: number, e?: React.MouseEvent) => {
		if (e) e.stopPropagation()
		const newItems = items.map((f) =>
			f.id === id ? { ...f, watched: !f.watched } : f,
		)
		setItems(newItems)
		if (selected?.id === id)
			setSelected({ ...selected, watched: !selected.watched })

		// Save to sheets
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

	if (loading && films.length === 0) {
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
					films: films.length,
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
