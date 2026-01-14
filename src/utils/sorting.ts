import type { Item, SortType, TabType } from "@/types"

export const sortItems = (list: Item[], sort: SortType): Item[] => {
	const sorted = [...list]
	switch (sort) {
		case "alpha-asc":
			return sorted.sort((a, b) =>
				(a.title || "").localeCompare(b.title || "", "fr"),
			)
		case "alpha-desc":
			return sorted.sort((a, b) =>
				(b.title || "").localeCompare(a.title || "", "fr"),
			)
		case "year-desc":
			return sorted.sort((a, b) => (b.year || 0) - (a.year || 0))
		case "year-asc":
			return sorted.sort((a, b) => (a.year || 0) - (b.year || 0))
		case "director":
			return sorted.sort((a, b) => {
				const aVal =
					("director" in a ? a.director : undefined) ||
					("creator" in a ? a.creator : undefined) ||
					("author" in a ? a.author : undefined) ||
					""
				const bVal =
					("director" in b ? b.director : undefined) ||
					("creator" in b ? b.creator : undefined) ||
					("author" in b ? b.author : undefined) ||
					""
				return aVal.localeCompare(bVal, "fr")
			})
		case "added":
			return sorted.sort((a, b) => (b.id || 0) - (a.id || 0))
		case "unwatched":
			return sorted.sort((a, b) => {
				if (a.watched === b.watched) return (b.year || 0) - (a.year || 0)
				return a.watched ? 1 : -1
			})
		default:
			return sorted
	}
}

// Group items by separator
export const getGroupKey = (
	item: Item,
	sort: SortType,
	tab: TabType,
): string | null => {
	switch (sort) {
		case "alpha-asc":
		case "alpha-desc":
			return (item.title || "")[0]?.toUpperCase() || "#"
		case "year-desc":
		case "year-asc": {
			const decade = Math.floor((item.year || 0) / 10) * 10
			return decade > 0 ? `${decade}s` : "Inconnu"
		}
		case "director": {
			const val =
				("director" in item ? item.director : undefined) ||
				("creator" in item ? item.creator : undefined) ||
				("author" in item ? item.author : undefined) ||
				"Inconnu"
			return val[0]?.toUpperCase() || "#"
		}
		case "unwatched":
			return item.watched
				? tab === "books" || tab === "comics"
					? "Lus"
					: "Vus"
				: tab === "books" || tab === "comics"
					? "À lire"
					: "À voir"
		default:
			return null
	}
}
