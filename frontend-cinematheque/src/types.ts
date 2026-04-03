// Tab identifiers (used in UI)
export type TabType = "films" | "series" | "books" | "comics"

// Item type identifiers (used in storage/API)
export type ItemType = "film" | "series" | "book" | "comic"

// Book subtype (book or comic)
export type BookType = "book" | "comic"

// Base item - common fields for all collection items
export interface BaseItem {
	id: number // Unique identifier (timestamp-based)
	title: string
	year: number
	recommendation_source?: string
	/** When the item was watched/read; null = not consumed yet. */
	consumed_at: string | null
	poster?: string // Poster image URL
	rating?: number // Rating 1-5 (only if consumed)
}

/** Derived: item is consumed (watched or read) when consumed_at is set. */
export function isConsumed(item: BaseItem): boolean {
	return item.consumed_at != null && item.consumed_at !== ""
}

// Movie item
export interface Movie extends BaseItem {
	director?: string
	country?: string
}

// Series item
export interface Series extends BaseItem {
	creator?: string
	country?: string
	seasons?: number
}

// Book item (book or comic), distinguished by type field
export interface Book extends BaseItem {
	type: BookType
	author?: string
	country?: string
}

// Any collection item
export type Item = Movie | Series | Book

// Item with type field (used for storage/API)
export type StoredItem = Item & { type: ItemType }

// Sort options
export type SortType =
	| "year-desc"
	| "year-asc"
	| "alpha-asc"
	| "alpha-desc"
	| "director"
	| "added"
	| "unwatched"

// Filter options
export type FilterType = "all" | "watched" | "unwatched"

// View options
export type ViewType = "grid" | "list"
