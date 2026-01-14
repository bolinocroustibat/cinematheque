import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import {
	loadFromSheets as loadFromSheetsAPI,
	saveToSheets as saveToSheetsAPI,
} from "@/api/sheets.js"
import { fetchPoster } from "@/api/tmdb"
import AddModal from "@/components/AddModal.jsx"
import EditModal from "@/components/EditModal.jsx"
import FixPosterModal from "@/components/FixPosterModal.jsx"
import ItemModal from "@/components/ItemModal"
import { getSmallPoster } from "@/utils/poster"
import { getGroupKey, sortItems } from "@/utils/sorting"

const App = () => {
	const [tab, setTab] = useState("films")
	const [films, setFilms] = useState(() => {
		const cached = localStorage.getItem("cine_films_cache")
		return cached ? JSON.parse(cached) : []
	})
	const [series, setSeries] = useState(() => {
		const cached = localStorage.getItem("cine_series_cache")
		return cached ? JSON.parse(cached) : []
	})
	const [books, setBooks] = useState(() => {
		const cached = localStorage.getItem("cine_books_cache")
		return cached ? JSON.parse(cached) : []
	})
	const [comics, setComics] = useState(() => {
		const cached = localStorage.getItem("cine_comics_cache")
		return cached ? JSON.parse(cached) : []
	})
	const [search, setSearch] = useState("")
	const [filter, setFilter] = useState("all")
	const [genre, setGenre] = useState("")
	const [selected, setSelected] = useState(null)
	const [view, setView] = useState("grid")
	const [cardSize, setCardSize] = useState(120)
	const [showAdd, setShowAdd] = useState(false)
	const [showFix, setShowFix] = useState(false)
	const [loading, setLoading] = useState(false)
	const [syncing, setSyncing] = useState(false)
	const [_lastSync, setLastSync] = useState(null)

	const items =
		tab === "films"
			? films
			: tab === "series"
				? series
				: tab === "books"
					? books
					: comics
	const setItems =
		tab === "films"
			? setFilms
			: tab === "series"
				? setSeries
				: tab === "books"
					? setBooks
					: setComics

	const [posterProgress, setPosterProgress] = useState("")

	// Fetch missing posters after loading
	const fetchMissingPosters = useCallback(async (filmsList) => {
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
			const missingPosters = loadedFilms.filter((f) => !f.poster).length

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

	const saveToSheets = async (newFilms, newSeries, newBooks, newComics) => {
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

	const [sort, setSort] = useState("year-desc")
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
				!f.director?.toLowerCase().includes(search.toLowerCase()) &&
				!f.author?.toLowerCase().includes(search.toLowerCase())
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
		if (sort === "added") return [{ key: null, items: filtered }]

		const groups = []
		let currentKey = null

		filtered.forEach((item) => {
			const key = getGroupKey(item, sort, tab)
			if (key !== currentKey) {
				groups.push({ key, items: [item] })
				currentKey = key
			} else {
				groups[groups.length - 1].items.push(item)
			}
		})

		return groups
	}, [filtered, sort, tab])

	const stats = {
		total: items.length,
		watched: items.filter((f) => f.watched).length,
	}

	const saveAll = (newFilms, newSeries, newBooks, newComics) => {
		saveToSheets(
			newFilms !== undefined ? newFilms : films,
			newSeries !== undefined ? newSeries : series,
			newBooks !== undefined ? newBooks : books,
			newComics !== undefined ? newComics : comics,
		)
	}

	const toggleWatch = (id, e) => {
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

	const addItem = (item) => {
		const newItems = [item, ...items]
		setItems(newItems)

		if (tab === "films") saveAll(newItems, undefined, undefined, undefined)
		else if (tab === "series")
			saveAll(undefined, newItems, undefined, undefined)
		else if (tab === "books") saveAll(undefined, undefined, newItems, undefined)
		else saveAll(undefined, undefined, undefined, newItems)
	}

	const deleteItem = (id) => {
		const newItems = items.filter((f) => f.id !== id)
		setItems(newItems)
		setSelected(null)

		if (tab === "films") saveAll(newItems, undefined, undefined, undefined)
		else if (tab === "series")
			saveAll(undefined, newItems, undefined, undefined)
		else if (tab === "books") saveAll(undefined, undefined, newItems, undefined)
		else saveAll(undefined, undefined, undefined, newItems)
	}

	const updatePoster = (id, updates) => {
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

	const updateItem = (id, updates) => {
		const newItems = items.map((f) => (f.id === id ? { ...f, ...updates } : f))
		setItems(newItems)
		if (selected?.id === id) setSelected({ ...selected, ...updates })
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
				<div className="loading-spinner"></div>
				<div>Chargement de ta cinémathèque...</div>
			</div>
		)
	}

	return (
		<div>
			<header className="header">
				<div className="header-top">
					<div className="logo">
						ma <span>collection</span>
					</div>
					<div className="header-right">
						<div className="stats">
							<b>{stats.total}</b> {tab} · <b>{stats.watched}</b>{" "}
							{tab === "books" || tab === "comics"
								? stats.watched > 1
									? "lus"
									: "lu"
								: stats.watched > 1
									? "vus"
									: "vu"}
							{syncing && <span className="sync-icon"> ⟳</span>}
						</div>
						<button
							type="button"
							className="add-btn"
							onClick={() => setShowAdd(true)}
						>
							+ Ajouter
						</button>
					</div>
				</div>

				{posterProgress && (
					<div className="poster-progress">
						Téléchargement des affiches... {posterProgress}
					</div>
				)}

				<div className="tabs">
					<button
						type="button"
						className={`tab ${tab === "films" ? "active" : ""}`}
						onClick={() => {
							setTab("films")
							setGenre("")
						}}
					>
						Films <span className="tab-count">{films.length}</span>
					</button>
					<button
						type="button"
						className={`tab ${tab === "series" ? "active" : ""}`}
						onClick={() => {
							setTab("series")
							setGenre("")
						}}
					>
						Séries <span className="tab-count">{series.length}</span>
					</button>
					<button
						type="button"
						className={`tab ${tab === "books" ? "active" : ""}`}
						onClick={() => {
							setTab("books")
							setGenre("")
						}}
					>
						Livres <span className="tab-count">{books.length}</span>
					</button>
					<button
						type="button"
						className={`tab ${tab === "comics" ? "active" : ""}`}
						onClick={() => {
							setTab("comics")
							setGenre("")
						}}
					>
						BD <span className="tab-count">{comics.length}</span>
					</button>
				</div>

				<div className="controls">
					<input
						className="search-box"
						placeholder="Rechercher..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
					<div className="filter-divider"></div>
					<button
						type="button"
						className={`filter-btn ${filter === "all" ? "active" : ""}`}
						onClick={() => setFilter("all")}
					>
						Tous
					</button>
					<button
						type="button"
						className={`filter-btn ${filter === "unwatched" ? "active" : ""}`}
						onClick={() => setFilter("unwatched")}
					>
						{tab === "books" || tab === "comics" ? "À lire" : "À voir"}
					</button>
					<button
						type="button"
						className={`filter-btn ${filter === "watched" ? "active" : ""}`}
						onClick={() => setFilter("watched")}
					>
						{tab === "books" || tab === "comics" ? "Lus" : "Vus"}
					</button>
					<div className="filter-divider"></div>
					<select value={genre} onChange={(e) => setGenre(e.target.value)}>
						<option value="">Genre</option>
						{genres.map((g) => (
							<option key={g} value={g}>
								{g}
							</option>
						))}
					</select>
					<select
						value={sort}
						onChange={(e) => setSort(e.target.value)}
						className="sort-select"
					>
						<option value="year-desc">Année ↓</option>
						<option value="year-asc">Année ↑</option>
						<option value="alpha-asc">A → Z</option>
						<option value="alpha-desc">Z → A</option>
						<option value="director">
							{tab === "films"
								? "Réalisateur"
								: tab === "series"
									? "Créateur"
									: "Auteur"}
						</option>
						<option value="added">Récents</option>
						<option value="unwatched">
							{tab === "books" || tab === "comics" ? "Non lus" : "Non vus"}
						</option>
					</select>
					<div className="view-controls">
						<button
							type="button"
							className={`view-btn ${view === "grid" ? "active" : ""}`}
							onClick={() => setView("grid")}
						>
							▦
						</button>
						<button
							type="button"
							className={`view-btn ${view === "list" ? "active" : ""}`}
							onClick={() => setView("list")}
						>
							☰
						</button>
						<button
							type="button"
							className={`view-btn ${showSeparators ? "active" : ""}`}
							onClick={() => setShowSeparators(!showSeparators)}
							title="Séparateurs"
						>
							―
						</button>
						{view === "grid" && (
							<input
								type="range"
								className="size-slider"
								min="80"
								max="160"
								value={cardSize}
								onChange={(e) => setCardSize(Number(e.target.value))}
							/>
						)}
					</div>
				</div>
			</header>

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
											style={{ "--card-size": `${cardSize}px` }}
										>
											{group.items.map((f) => (
												<div
													key={f.id}
													className={`card ${f.watched ? "is-watched" : "is-unwatched"}`}
													onClick={() => setSelected(f)}
												>
													{f.poster ? (
														<>
															<img
																className="card-img"
																src={getSmallPoster(f.poster)}
																alt={f.title}
																loading="lazy"
															/>
															<div className="card-info">
																<div className="card-title">{f.title}</div>
																<div className="card-year">{f.year}</div>
															</div>
														</>
													) : (
														<div className="card-noimg">
															<div className="card-title">{f.title}</div>
															<div className="card-year">{f.year}</div>
														</div>
													)}
													<div
														className={`watch-btn ${f.watched ? "watched" : ""}`}
														onClick={(e) => toggleWatch(f.id, e)}
													>
														✓
													</div>
												</div>
											))}
										</div>
									</Fragment>
								))
							) : (
								<div
									className="grid"
									style={{ "--card-size": `${cardSize}px` }}
								>
									{filtered.map((f) => (
										<div
											key={f.id}
											className={`card ${f.watched ? "is-watched" : "is-unwatched"}`}
											onClick={() => setSelected(f)}
										>
											{f.poster ? (
												<>
													<img
														className="card-img"
														src={getSmallPoster(f.poster)}
														alt={f.title}
														loading="lazy"
													/>
													<div className="card-info">
														<div className="card-title">{f.title}</div>
														<div className="card-year">{f.year}</div>
													</div>
												</>
											) : (
												<div className="card-noimg">
													<div className="card-title">{f.title}</div>
													<div className="card-year">{f.year}</div>
												</div>
											)}
											<div
												className={`watch-btn ${f.watched ? "watched" : ""}`}
												onClick={(e) => toggleWatch(f.id, e)}
											>
												✓
											</div>
										</div>
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
												<div
													key={f.id}
													className={`list-item ${f.watched ? "is-watched" : "is-unwatched"}`}
													onClick={() => setSelected(f)}
												>
													{f.poster ? (
														<img
															className="list-poster"
															src={getSmallPoster(f.poster)}
															alt=""
															loading="lazy"
														/>
													) : (
														<div className="list-poster-empty">?</div>
													)}
													<div className="list-info">
														<div className="list-title">{f.title}</div>
														<div className="list-meta">
															{f.director || f.creator || f.author} · {f.year}
														</div>
													</div>
													<div
														className={`watch-btn ${f.watched ? "watched" : ""}`}
														onClick={(e) => toggleWatch(f.id, e)}
													>
														✓
													</div>
												</div>
											))}
										</div>
									</Fragment>
								))
							) : (
								<div className="list">
									{filtered.map((f) => (
										<div
											key={f.id}
											className={`list-item ${f.watched ? "is-watched" : "is-unwatched"}`}
											onClick={() => setSelected(f)}
										>
											{f.poster ? (
												<img
													className="list-poster"
													src={getSmallPoster(f.poster)}
													alt=""
													loading="lazy"
												/>
											) : (
												<div className="list-poster-empty">?</div>
											)}
											<div className="list-info">
												<div className="list-title">{f.title}</div>
												<div className="list-meta">
													{f.director || f.creator || f.author} · {f.year}
												</div>
											</div>
											<div
												className={`watch-btn ${f.watched ? "watched" : ""}`}
												onClick={(e) => toggleWatch(f.id, e)}
											>
												✓
											</div>
										</div>
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
