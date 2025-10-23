import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './schema'
import path from 'path'

// Use local SQLite database for offline functionality
const dbPath = path.join(process.cwd(), 'dota2shuffle.db')
const sqlite = new Database(dbPath)

// Enable WAL mode for better performance
sqlite.pragma('journal_mode = WAL')

export const db = drizzle(sqlite, { schema })
export * from './schema'
