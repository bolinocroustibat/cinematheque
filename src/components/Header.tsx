import type { FilterType, SortType, TabType, ViewType } from "@/types"

interface HeaderProps {
	// Stats
	stats: { total: number; watched: number }
	syncing: boolean
	posterProgress: string
	onAddClick: () => void

	// Tabs
	tab: TabType
	onTabChange: (tab: TabType) => void
	counts: { films: number; series: number; books: number; comics: number }

	// Search & Filters
	search: string
	onSearchChange: (value: string) => void
	filter: FilterType
	onFilterChange: (filter: FilterType) => void
	genre: string
	onGenreChange: (genre: string) => void
	genres: string[]

	// Sort & View
	sort: SortType
	onSortChange: (sort: SortType) => void
	view: ViewType
	onViewChange: (view: ViewType) => void
	showSeparators: boolean
	onShowSeparatorsChange: (show: boolean) => void
	cardSize: number
	onCardSizeChange: (size: number) => void
}

const Header = ({
	stats,
	syncing,
	posterProgress,
	onAddClick,
	tab,
	onTabChange,
	counts,
	search,
	onSearchChange,
	filter,
	onFilterChange,
	genre,
	onGenreChange,
	genres,
	sort,
	onSortChange,
	view,
	onViewChange,
	showSeparators,
	onShowSeparatorsChange,
	cardSize,
	onCardSizeChange,
}: HeaderProps) => {
	const isReadType = tab === "books" || tab === "comics"

	const handleTabChange = (newTab: TabType) => {
		onTabChange(newTab)
		onGenreChange("")
	}

	return (
		<header className="header">
			<div className="header-top">
				<div className="logo">
					ma <span>collection</span>
				</div>
				<div className="header-right">
					<div className="stats">
						<b>{stats.total}</b> {tab} · <b>{stats.watched}</b>{" "}
						{isReadType
							? stats.watched > 1
								? "lus"
								: "lu"
							: stats.watched > 1
								? "vus"
								: "vu"}
						{syncing && <span className="sync-icon"> ⟳</span>}
					</div>
					<button type="button" className="add-btn" onClick={onAddClick}>
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
					onClick={() => handleTabChange("films")}
				>
					Films <span className="tab-count">{counts.films}</span>
				</button>
				<button
					type="button"
					className={`tab ${tab === "series" ? "active" : ""}`}
					onClick={() => handleTabChange("series")}
				>
					Séries <span className="tab-count">{counts.series}</span>
				</button>
				<button
					type="button"
					className={`tab ${tab === "books" ? "active" : ""}`}
					onClick={() => handleTabChange("books")}
				>
					Livres <span className="tab-count">{counts.books}</span>
				</button>
				<button
					type="button"
					className={`tab ${tab === "comics" ? "active" : ""}`}
					onClick={() => handleTabChange("comics")}
				>
					BD <span className="tab-count">{counts.comics}</span>
				</button>
			</div>

			<div className="controls">
				<input
					className="search-box"
					placeholder="Rechercher..."
					value={search}
					onChange={(e) => onSearchChange(e.target.value)}
				/>
				<div className="filter-divider" />
				<button
					type="button"
					className={`filter-btn ${filter === "all" ? "active" : ""}`}
					onClick={() => onFilterChange("all")}
				>
					Tous
				</button>
				<button
					type="button"
					className={`filter-btn ${filter === "unwatched" ? "active" : ""}`}
					onClick={() => onFilterChange("unwatched")}
				>
					{isReadType ? "À lire" : "À voir"}
				</button>
				<button
					type="button"
					className={`filter-btn ${filter === "watched" ? "active" : ""}`}
					onClick={() => onFilterChange("watched")}
				>
					{isReadType ? "Lus" : "Vus"}
				</button>
				<div className="filter-divider" />
				<select value={genre} onChange={(e) => onGenreChange(e.target.value)}>
					<option value="">Genre</option>
					{genres.map((g) => (
						<option key={g} value={g}>
							{g}
						</option>
					))}
				</select>
				<select
					value={sort}
					onChange={(e) => onSortChange(e.target.value as SortType)}
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
					<option value="unwatched">{isReadType ? "Non lus" : "Non vus"}</option>
				</select>
				<div className="view-controls">
					<button
						type="button"
						className={`view-btn ${view === "grid" ? "active" : ""}`}
						onClick={() => onViewChange("grid")}
					>
						▦
					</button>
					<button
						type="button"
						className={`view-btn ${view === "list" ? "active" : ""}`}
						onClick={() => onViewChange("list")}
					>
						☰
					</button>
					<button
						type="button"
						className={`view-btn ${showSeparators ? "active" : ""}`}
						onClick={() => onShowSeparatorsChange(!showSeparators)}
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
							onChange={(e) => onCardSizeChange(Number(e.target.value))}
						/>
					)}
				</div>
			</div>
		</header>
	)
}

export default Header
