// Shared TypeScript interfaces for Dota 2 Shuffle

// Registration Link
export interface RegistrationLink {
  id: string
  linkCode: string
  title: string
  description: string | null
  maxPlayers: number
  createdAt: Date
  updatedAt: Date | null
  expiresAt: Date | null
  scheduledTime: Date | null
  isActive: boolean
  currentPlayers?: number
}

// Player (from registration)
export interface Player {
  id: string
  playerName: string
  mmr: number
  preferredRoles: string[]
  status: 'Present' | 'Absent' | 'Reserve'
  registeredAt: Date
  registrationLinkId: string
}

// Team (from shuffle)
export interface Team {
  id?: string
  teamNumber: number
  teamName?: string
  players: TeamPlayer[]
  averageMmr: number
  totalMmr: number
}

export interface TeamPlayer {
  id: string
  playerName: string
  mmr: number
  preferredRoles: string[]
}

// Shuffle Balance metrics
export interface ShuffleBalance {
  averageMmr: number
  variance: number
  minTeamMmr: number
  maxTeamMmr: number
  mmrDifference: number
}

// Shuffle History
export interface ShuffleHistory {
  id: string
  registrationLinkId: string
  playerCount: number
  teamCount: number
  balanceScore: number
  shuffledAt: Date
  shuffledBy?: string
}

// Player Masterlist
export interface MasterlistPlayer {
  id: string
  playerName: string
  steamId: string | null
  discordId: string | null
  defaultMmr: number | null
  isBanned: boolean
  banReason: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

// Bracket
export interface Bracket {
  id: string
  registrationLinkId: string
  name: string
  bracketType: 'single_elimination' | 'double_elimination' | 'round_robin'
  status: 'draft' | 'active' | 'completed'
  rounds?: any
  createdAt: Date
}

// Match
export interface Match {
  id: string
  bracketId: string
  roundNumber: number
  matchNumber: number
  team1Id: string | null
  team2Id: string | null
  winnerId: string | null
  status: 'pending' | 'in_progress' | 'completed'
  scheduledTime?: Date
  completedAt?: Date
}

// API Response types
export interface ApiSuccessResponse<T = unknown> {
  success: true
  data?: T
}

export interface ApiErrorResponse {
  success?: false
  error: string
  details?: unknown
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

// Admin session
export interface AdminSession {
  adminId: string
  username: string
}
