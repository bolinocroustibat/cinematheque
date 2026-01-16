import { useCallback, useEffect, useState } from "react"
import { OMDB_BASE_URL, searchTMDB } from "@/api/tmdb"
import type { Item, TabType } from "@/types"
import { getPosterUrl } from "@/utils/poster"

interface FixPosterModalProps {
	item: Item
	type: TabType
	onClose: () => void
	onSelect: (
		id: number,
		updates: { poster: string; title?: string; year?: number },
	) => void
}

interface SearchResult {
	id: string | number
	title: string
	year: string
	poster: string | null
	source: string
}

const FixPosterModal = ({
	item,
	type,
	onClose,
	onSelect,
}: FixPosterModalProps) => {
	const [query, setQuery] = useState(item.title)
	const [year, setYear] = useState<string | number>(item.year || "")
	const [results, setResults] = useState<SearchResult[]>([])
	const [searching, setSearching] = useState(false)
	const [source, setSource] = useState<"tmdb" | "omdb">("tmdb")
	const [manualUrl, setManualUrl] = useState("")
	const [showManual, setShowManual] = useState(false)

	const doSearch = useCallback(async () => {
		if (!query) return
		setSearching(true)
		setResults([])

		const OMDB_KEY = import.meta.env.VITE_OMDB_KEY || ""

		if (source === "tmdb") {
			try {
				const searchResults = await searchTMDB(
					query,
					type === "films" ? "movie" : "tv",
					{ year },
				)
				setResults(
					searchResults.slice(0, 12).map((m) => ({
						id: m.id,
						title: m.title || m.name || "",
						year: (m.release_date || m.first_air_date)?.split("-")[0] || "",
						poster: getPosterUrl(m.poster_path),
						source: "TMDB",
					})),
				)
			} catch {
				// Search failed, results stay empty
			}
		} else {
			const omdbType = type === "films" ? "movie" : "series"
			const yearParam = year ? `&y=${year}` : ""
			try {
				const res = await fetch(
					`${OMDB_BASE_URL}/?apikey=${OMDB_KEY}&s=${encodeURIComponent(query)}&type=${omdbType}${yearParam}`,
				)
				const data = await res.json()
				if (data.Search) {
					setResults(
						data.Search.slice(0, 12).map(
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
						),
					)
				}
			} catch {
				// Search failed, results stay empty
			}
		}
		setSearching(false)
	}, [query, year, source, type])

	useEffect(() => {
		doSearch()
	}, [doSearch])

	const applyManualUrl = () => {
		if (manualUrl?.startsWith("http")) {
			onSelect(item.id, { poster: manualUrl })
		}
	}

	const selectResult = (r: SearchResult) => {
		if (!r.poster) return
		onSelect(item.id, {
			poster: r.poster,
			title: r.title,
			year: parseInt(r.year, 10) || item.year,
		})
	}

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop
		// biome-ignore lint/a11y/useKeyWithClickEvents: modal backdrop pattern
		<div className="modal-bg" onClick={onClose}>
			<div
				className="modal fix-modal"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.stopPropagation()}
				role="dialog"
				aria-modal="true"
			>
				<div className="modal-head">
					<div className="modal-title">Corriger le film</div>
					<button type="button" className="modal-close" onClick={onClose}>
						×
					</button>
				</div>
				<div className="modal-body">
					<div className="fix-search">
						<input
							type="text"
							className="search-box"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && doSearch()}
							placeholder="Titre"
							style={{ flex: 1 }}
						/>
						<input
							type="number"
							className="search-box year-input"
							value={year}
							onChange={(e) => setYear(e.target.value)}
							placeholder="Année"
						/>
						<button
							type="button"
							className="btn btn-primary"
							onClick={doSearch}
						>
							🔍
						</button>
					</div>

					<div className="source-toggle">
						<button
							type="button"
							className={`source-btn ${source === "tmdb" ? "active" : ""}`}
							onClick={() => setSource("tmdb")}
						>
							TMDB
						</button>
						<button
							type="button"
							className={`source-btn ${source === "omdb" ? "active" : ""}`}
							onClick={() => setSource("omdb")}
						>
							OMDb/IMDb
						</button>
					</div>

					{searching && <div className="searching">Recherche...</div>}

					<div className="fix-results">
						{results.map((r) => (
							<button
								type="button"
								key={r.id}
								className={`fix-result ${!r.poster ? "no-poster" : ""}`}
								onClick={() => selectResult(r)}
							>
								{r.poster ? (
									<img src={r.poster} alt="" />
								) : (
									<div className="fix-no-poster">Pas d'affiche</div>
								)}
								<div className="fix-result-info">
									<div className="fix-result-title">{r.title}</div>
									<div className="fix-result-year">
										{r.year} · {r.source}
									</div>
								</div>
							</button>
						))}
					</div>

					{results.length === 0 && !searching && (
						<div className="empty-small">
							Aucun résultat. Essayez le titre original.
						</div>
					)}

					<div className="manual-section">
						<button
							type="button"
							className="link-btn"
							onClick={() => setShowManual(!showManual)}
						>
							{showManual ? "▼ Masquer" : "▶ Coller une URL"}
						</button>
						{showManual && (
							<div className="manual-url">
								<input
									type="text"
									className="search-box"
									value={manualUrl}
									onChange={(e) => setManualUrl(e.target.value)}
									placeholder="https://..."
									style={{ flex: 1 }}
								/>
								<button
									type="button"
									className="btn btn-primary"
									onClick={applyManualUrl}
								>
									OK
								</button>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}

export default FixPosterModal
