// Tab identifiers (used in UI)
export type TabType = "films" | "series" | "books" | "comics"

// Item type identifiers (used in storage/API)
export type ItemType = "film" | "series" | "book" | "comic"

// Base item - common fields for all collection items
export interface BaseItem {
	id: number // Unique identifier (timestamp-based)
	title: string
	year: number
	genre?: string // Comma-separated genres
	source?: string // Recommendation source
	watched: boolean
	poster?: string // Poster image URL
	rating?: number // Rating 1-5 (only if watched)
}

// Film item
export interface Film extends BaseItem {
	director?: string
	actors?: string // Comma-separated
	country?: string
}

// Series item
export interface Series extends BaseItem {
	creator?: string
	actors?: string // Comma-separated
	country?: string
	seasons?: number
}

// Book item
export interface Book extends BaseItem {
	author?: string
}

// Comic item
export interface Comic extends BaseItem {
	author?: string
}

// Any collection item
export type Item = Film | Series | Book | Comic

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
