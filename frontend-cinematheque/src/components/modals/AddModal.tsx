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
	recommendation_source: string
	watched: boolean
	poster: string
	seasons: string
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
		recommendation_source: "",
		watched: false,
		poster: "",
		seasons: "",
	})
	const [mode, setMode] = useState<"search" | "manual">("search")
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const isFilmTab = type === "films"
	const isDocumentaryTab = type === "documentaries"
	const isSeries = type === "series"
	const isBook = type === "books"
	const isMedia = isFilmTab || isSeries || isDocumentaryTab

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
						isSeries ? "tv" : "movie",
						{
							language: "en-US",
						},
					)
					setResults(searchResults.slice(0, 8))
				} else {
					// Google Books API for books and comics
					const res = await fetch(
						`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8&langRestrict=en`,
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
							}),
						) || [],
					)
				}
			} catch {
				setResults([])
			}
			setSearching(false)
		}, 400)
	}, [query, isSeries, isMedia])

	const selectItem = async (item: SearchResult) => {
		if (isMedia) {
			try {
				const { details, credits } = await getDetailsWithCredits(
					Number(item.id),
					isSeries ? "tv" : "movie",
					{ language: "en-US" },
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

				if (isFilmTab || isDocumentaryTab) {
					setForm({
						title: item.title || "",
						director:
							credits.crew?.find((c) => c.job === "Director")?.name || "",
						creator: "",
						author: "",
						year: item.release_date?.split("-")[0] || "",
						country: details.production_countries?.[0]?.name || "",
						recommendation_source: "",
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
						country: details.origin_country?.[0] || "",
						seasons: String(details.number_of_seasons || ""),
						recommendation_source: "",
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
			// Book or comic
			setForm({
				title: item.title || "",
				director: "",
				creator: "",
				author: item.author || "",
				year: item.year || "",
				recommendation_source: "",
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
		const { watched, ...rest } = form
		const base = {
			...rest,
			id: Date.now(),
			year: parseInt(form.year, 10) || new Date().getFullYear(),
			seasons: form.seasons ? parseInt(form.seasons, 10) : undefined,
			consumed_at: watched ? new Date().toISOString() : null,
		}
		// Books (book/comic) need a type field
		if (isBook || type === "comics") {
			;(base as { type: "book" | "comic" }).type =
				type === "books" ? "book" : "comic"
		}
		if (isFilmTab) {
			;(base as { type: "movie" | "documentary" }).type = "movie"
		}
		if (isDocumentaryTab) {
			;(base as { type: "movie" | "documentary" }).type = "documentary"
		}
		onAdd(base as unknown as Item)
		onClose()
	}

	const getTypeLabel = () => {
		if (isFilmTab) return "a movie"
		if (isDocumentaryTab) return "a documentary"
		if (isSeries) return "a series"
		if (isBook) return "a book"
		return "a comic"
	}

	const getIcon = () => {
		if (isFilmTab) return "🎬"
		if (isDocumentaryTab) return "🎥"
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
					<div className="modal-title">Add {getTypeLabel()}</div>
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
									placeholder={`Search for ${getTypeLabel()}...`}
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
								Or add manually →
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
										Change
									</button>
								</div>
							)}

							<div className="form-grid">
								<label className="full">
									<span>Title *</span>
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
										{isFilmTab || isDocumentaryTab
											? "Director"
											: isSeries
												? "Creator"
												: "Author"}
									</span>
									<input
										type="text"
										value={
											isFilmTab || isDocumentaryTab
												? form.director
												: isSeries
													? form.creator
													: form.author
										}
										onChange={(e) =>
											setForm({
												...form,
												[isFilmTab || isDocumentaryTab
													? "director"
													: isSeries
														? "creator"
														: "author"]: e.target.value,
											})
										}
									/>
								</label>
								<label>
									<span>Year</span>
									<input
										type="number"
										value={form.year}
										onChange={(e) => setForm({ ...form, year: e.target.value })}
									/>
								</label>
								{isSeries && (
									<label>
										<span>Seasons</span>
										<input
											type="number"
											value={form.seasons}
											onChange={(e) =>
												setForm({ ...form, seasons: e.target.value })
											}
										/>
									</label>
								)}
								{isMedia && (
									<label className="full">
										<span>Country</span>
										<input
											type="text"
											value={form.country ?? ""}
											onChange={(e) =>
												setForm({ ...form, country: e.target.value })
											}
										/>
									</label>
								)}
								{(isBook || type === "comics") && (
									<label className="full">
										<span>Country</span>
										<input
											type="text"
											value={form.country ?? ""}
											onChange={(e) =>
												setForm({ ...form, country: e.target.value })
											}
										/>
									</label>
								)}
								<label className="full">
									<span>Source / recommendation</span>
									<input
										type="text"
										value={form.recommendation_source}
										onChange={(e) =>
											setForm({
												...form,
												recommendation_source: e.target.value,
											})
										}
										placeholder="Friend tip..."
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
									<span>{isMedia ? "Already watched" : "Already read"}</span>
								</label>
							</div>

							<div className="form-actions">
								<button
									type="button"
									className="btn btn-secondary"
									onClick={onClose}
								>
									Cancel
								</button>
								<button type="submit" className="btn btn-primary">
									Add
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
