import { useCallback, useEffect, useState } from "react"
import { TMDB_BASE_URL } from "@/api/tmdb.js"

const FixPosterModal = ({ item, type, onClose, onSelect }) => {
	const [query, setQuery] = useState(item.title)
	const [year, setYear] = useState(item.year || "")
	const [results, setResults] = useState([])
	const [searching, setSearching] = useState(false)
	const [source, setSource] = useState("tmdb")
	const [manualUrl, setManualUrl] = useState("")
	const [showManual, setShowManual] = useState(false)

	const doSearch = useCallback(async () => {
		if (!query) return
		setSearching(true)
		setResults([])

		const TMDB_KEY = import.meta.env.VITE_TMDB_KEY || ""
		const TMDB_IMG_SM = "https://image.tmdb.org/t/p/w154"
		const OMDB_KEY = import.meta.env.VITE_OMDB_KEY || ""

		if (source === "tmdb") {
			const endpoint = type === "films" ? "search/movie" : "search/tv"
			const yearParam = year ? `&year=${year}` : ""
			try {
				const res = await fetch(
					`${TMDB_BASE_URL}/${endpoint}?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}${yearParam}`,
				)
				const data = await res.json()
				setResults(
					data.results?.slice(0, 12).map((m) => ({
						id: m.id,
						title: m.title || m.name,
						year: (m.release_date || m.first_air_date)?.split("-")[0],
						poster: m.poster_path ? TMDB_IMG_SM + m.poster_path : null,
						source: "TMDB",
					})) || [],
				)
			} catch (_e) {}
		} else {
			const omdbType = type === "films" ? "movie" : "series"
			const yearParam = year ? `&y=${year}` : ""
			try {
				const res = await fetch(
					`https://www.omdbapi.com/?apikey=${OMDB_KEY}&s=${encodeURIComponent(query)}&type=${omdbType}${yearParam}`,
				)
				const data = await res.json()
				if (data.Search) {
					setResults(
						data.Search.slice(0, 12).map((m) => ({
							id: m.imdbID,
							title: m.Title,
							year: m.Year,
							poster: m.Poster !== "N/A" ? m.Poster : null,
							source: "OMDb",
						})),
					)
				}
			} catch (_e) {}
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

	const selectResult = (r) => {
		if (!r.poster) return
		onSelect(item.id, {
			poster: r.poster,
			title: r.title,
			year: parseInt(r.year, 10) || item.year,
		})
	}

	return (
		<div className="modal-bg" onClick={onClose}>
			<div className="modal fix-modal" onClick={(e) => e.stopPropagation()}>
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
							<div
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
							</div>
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
