import type { Item, SortType, TabType } from "@/types"
import { isConsumed } from "@/types"

export const sortItems = (list: Item[], sort: SortType): Item[] => {
	const sorted = [...list]
	switch (sort) {
		case "alpha-asc":
			return sorted.sort((a, b) =>
				(a.title || "").localeCompare(b.title || "", "en"),
			)
		case "alpha-desc":
			return sorted.sort((a, b) =>
				(b.title || "").localeCompare(a.title || "", "en"),
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
				return aVal.localeCompare(bVal, "en")
			})
		case "added":
			return sorted.sort((a, b) => (b.id || 0) - (a.id || 0))
		case "unwatched":
			return sorted.sort((a, b) => {
				if (isConsumed(a) === isConsumed(b))
					return (b.year || 0) - (a.year || 0)
				return isConsumed(a) ? 1 : -1
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
			return decade > 0 ? `${decade}s` : "Unknown"
		}
		case "director": {
			const val =
				("director" in item ? item.director : undefined) ||
				("creator" in item ? item.creator : undefined) ||
				("author" in item ? item.author : undefined) ||
				"Unknown"
			return val[0]?.toUpperCase() || "#"
		}
		case "unwatched":
			return isConsumed(item)
				? tab === "books" || tab === "comics"
					? "Read"
					: "Watched"
				: tab === "books" || tab === "comics"
					? "To read"
					: "To watch"
		default:
			return null
	}
}
