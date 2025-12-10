import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { createId } from '@paralleldrive/cuid2'

// Admins table
export const admins = sqliteTable('admins', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Registration Links table
export const registrationLinks = sqliteTable('registration_links', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  linkCode: text('link_code').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  maxPlayers: integer('max_players').notNull().default(100),
  createdBy: text('created_by').notNull().references(() => admins.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  scheduledTime: integer('scheduled_time', { mode: 'timestamp' }),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
})

// Players table
export const players = sqliteTable('players', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  playerName: text('player_name').notNull(),
  mmr: integer('mmr').notNull(),
  preferredRoles: text('preferred_roles', { mode: 'json' }).$type<string[]>().notNull(),
  registrationLinkId: text('registration_link_id').notNull().references(() => registrationLinks.id),
  status: text('status').notNull().default('Present'), // Present, Absent, Reserve
  registeredAt: integer('registered_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Player Masterlist table - for tracking players across events
export const playerMasterlist = sqliteTable('player_masterlist', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  playerName: text('player_name').notNull().unique(),
  steamId: text('steam_id'),
  discordId: text('discord_id'),
  defaultMmr: integer('default_mmr'),
  isBanned: integer('is_banned', { mode: 'boolean' }).notNull().default(false),
  banReason: text('ban_reason'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Brackets table - for tournament brackets
export const brackets = sqliteTable('brackets', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  registrationLinkId: text('registration_link_id').notNull().references(() => registrationLinks.id),
  name: text('name').notNull(),
  bracketType: text('bracket_type').notNull(), // single_elimination, double_elimination, round_robin
  status: text('status').notNull().default('draft'), // draft, active, completed
  rounds: text('rounds', { mode: 'json' }).$type<any>(), // JSON-encoded rounds data
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Teams table - for shuffled/created teams
export const teams = sqliteTable('teams', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  registrationLinkId: text('registration_link_id').notNull().references(() => registrationLinks.id),
  shuffleHistoryId: text('shuffle_history_id').references(() => shuffleHistory.id),
  teamNumber: integer('team_number').notNull(),
  teamName: text('team_name'),
  averageMmr: integer('average_mmr').notNull(),
  playerIds: text('player_ids', { mode: 'json' }).$type<string[]>().notNull(),
  shuffleTimestamp: integer('shuffle_timestamp', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Matches table - for bracket matches
export const matches = sqliteTable('matches', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  bracketId: text('bracket_id').notNull().references(() => brackets.id),
  roundNumber: integer('round_number').notNull(),
  matchNumber: integer('match_number').notNull(),
  team1Id: text('team1_id').references(() => teams.id),
  team2Id: text('team2_id').references(() => teams.id),
  winnerId: text('winner_id').references(() => teams.id),
  status: text('status').notNull().default('pending'), // pending, in_progress, completed
  scheduledTime: integer('scheduled_time', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
})

// Lobbies table - for game lobbies
export const lobbies = sqliteTable('lobbies', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  registrationLinkId: text('registration_link_id').notNull().references(() => registrationLinks.id),
  lobbyName: text('lobby_name').notNull(),
  lobbyPassword: text('lobby_password'),
  team1Id: text('team1_id').references(() => teams.id),
  team2Id: text('team2_id').references(() => teams.id),
  matchId: text('match_id').references(() => matches.id),
  status: text('status').notNull().default('waiting'), // waiting, in_progress, completed
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Shuffle History table - to track all shuffles
export const shuffleHistory = sqliteTable('shuffle_history', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  registrationLinkId: text('registration_link_id').notNull().references(() => registrationLinks.id),
  playerCount: integer('player_count').notNull(),
  teamCount: integer('team_count').notNull(),
  balanceScore: integer('balance_score').notNull(), // variance * 1000 for storage
  reservePlayerIds: text('reserve_player_ids', { mode: 'json' }).$type<string[]>(), // IDs of reserve players
  shuffledAt: integer('shuffled_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  shuffledBy: text('shuffled_by').references(() => admins.id),
})

// Bracket History table - to track bracket versions/snapshots
export const bracketHistory = sqliteTable('bracket_history', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  bracketId: text('bracket_id').notNull().references(() => brackets.id),
  registrationLinkId: text('registration_link_id').notNull().references(() => registrationLinks.id),
  name: text('name').notNull(),
  bracketType: text('bracket_type').notNull(),
  status: text('status').notNull(),
  rounds: text('rounds', { mode: 'json' }).$type<any>(),
  snapshot: text('snapshot', { mode: 'json' }).$type<any>(), // Complete bracket state
  savedAt: integer('saved_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  savedBy: text('saved_by').references(() => admins.id),
  description: text('description'), // Optional description of this save
})
