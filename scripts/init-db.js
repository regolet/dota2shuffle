const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'dota2shuffle.db');
const db = new Database(dbPath);

console.log('Creating database tables...');

// Enable WAL mode
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  -- Admins table
  CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    must_change_password INTEGER NOT NULL DEFAULT 0,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until INTEGER,
    created_at INTEGER
  );

  -- Registration Links table
  CREATE TABLE IF NOT EXISTS registration_links (
    id TEXT PRIMARY KEY,
    link_code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    max_players INTEGER NOT NULL DEFAULT 100,
    created_by TEXT NOT NULL,
    created_at INTEGER,
    updated_at INTEGER,
    expires_at INTEGER,
    scheduled_time INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (created_by) REFERENCES admins(id)
  );

  -- Players table
  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    player_name TEXT NOT NULL,
    mmr INTEGER NOT NULL,
    preferred_roles TEXT NOT NULL,
    registration_link_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Present',
    registered_at INTEGER,
    FOREIGN KEY (registration_link_id) REFERENCES registration_links(id)
  );

  -- Player Masterlist table
  CREATE TABLE IF NOT EXISTS player_masterlist (
    id TEXT PRIMARY KEY,
    player_name TEXT NOT NULL UNIQUE,
    steam_id TEXT,
    discord_id TEXT,
    default_mmr INTEGER,
    is_banned INTEGER NOT NULL DEFAULT 0,
    ban_reason TEXT,
    notes TEXT,
    created_at INTEGER,
    updated_at INTEGER
  );

  -- Brackets table
  CREATE TABLE IF NOT EXISTS brackets (
    id TEXT PRIMARY KEY,
    registration_link_id TEXT NOT NULL,
    name TEXT NOT NULL,
    bracket_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    rounds TEXT,
    created_at INTEGER,
    FOREIGN KEY (registration_link_id) REFERENCES registration_links(id)
  );

  -- Teams table
  CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    registration_link_id TEXT NOT NULL,
    team_number INTEGER NOT NULL,
    team_name TEXT,
    average_mmr INTEGER NOT NULL,
    player_ids TEXT NOT NULL,
    shuffle_timestamp INTEGER,
    FOREIGN KEY (registration_link_id) REFERENCES registration_links(id)
  );

  -- Matches table
  CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    bracket_id TEXT NOT NULL,
    round_number INTEGER NOT NULL,
    match_number INTEGER NOT NULL,
    team1_id TEXT,
    team2_id TEXT,
    winner_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    scheduled_time INTEGER,
    completed_at INTEGER,
    FOREIGN KEY (bracket_id) REFERENCES brackets(id),
    FOREIGN KEY (team1_id) REFERENCES teams(id),
    FOREIGN KEY (team2_id) REFERENCES teams(id),
    FOREIGN KEY (winner_id) REFERENCES teams(id)
  );

  -- Lobbies table
  CREATE TABLE IF NOT EXISTS lobbies (
    id TEXT PRIMARY KEY,
    registration_link_id TEXT NOT NULL,
    lobby_name TEXT NOT NULL,
    lobby_password TEXT,
    team1_id TEXT,
    team2_id TEXT,
    match_id TEXT,
    status TEXT NOT NULL DEFAULT 'waiting',
    created_at INTEGER,
    FOREIGN KEY (registration_link_id) REFERENCES registration_links(id),
    FOREIGN KEY (team1_id) REFERENCES teams(id),
    FOREIGN KEY (team2_id) REFERENCES teams(id),
    FOREIGN KEY (match_id) REFERENCES matches(id)
  );

  -- Shuffle History table
  CREATE TABLE IF NOT EXISTS shuffle_history (
    id TEXT PRIMARY KEY,
    registration_link_id TEXT NOT NULL,
    player_count INTEGER NOT NULL,
    team_count INTEGER NOT NULL,
    balance_score INTEGER NOT NULL,
    shuffled_at INTEGER,
    shuffled_by TEXT,
    FOREIGN KEY (registration_link_id) REFERENCES registration_links(id),
    FOREIGN KEY (shuffled_by) REFERENCES admins(id)
  );

  -- Bracket History table
  CREATE TABLE IF NOT EXISTS bracket_history (
    id TEXT PRIMARY KEY,
    bracket_id TEXT NOT NULL,
    registration_link_id TEXT NOT NULL,
    name TEXT NOT NULL,
    bracket_type TEXT NOT NULL,
    status TEXT NOT NULL,
    rounds TEXT,
    snapshot TEXT,
    saved_at INTEGER,
    saved_by TEXT,
    description TEXT,
    FOREIGN KEY (bracket_id) REFERENCES brackets(id),
    FOREIGN KEY (registration_link_id) REFERENCES registration_links(id),
    FOREIGN KEY (saved_by) REFERENCES admins(id)
  );

  -- Audit Logs table for security event tracking
  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    admin_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    details TEXT,
    created_at INTEGER,
    FOREIGN KEY (admin_id) REFERENCES admins(id)
  );
`);

// Add shuffle_history_id column to teams table if it doesn't exist
db.exec(`
  -- Check if column exists and add it if not
  PRAGMA foreign_keys=off;

  CREATE TABLE IF NOT EXISTS teams_new (
    id TEXT PRIMARY KEY,
    registration_link_id TEXT NOT NULL,
    shuffle_history_id TEXT,
    team_number INTEGER NOT NULL,
    team_name TEXT,
    average_mmr INTEGER NOT NULL,
    player_ids TEXT NOT NULL,
    shuffle_timestamp INTEGER,
    FOREIGN KEY (registration_link_id) REFERENCES registration_links(id),
    FOREIGN KEY (shuffle_history_id) REFERENCES shuffle_history(id)
  );

  INSERT OR IGNORE INTO teams_new
  SELECT id, registration_link_id, NULL as shuffle_history_id, team_number, team_name, average_mmr, player_ids, shuffle_timestamp
  FROM teams;

  DROP TABLE IF EXISTS teams;
  ALTER TABLE teams_new RENAME TO teams;

  PRAGMA foreign_keys=on;
`);

// Add reserve_player_ids column to shuffle_history table if it doesn't exist
db.exec(`
  -- Check if column exists and add it if not
  PRAGMA foreign_keys=off;

  CREATE TABLE IF NOT EXISTS shuffle_history_new (
    id TEXT PRIMARY KEY,
    registration_link_id TEXT NOT NULL,
    player_count INTEGER NOT NULL,
    team_count INTEGER NOT NULL,
    balance_score INTEGER NOT NULL,
    reserve_player_ids TEXT,
    shuffled_at INTEGER,
    shuffled_by TEXT,
    FOREIGN KEY (registration_link_id) REFERENCES registration_links(id),
    FOREIGN KEY (shuffled_by) REFERENCES admins(id)
  );

  INSERT OR IGNORE INTO shuffle_history_new
  SELECT id, registration_link_id, player_count, team_count, balance_score, NULL as reserve_player_ids, shuffled_at, shuffled_by
  FROM shuffle_history;

  DROP TABLE IF EXISTS shuffle_history;
  ALTER TABLE shuffle_history_new RENAME TO shuffle_history;

  PRAGMA foreign_keys=on;
`);

console.log('✓ Database tables created successfully!');
console.log('Database file:', dbPath);

db.close();
