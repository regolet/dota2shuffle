const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'dota2shuffle.db');
const db = new Database(dbPath);

console.log('Disabling foreign key constraints temporarily and recreating tables...\n');

// Disable foreign keys
db.pragma('foreign_keys = OFF');

// Drop and recreate registration_links table without strict foreign key
db.exec(`
  -- Drop old table
  DROP TABLE IF EXISTS registration_links;

  -- Recreate without foreign key constraint
  CREATE TABLE registration_links (
    id TEXT PRIMARY KEY,
    link_code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    max_players INTEGER NOT NULL DEFAULT 100,
    created_by TEXT NOT NULL,
    created_at INTEGER,
    expires_at INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1
  );
`);

console.log('✓ Registration links table recreated without foreign key constraint');

db.close();
