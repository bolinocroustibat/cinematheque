<script lang="ts">
import {
	type FilterType,
	type SortType,
	type TabType,
	tabLabelEn,
	type ViewType,
} from "$lib/types"

let {
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
}: {
	stats: { total: number; watched: number }
	syncing: boolean
	posterProgress: string
	onAddClick: () => void
	tab: TabType
	onTabChange: (t: TabType) => void
	counts: {
		movies: number
		documentaries: number
		series: number
		books: number
		comics: number
	}
	search: string
	onSearchChange: (v: string) => void
	filter: FilterType
	onFilterChange: (f: FilterType) => void
	sort: SortType
	onSortChange: (s: SortType) => void
	view: ViewType
	onViewChange: (v: ViewType) => void
	showSeparators: boolean
	onShowSeparatorsChange: (v: boolean) => void
	cardSize: number
	onCardSizeChange: (n: number) => void
} = $props()

const isReadType = $derived(tab === "books" || tab === "comics")
</script>

<header class="header">
	<div class="header-top">
		<div class="logo">
			my <span>collection</span>
		</div>
		<div class="header-right">
			<div class="stats">
				<b>{stats.total}</b>
				{tabLabelEn(tab)} · <b>{stats.watched}</b>
				{isReadType ? "read" : "watched"}
				{#if syncing}<span class="sync-icon"> ⟳</span>{/if}
			</div>
			<button type="button" class="add-btn" onclick={onAddClick}>+ Add</button>
		</div>
	</div>

	{#if posterProgress}
		<div class="poster-progress">
			Downloading posters... {posterProgress}
		</div>
	{/if}

	<div class="tabs">
		<button
			type="button"
			class="tab"
			class:active={tab === "films"}
			onclick={() => onTabChange("films")}
		>
			Movies <span class="tab-count">{counts.movies}</span>
		</button>
		<button
			type="button"
			class="tab"
			class:active={tab === "documentaries"}
			onclick={() => onTabChange("documentaries")}
		>
			Documentaries <span class="tab-count">{counts.documentaries}</span>
		</button>
		<button
			type="button"
			class="tab"
			class:active={tab === "series"}
			onclick={() => onTabChange("series")}
		>
			Series <span class="tab-count">{counts.series}</span>
		</button>
		<button
			type="button"
			class="tab"
			class:active={tab === "books"}
			onclick={() => onTabChange("books")}
		>
			Books <span class="tab-count">{counts.books}</span>
		</button>
		<button
			type="button"
			class="tab"
			class:active={tab === "comics"}
			onclick={() => onTabChange("comics")}
		>
			Comics <span class="tab-count">{counts.comics}</span>
		</button>
	</div>

	<div class="controls">
		<input
			class="search-box"
			placeholder="Search..."
			value={search}
			oninput={(e) => onSearchChange(e.currentTarget.value)}
		/>
		<div class="filter-divider"></div>
		<button
			type="button"
			class="filter-btn"
			class:active={filter === "all"}
			onclick={() => onFilterChange("all")}
		>
			All
		</button>
		<button
			type="button"
			class="filter-btn"
			class:active={filter === "unwatched"}
			onclick={() => onFilterChange("unwatched")}
		>
			{isReadType ? "To read" : "To watch"}
		</button>
		<button
			type="button"
			class="filter-btn"
			class:active={filter === "watched"}
			onclick={() => onFilterChange("watched")}
		>
			{isReadType ? "Read" : "Watched"}
		</button>
		<div class="filter-divider"></div>
		<select
			value={sort}
			onchange={(e) => onSortChange(e.currentTarget.value as SortType)}
			class="sort-select"
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
			<option value="unwatched">{isReadType ? "Unread" : "Unwatched"}</option>
		</select>
		<div class="view-controls">
			<button
				type="button"
				class="view-btn"
				class:active={view === "grid"}
				onclick={() => onViewChange("grid")}
			>
				▦
			</button>
			<button
				type="button"
				class="view-btn"
				class:active={view === "list"}
				onclick={() => onViewChange("list")}
			>
				☰
			</button>
			<button
				type="button"
				class="view-btn"
				class:active={showSeparators}
				onclick={() => onShowSeparatorsChange(!showSeparators)}
				title="Separators"
			>
				―
			</button>
			{#if view === "grid"}
				<input
					type="range"
					class="size-slider"
					min="80"
					max="160"
					value={cardSize}
					oninput={(e) => onCardSizeChange(Number(e.currentTarget.value))}
				/>
			{/if}
		</div>
	</div>
</header>
