// @ts-expect-error - bun:sqlite is a Bun runtime feature
import { Database } from "bun:sqlite"
import { dirname } from "path"
import { mkdir } from "fs/promises"

export type ItemType = "film" | "series" | "book" | "comic"

export interface StoredItem {
	id: number
	type: ItemType
	title: string
	year: number
	genre?: string
	source?: string
	watched: boolean
	poster?: string
	rating?: number
	director?: string
	actors?: string
	country?: string
	creator?: string
	seasons?: number
	author?: string
}

// @ts-ignore - Bun global is available at runtime
const dbPath = (typeof Bun !== "undefined" ? Bun.env.DB_PATH : undefined) || "./data/cinematheque.db"

// Ensure data directory exists
try {
	const dbDir = dirname(dbPath)
	await mkdir(dbDir, { recursive: true })
} catch (error) {
	// Directory might already exist, ignore error
}

const db = new Database(dbPath)

// Initialize database schema
db.exec(`
	CREATE TABLE IF NOT EXISTS items (
		id INTEGER PRIMARY KEY,
		type TEXT NOT NULL,
		title TEXT NOT NULL,
		year INTEGER NOT NULL,
		genre TEXT,
		source TEXT,
		watched INTEGER NOT NULL DEFAULT 0,
		poster TEXT,
		rating INTEGER,
		director TEXT,
		actors TEXT,
		country TEXT,
		creator TEXT,
		seasons INTEGER,
		author TEXT
	);

	CREATE INDEX IF NOT EXISTS idx_type ON items(type);
	CREATE INDEX IF NOT EXISTS idx_watched ON items(watched);
`)

export const getAllItems = (): StoredItem[] => {
	const stmt = db.query("SELECT * FROM items ORDER BY id")
	const rows = stmt.all() as StoredItem[]
	return rows.map((row) => ({
		...row,
		watched: Boolean(row.watched),
	}))
}

export const saveAllItems = (items: StoredItem[]): void => {
	const insertStmt = db.prepare(`
		INSERT OR REPLACE INTO items (
			id, type, title, year, genre, source, watched, poster, rating,
			director, actors, country, creator, seasons, author
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`)

	const insertMany = db.transaction((items: StoredItem[]) => {
		// Clear existing data
		db.exec("DELETE FROM items")

		// Insert all items
		for (const item of items) {
			insertStmt.run(
				item.id,
				item.type,
				item.title,
				item.year,
				item.genre || null,
				item.source || null,
				item.watched ? 1 : 0,
				item.poster || null,
				item.rating || null,
				item.director || null,
				item.actors || null,
				item.country || null,
				item.creator || null,
				item.seasons || null,
				item.author || null,
			)
		}
	})

	insertMany(items)
}

export default db