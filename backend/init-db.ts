#!/usr/bin/env bun
// Initialize database - creates the data directory and database file with schema

import { Database } from "bun:sqlite"
import { dirname } from "path"
import { mkdir } from "fs/promises"

const dbPath = process.env.DB_PATH || "./data/cinematheque.db"

console.log(`Initializing database at: ${dbPath}`)

// Ensure data directory exists
try {
	const dbDir = dirname(dbPath)
	await mkdir(dbDir, { recursive: true })
	console.log(`Created directory: ${dbDir}`)
} catch (error) {
	console.log(`Directory already exists or created`)
}

// Create database and schema
const db = new Database(dbPath)

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

console.log("Database initialized successfully!")
console.log("Schema: items table created with indexes")

db.close()