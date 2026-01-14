import { useEffect, useRef, useState } from "react"
import { getDetailsWithCredits, searchTMDB, TMDB_IMG_SM } from "@/api/tmdb"
import type { Item, TabType } from "@/types"
import { getPosterUrl } from "@/utils/poster"

interface AddModalProps {
	type: TabType
	onClose: () => void
	onAdd: (item: Item) => void
}

interface FormState {
	title: string
	director: string
	creator: string
	author: string
	year: string
	genre: string
	source: string
	watched: boolean
	poster: string
	seasons: string
	actors?: string
	country?: string
}

// Search result from either TMDB or Google Books
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
	genre?: string
}

const AddModal = ({ type, onClose, onAdd }: AddModalProps) => {
	const [query, setQuery] = useState("")
	const [results, setResults] = useState<SearchResult[]>([])
	const [searching, setSearching] = useState(false)
	const [form, setForm] = useState<FormState>({
		title: "",
		director: "",
		creator: "",
		author: "",
		year: "",
		genre: "",
		source: "",
		watched: false,
		poster: "",
		seasons: "",
	})
	const [mode, setMode] = useState<"search" | "manual">("search")
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const isFilm = type === "films"
	const isSeries = type === "series"
	const isBook = type === "books"
	const isMedia = isFilm || isSeries

	useEffect(() => {
		if (timeoutRef.current) clearTimeout(timeoutRef.current)
		if (!query || query.length < 2) {
			setResults([])
			return
		}

		timeoutRef.current = setTimeout(async () => {
			setSearching(true)
			try {
				if (isMedia) {
					const searchResults = await searchTMDB(
						query,
						isFilm ? "movie" : "tv",
						{
							language: "fr-FR",
						},
					)
					setResults(searchResults.slice(0, 8))
				} else {
					// Google Books API pour livres et BD
					const res = await fetch(
						`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8&langRestrict=fr`,
					)
					const data = await res.json()
					setResults(
						data.items?.map(
							(item: {
								id: string
								volumeInfo: {
									title: string
									authors?: string[]
									publishedDate?: string
									imageLinks?: { thumbnail?: string }
									categories?: string[]
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
								genre: item.volumeInfo.categories?.join(", ") || "",
							}),
						) || [],
					)
				}
			} catch {
				setResults([])
			}
			setSearching(false)
		}, 400)
	}, [query, isFilm, isMedia])

	const selectItem = async (item: SearchResult) => {
		if (isMedia) {
			try {
				const { details, credits } = await getDetailsWithCredits(
					Number(item.id),
					isFilm ? "movie" : "tv",
					{ language: "fr-FR" },
				)

				if (!details || !credits) {
					setForm({
						...form,
						title: item.title || item.name || "",
						year:
							(item.release_date || item.first_air_date)?.split("-")[0] || "",
					})
					return
				}

				if (isFilm) {
					setForm({
						title: item.title || "",
						director:
							credits.crew?.find((c) => c.job === "Director")?.name || "",
						creator: "",
						author: "",
						year: item.release_date?.split("-")[0] || "",
						genre: details.genres?.map((g) => g.name).join(", ") || "",
						actors:
							credits.cast
								?.slice(0, 4)
								.map((a) => a.name)
								.join(", ") || "",
						country: details.production_countries?.[0]?.name || "",
						source: "",
						watched: false,
						poster: getPosterUrl(item.poster_path) || "",
						seasons: "",
					})
				} else {
					setForm({
						title: item.name || "",
						director: "",
						creator: details.created_by?.[0]?.name || "",
						author: "",
						year: item.first_air_date?.split("-")[0] || "",
						genre: details.genres?.map((g) => g.name).join(", ") || "",
						actors:
							credits.cast
								?.slice(0, 4)
								.map((a) => a.name)
								.join(", ") || "",
						country: details.origin_country?.[0] || "",
						seasons: String(details.number_of_seasons || ""),
						source: "",
						watched: false,
						poster: getPosterUrl(item.poster_path) || "",
					})
				}
			} catch {
				setForm({
					...form,
					title: item.title || item.name || "",
					year: (item.release_date || item.first_air_date)?.split("-")[0] || "",
				})
			}
		} else {
			// Livre ou BD
			setForm({
				title: item.title || "",
				director: "",
				creator: "",
				author: item.author || "",
				year: item.year || "",
				genre: item.genre || "",
				source: "",
				watched: false,
				poster: item.poster || "",
				seasons: "",
			})
		}
		setMode("manual")
		setResults([])
		setQuery("")
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!form.title) return
		onAdd({
			...form,
			id: Date.now(),
			year: parseInt(form.year, 10) || new Date().getFullYear(),
			seasons: form.seasons ? parseInt(form.seasons, 10) : undefined,
		} as unknown as Item)
		onClose()
	}

	const getTypeLabel = () => {
		if (isFilm) return "un film"
		if (isSeries) return "une série"
		if (isBook) return "un livre"
		return "une BD"
	}

	const getIcon = () => {
		if (isFilm) return "🎬"
		if (isSeries) return "📺"
		if (isBook) return "📚"
		return "📖"
	}

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop
		// biome-ignore lint/a11y/useKeyWithClickEvents: modal backdrop pattern
		<div className="modal-bg" onClick={onClose}>
			<div
				className="modal add-modal"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.stopPropagation()}
				role="dialog"
				aria-modal="true"
			>
				<div className="modal-head">
					<div className="modal-title">Ajouter {getTypeLabel()}</div>
					<button type="button" className="modal-close" onClick={onClose}>
						×
					</button>
				</div>
				<div className="modal-body">
					{mode === "search" && (
						<>
							<div className="search-input-wrap">
								<input
									type="text"
									className="search-box full"
									placeholder={`Rechercher ${getTypeLabel()}...`}
									value={query}
									onChange={(e) => setQuery(e.target.value)}
								/>
								{searching && <div className="spinner" />}
							</div>

							{results.length > 0 && (
								<div className="search-results">
									{results.map((m) => (
										<button
											type="button"
											key={m.id}
											className="search-result"
											onClick={() => selectItem(m)}
										>
											{(isMedia ? m.poster_path : m.poster) ? (
												<img
													src={
														isMedia
															? TMDB_IMG_SM + m.poster_path
															: m.poster || ""
													}
													alt=""
												/>
											) : (
												<div className="no-poster">{getIcon()}</div>
											)}
											<div>
												<div className="result-title">{m.title || m.name}</div>
												<div className="result-year">
													{isMedia
														? (m.release_date || m.first_air_date)?.split(
																"-",
															)[0]
														: m.year}
													{!isMedia && m.author && ` · ${m.author}`}
												</div>
											</div>
										</button>
									))}
								</div>
							)}

							<button
								type="button"
								className="link-btn"
								onClick={() => setMode("manual")}
							>
								Ou ajouter manuellement →
							</button>
						</>
					)}

					{mode === "manual" && (
						<form onSubmit={handleSubmit}>
							{form.poster && (
								<div className="form-poster">
									<img src={form.poster} alt="" />
									<button
										type="button"
										onClick={() => {
											setForm({ ...form, poster: "" })
											setMode("search")
										}}
									>
										Changer
									</button>
								</div>
							)}

							<div className="form-grid">
								<label className="full">
									<span>Titre *</span>
									<input
										type="text"
										value={form.title}
										onChange={(e) =>
											setForm({ ...form, title: e.target.value })
										}
										required
									/>
								</label>
								<label>
									<span>
										{isFilm ? "Réalisateur" : isSeries ? "Créateur" : "Auteur"}
									</span>
									<input
										type="text"
										value={
											isFilm
												? form.director
												: isSeries
													? form.creator
													: form.author
										}
										onChange={(e) =>
											setForm({
												...form,
												[isFilm ? "director" : isSeries ? "creator" : "author"]:
													e.target.value,
											})
										}
									/>
								</label>
								<label>
									<span>Année</span>
									<input
										type="number"
										value={form.year}
										onChange={(e) => setForm({ ...form, year: e.target.value })}
									/>
								</label>
								{isSeries && (
									<label>
										<span>Saisons</span>
										<input
											type="number"
											value={form.seasons}
											onChange={(e) =>
												setForm({ ...form, seasons: e.target.value })
											}
										/>
									</label>
								)}
								<label className={isSeries ? "" : "full"}>
									<span>Genre</span>
									<input
										type="text"
										value={form.genre}
										onChange={(e) =>
											setForm({ ...form, genre: e.target.value })
										}
										placeholder={isMedia ? "Drame, Action..." : "Roman, SF..."}
									/>
								</label>
								<label className="full">
									<span>Source / Reco</span>
									<input
										type="text"
										value={form.source}
										onChange={(e) =>
											setForm({ ...form, source: e.target.value })
										}
										placeholder="Reco ami..."
									/>
								</label>
								<label className="checkbox">
									<input
										type="checkbox"
										checked={form.watched}
										onChange={(e) =>
											setForm({ ...form, watched: e.target.checked })
										}
									/>
									<span>{isMedia ? "Déjà vu" : "Déjà lu"}</span>
								</label>
							</div>

							<div className="form-actions">
								<button
									type="button"
									className="btn btn-secondary"
									onClick={onClose}
								>
									Annuler
								</button>
								<button type="submit" className="btn btn-primary">
									Ajouter
								</button>
							</div>
						</form>
					)}
				</div>
			</div>
		</div>
	)
}

export default AddModal
