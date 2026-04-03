import {
	type FilterType,
	type SortType,
	type TabType,
	tabLabelEn,
	type ViewType,
} from "@/types"

interface HeaderProps {
	// Stats
	stats: { total: number; watched: number }
	syncing: boolean
	posterProgress: string
	onAddClick: () => void

	// Tabs
	tab: TabType
	onTabChange: (tab: TabType) => void
	counts: {
		movies: number
		documentaries: number
		series: number
		books: number
		comics: number
	}

	// Search & Filters
	search: string
	onSearchChange: (value: string) => void
	filter: FilterType
	onFilterChange: (filter: FilterType) => void

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

	return (
		<header className="header">
			<div className="header-top">
				<div className="logo">
					my <span>collection</span>
				</div>
				<div className="header-right">
					<div className="stats">
						<b>{stats.total}</b> {tabLabelEn(tab)} · <b>{stats.watched}</b>{" "}
						{isReadType ? "read" : "watched"}
						{syncing && <span className="sync-icon"> ⟳</span>}
					</div>
					<button type="button" className="add-btn" onClick={onAddClick}>
						+ Add
					</button>
				</div>
			</div>

			{posterProgress && (
				<div className="poster-progress">
					Downloading posters... {posterProgress}
				</div>
			)}

			<div className="tabs">
				<button
					type="button"
					className={`tab ${tab === "films" ? "active" : ""}`}
					onClick={() => onTabChange("films")}
				>
					Movies <span className="tab-count">{counts.movies}</span>
				</button>
				<button
					type="button"
					className={`tab ${tab === "documentaries" ? "active" : ""}`}
					onClick={() => onTabChange("documentaries")}
				>
					Documentaries{" "}
					<span className="tab-count">{counts.documentaries}</span>
				</button>
				<button
					type="button"
					className={`tab ${tab === "series" ? "active" : ""}`}
					onClick={() => onTabChange("series")}
				>
					Series <span className="tab-count">{counts.series}</span>
				</button>
				<button
					type="button"
					className={`tab ${tab === "books" ? "active" : ""}`}
					onClick={() => onTabChange("books")}
				>
					Books <span className="tab-count">{counts.books}</span>
				</button>
				<button
					type="button"
					className={`tab ${tab === "comics" ? "active" : ""}`}
					onClick={() => onTabChange("comics")}
				>
					Comics <span className="tab-count">{counts.comics}</span>
				</button>
			</div>

			<div className="controls">
				<input
					className="search-box"
					placeholder="Search..."
					value={search}
					onChange={(e) => onSearchChange(e.target.value)}
				/>
				<div className="filter-divider" />
				<button
					type="button"
					className={`filter-btn ${filter === "all" ? "active" : ""}`}
					onClick={() => onFilterChange("all")}
				>
					All
				</button>
				<button
					type="button"
					className={`filter-btn ${filter === "unwatched" ? "active" : ""}`}
					onClick={() => onFilterChange("unwatched")}
				>
					{isReadType ? "To read" : "To watch"}
				</button>
				<button
					type="button"
					className={`filter-btn ${filter === "watched" ? "active" : ""}`}
					onClick={() => onFilterChange("watched")}
				>
					{isReadType ? "Read" : "Watched"}
				</button>
				<div className="filter-divider" />
				<select
					value={sort}
					onChange={(e) => onSortChange(e.target.value as SortType)}
					className="sort-select"
				>
					<option value="year-desc">Year ↓</option>
					<option value="year-asc">Year ↑</option>
					<option value="alpha-asc">A → Z</option>
					<option value="alpha-desc">Z → A</option>
					<option value="director">
						{tab === "films" || tab === "documentaries"
							? "Director"
							: tab === "series"
								? "Creator"
								: "Author"}
					</option>
					<option value="added">Recently added</option>
					<option value="unwatched">
						{isReadType ? "Unread" : "Unwatched"}
					</option>
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
						title="Separators"
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
